/**
 * Importa a planilha oficial da TACO 4ª ed. (seção 3 da especificação).
 *
 *   npm run import-taco                 usa o único arquivo em data/raw/ (planilha ou PDF)
 *   npm run import-taco -- caminho.xls  usa o arquivo indicado
 *   npm run import-taco -- --fixture    usa o fixture de teste (NÃO é a TACO)
 *
 * Nunca baixa nada: o arquivo-fonte é colocado à mão em data/raw/.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

export type Fruta = {
  id: number;
  nomeTaco: string;
  nomeExibicao: string;
  busca: string;
  tipo: "in natura" | "derivado";
  kcal: number | null;
  kj: number | null;
  carboidratoG: number | null;
  proteinaG: number | null;
  lipidiosG: number | null;
  fibraG: number | null;
  traco: string[];
};

export type Dataset = {
  meta: {
    edicao: string;
    dataImportacao: string;
    hashFonte: string;
    arquivoFonte: string;
    fixture: boolean;
  };
  frutas: Fruta[];
};

const GRUPO_FRUTAS = "frutas e derivados";
const GRUPOS_TACO = [
  "cereais e derivados",
  "verduras, hortalicas e derivados",
  GRUPO_FRUTAS,
  "gorduras e oleos",
  "pescados e frutos do mar",
  "carnes e derivados",
  "leite e derivados",
  "bebidas (alcoolicas e nao alcoolicas)",
  "ovos e derivados",
  "produtos acucarados",
  "miscelaneas",
  "outros alimentos industrializados",
  "alimentos preparados",
  "leguminosas e derivados",
  "nozes e sementes",
];

/** Colunas numéricas lidas da planilha e o campo correspondente do modelo. */
const CAMPOS = ["kcal", "kj", "carboidratoG", "proteinaG", "lipidiosG", "fibraG"] as const;
type Campo = (typeof CAMPOS)[number];

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Aplica a regra do passo 4: "Tr" → 0 + traço; "NA" e "*" → null. */
export function normalizarValor(valor: unknown): { valor: number | null; traco: boolean } {
  if (typeof valor === "number") return { valor, traco: false };
  const texto = String(valor ?? "").trim();
  if (/^tr\.?$/i.test(texto)) return { valor: 0, traco: true };
  if (texto === "" || /^(na|n\.a\.|\*|-)$/i.test(texto)) return { valor: null, traco: false };
  const numero = Number(texto.replace(",", "."));
  if (Number.isNaN(numero)) throw new Error(`Valor não reconhecido na planilha: "${texto}"`);
  return { valor: numero, traco: false };
}

export function classificarTipo(nomeTaco: string): Fruta["tipo"] {
  return /(^|[\s,])crua?($|[\s,])/.test(normalizarTexto(nomeTaco)) ? "in natura" : "derivado";
}

/** "Maçã, Fuji, com casca, crua" → "Maçã Fuji". */
export function gerarNomeExibicao(nomeTaco: string): string {
  const partes = nomeTaco
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(crua?|com casca)$/i.test(p));
  return partes.join(" ").replace(/\s+/g, " ");
}

export function gerarBusca(nomeTaco: string): string {
  return normalizarTexto(nomeTaco.replace(/[,()]/g, " "));
}

function mapearColunas(linhas: unknown[][], inicio: number): Map<Campo, number> | null {
  const cabecalhos = linhas.slice(inicio, inicio + 4);
  const largura = Math.max(...cabecalhos.map((l) => l.length));
  const colunas = new Map<Campo, number>();
  for (let c = 0; c < largura; c++) {
    const cabecalho = normalizarTexto(
      cabecalhos.map((l) => String(l[c] ?? "")).join(" "),
    );
    if (/\(?kcal\)?/.test(cabecalho)) colunas.set("kcal", c);
    else if (/\(?kj\)?/.test(cabecalho)) colunas.set("kj", c);
    else if (/carboidrato/.test(cabecalho)) colunas.set("carboidratoG", c);
    else if (/proteina/.test(cabecalho)) colunas.set("proteinaG", c);
    else if (/lipideos|lipidios/.test(cabecalho)) colunas.set("lipidiosG", c);
    else if (/fibra/.test(cabecalho)) colunas.set("fibraG", c);
  }
  return CAMPOS.every((campo) => colunas.has(campo)) ? colunas : null;
}

function textoDoGrupo(linha: unknown[]): string | null {
  const texto = normalizarTexto(linha.map((c) => String(c ?? "")).join(" "));
  return GRUPOS_TACO.find((grupo) => texto === grupo) ?? null;
}

/** Extrai as frutas de uma aba, tolerando cabeçalhos repetidos a cada página. */
export function extrairFrutas(linhas: unknown[][]): Fruta[] {
  const frutas: Fruta[] = [];
  let colunas: Map<Campo, number> | null = null;
  let noGrupo = false;

  linhas.forEach((linha, i) => {
    const grupo = textoDoGrupo(linha);
    if (grupo) {
      noGrupo = grupo === GRUPO_FRUTAS;
      return;
    }
    if (linha.some((c) => /descri[cç][aã]o/i.test(String(c ?? "")))) {
      // Cabeçalho de outra tabela (minerais, por exemplo) invalida o mapa: nada é lido dela.
      colunas = mapearColunas(linhas, Math.max(0, i - 1));
      return;
    }
    const id = Number(linha[0]);
    const nomeTaco = String(linha[1] ?? "").trim();
    if (!noGrupo || !colunas || !Number.isInteger(id) || id <= 0 || !nomeTaco) return;

    const traco: string[] = [];
    const valores = {} as Record<Campo, number | null>;
    for (const campo of CAMPOS) {
      const lido = normalizarValor(linha[colunas.get(campo)!]);
      valores[campo] = lido.valor;
      if (lido.traco) traco.push(campo);
    }
    frutas.push({
      id,
      nomeTaco,
      nomeExibicao: gerarNomeExibicao(nomeTaco),
      busca: gerarBusca(nomeTaco),
      tipo: classificarTipo(nomeTaco),
      ...valores,
      traco,
    });
  });
  return frutas;
}

/** Nomes iguais confundiriam a pessoa: nesses casos volta ao nome completo da TACO. */
function desambiguarNomes(frutas: Fruta[]): Fruta[] {
  const contagem = new Map<string, number>();
  for (const f of frutas) contagem.set(f.nomeExibicao, (contagem.get(f.nomeExibicao) ?? 0) + 1);
  return frutas.map((f) =>
    contagem.get(f.nomeExibicao)! > 1 ? { ...f, nomeExibicao: f.nomeTaco.replace(/,/g, "") } : f,
  );
}

export function lerPlanilha(arquivo: Buffer): Fruta[] {
  // CSV é texto UTF-8; .xls e .xlsx têm assinatura binária própria.
  const binario = arquivo[0] === 0xd0 || arquivo[0] === 0x50;
  const livro = binario
    ? XLSX.read(arquivo, { type: "buffer" })
    : XLSX.read(arquivo.toString("utf8"), { type: "string", raw: true });
  const frutas = new Map<number, Fruta>();
  for (const nome of livro.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets[nome], {
      header: 1,
      blankrows: false,
      defval: "",
    });
    for (const fruta of extrairFrutas(linhas)) if (!frutas.has(fruta.id)) frutas.set(fruta.id, fruta);
  }
  return desambiguarNomes([...frutas.values()]);
}

/** Um pedaço de texto do PDF, nas coordenadas da página já girada para leitura. */
export type ItemPdf = { texto: string; linha: number; coluna: number };

/** Ordem das colunas da Tabela 1, conferida no cabeçalho de cada página antes da leitura. */
const COLUNAS_PDF = ["Umidade", "Energia", "Proteína", "Lipídeos", "Colesterol", "Carbo-", "Fibra", "Cinzas"];
const CELULAS_POR_LINHA_PDF = 13;

function conferirCabecalhoPdf(itens: ItemPdf[], pagina: number) {
  const posicoes = COLUNAS_PDF.map((nome) => itens.find((item) => item.texto === nome)?.coluna);
  const emOrdem = posicoes.every((p, i) => p !== undefined && (i === 0 || p > posicoes[i - 1]!));
  if (!emOrdem) throw new Error(`Colunas inesperadas na página ${pagina} do PDF.`);
}

/**
 * Converte páginas da Tabela 1 na mesma grade usada para as planilhas. Agrupa pela coordenada
 * exata de cada linha: a extração de texto comum embaralha colunas em algumas páginas e
 * atribuiria valores à fruta errada. Dentro do grupo de frutas, linha fora do formato é erro.
 */
export function gradeDoPdf(paginas: ItemPdf[][]): unknown[][] {
  const grade: unknown[][] = [
    ["Número", "Descrição", "kcal", "kJ", "Proteína", "Lipídeos", "Carboidrato", "Fibra"],
  ];
  let noGrupo = false;

  paginas.forEach((itens, indice) => {
    const linhas = new Map<number, ItemPdf[]>();
    for (const item of itens) {
      if (!linhas.has(item.linha)) linhas.set(item.linha, []);
      linhas.get(item.linha)!.push(item);
    }
    conferirCabecalhoPdf(itens, indice + 1);

    for (const chave of [...linhas.keys()].sort((a, b) => a - b)) {
      const celulas = linhas
        .get(chave)!
        .sort((a, b) => a.coluna - b.coluna)
        .map((item) => item.texto);
      const grupo = textoDoGrupo(celulas);
      if (grupo) {
        noGrupo = grupo === GRUPO_FRUTAS;
        grade.push(celulas);
      } else if (noGrupo && celulas.length > 1 && /^\d+$/.test(celulas[0])) {
        // Célula numérica sozinha é o número da página.
        if (celulas.length !== CELULAS_POR_LINHA_PDF) {
          throw new Error(`Linha com ${celulas.length} células no PDF: ${celulas.join(" | ")}`);
        }
        const [id, nome, , kcal, kj, proteina, lipidios, , carboidrato, fibra] = celulas;
        grade.push([Number(id), nome, kcal, kj, proteina, lipidios, carboidrato, fibra]);
      }
    }
  });
  return grade;
}

export async function lerPdf(arquivo: Buffer): Promise<Fruta[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const documento = await pdfjs.getDocument({ data: new Uint8Array(arquivo), verbosity: 0 }).promise;
  const paginas: ItemPdf[][] = [];
  for (let numero = 1; numero <= documento.numPages; numero++) {
    const pagina = await documento.getPage(numero);
    const { items } = await pagina.getTextContent();
    const itens = items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return [];
      const [, , , , linha, coluna] = item.transform as number[];
      return [{ texto: item.str.trim(), linha: Math.round(linha), coluna }];
    });
    const ehTabela1 =
      itens.some((item) => item.texto.startsWith("Tabela 1.")) &&
      itens.some((item) => item.texto === "Descrição dos alimentos");
    if (!ehTabela1) continue;
    if (pagina.rotate !== 90) throw new Error(`Página ${numero} do PDF não está girada.`);
    paginas.push(itens);
  }
  return desambiguarNomes(extrairFrutas(gradeDoPdf(paginas)));
}

/** Passo 7: valores de controle da especificação. */
export function testeSanidade(frutas: Fruta[]): string[] {
  const esperados: [string, number][] = [
    ["banana prata crua", 98],
    ["abacaxi cru", 48],
    ["uva italia crua", 53],
  ];
  const erros = esperados.flatMap(([busca, kcal]) => {
    const fruta = frutas.find((f) => f.busca === busca);
    if (!fruta) return [`Fruta de controle ausente: ${busca}`];
    return fruta.kcal === kcal ? [] : [`${busca}: esperado ${kcal} kcal, veio ${fruta.kcal}`];
  });
  const ids = new Set(frutas.map((f) => f.id));
  if (ids.size !== frutas.length) erros.push("Há ids duplicados no dataset");
  // kcal e kJ medem a mesma energia: uma coluna desalinhada quebra essa razão.
  for (const { nomeTaco, kcal, kj } of frutas) {
    if (kcal && kj && (kj / kcal < 4.0 || kj / kcal > 4.4)) {
      erros.push(`${nomeTaco}: ${kcal} kcal e ${kj} kJ não são compatíveis`);
    }
  }
  return erros;
}

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function escolherArquivo(argumentos: string[]): string {
  if (argumentos.includes("--fixture")) return path.join(RAIZ, "scripts/fixtures/taco-exemplo.csv");
  const indicado = argumentos.find((a) => !a.startsWith("--"));
  if (indicado) return path.resolve(indicado);
  const pasta = path.join(RAIZ, "data/raw");
  const candidatos = existsSync(pasta)
    ? readdirSync(pasta).filter((f) => /\.(xlsx?|ods|csv|pdf)$/i.test(f))
    : [];
  if (candidatos.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 arquivo da TACO em data/raw/, encontrei ${candidatos.length}. ` +
        "Baixe a TACO 4ª ed. do site do NEPA/UNICAMP ou indique o caminho do arquivo.",
    );
  }
  return path.join(pasta, candidatos[0]);
}

async function principal() {
  const argumentos = process.argv.slice(2);
  const fixture = argumentos.includes("--fixture");
  const caminho = escolherArquivo(argumentos);
  const conteudo = readFileSync(caminho);
  const lidas = /\.pdf$/i.test(caminho) ? await lerPdf(conteudo) : lerPlanilha(conteudo);
  const frutas = lidas.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao, "pt-BR"));

  const erros = testeSanidade(frutas);
  if (erros.length > 0) throw new Error(`Teste de sanidade falhou:\n- ${erros.join("\n- ")}`);

  const dataset: Dataset = {
    meta: {
      edicao: fixture ? "FIXTURE DE TESTE — não é a TACO" : "TACO 4ª edição (NEPA/UNICAMP, 2011)",
      dataImportacao: new Date().toISOString(),
      hashFonte: `sha256:${createHash("sha256").update(conteudo).digest("hex")}`,
      arquivoFonte: path.basename(caminho),
      fixture,
    },
    frutas,
  };
  writeFileSync(
    path.join(RAIZ, "src/data/frutas-taco.json"),
    `${JSON.stringify(dataset, null, 2)}\n`,
  );
  console.log(
    `${frutas.length} frutas gravadas em src/data/frutas-taco.json` +
      ` (${frutas.filter((f) => f.tipo === "in natura").length} in natura).`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await principal();
  } catch (erro) {
    console.error((erro as Error).message);
    process.exit(1);
  }
}
