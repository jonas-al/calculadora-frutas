import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  classificarTipo,
  extrairFrutas,
  gerarBusca,
  gerarNomeExibicao,
  gradeDoPdf,
  lerPlanilha,
  normalizarValor,
  testeSanidade,
} from "./import-taco";

const frutas = lerPlanilha(readFileSync(path.resolve("scripts/fixtures/taco-exemplo.csv")));
const porBusca = (busca: string) => frutas.find((f) => f.busca === busca)!;

describe("normalização (passo 4)", () => {
  it('converte "Tr" em 0 com marca de traço', () => {
    expect(normalizarValor("Tr")).toEqual({ valor: 0, traco: true });
  });
  it.each(["NA", "*", "", "-"])('converte "%s" em null', (valor) => {
    expect(normalizarValor(valor)).toEqual({ valor: null, traco: false });
  });
  it("aceita número com vírgula", () => {
    expect(normalizarValor("26,0").valor).toBe(26);
  });
  it("falha com valor desconhecido em vez de gravar lixo", () => {
    expect(() => normalizarValor("abc")).toThrow(/não reconhecido/);
  });
});

describe("nomes e tipo (passos 3 e 5)", () => {
  it.each([
    ["Banana, prata, crua", "Banana prata"],
    ["Abacaxi, cru", "Abacaxi"],
    ["Maçã, Fuji, com casca, crua", "Maçã Fuji"],
    ["Uva, Itália, crua", "Uva Itália"],
    ["Abacaxi, polpa, congelada", "Abacaxi polpa congelada"],
  ])("%s → %s", (taco, exibicao) => {
    expect(gerarNomeExibicao(taco)).toBe(exibicao);
  });
  it("gera busca sem acentos e em minúsculas", () => {
    expect(gerarBusca("Maçã, Fuji, com casca, crua")).toBe("maca fuji com casca crua");
  });
  it("classifica cru/crua como in natura e o resto como derivado", () => {
    expect(classificarTipo("Banana, prata, crua")).toBe("in natura");
    expect(classificarTipo("Abacaxi, cru")).toBe("in natura");
    expect(classificarTipo("Uva, suco concentrado, envasado")).toBe("derivado");
    expect(classificarTipo("Banana, doce em barra")).toBe("derivado");
  });
});

describe("leitura da planilha", () => {
  it("lê só o grupo Frutas e derivados", () => {
    expect(frutas.map((f) => f.id).sort()).toEqual([9101, 9102, 9103, 9104, 9105, 9106]);
  });
  it("mapeia as colunas pelo cabeçalho", () => {
    expect(porBusca("banana prata crua")).toMatchObject({
      id: 9102,
      nomeTaco: "Banana, prata, crua",
      tipo: "in natura",
      kcal: 98,
      kj: 410,
      carboidratoG: 26,
      proteinaG: 1.3,
      lipidiosG: 0.1,
      fibraG: 2,
    });
  });
  it("registra os campos que eram traço", () => {
    expect(porBusca("abacaxi cru")).toMatchObject({ lipidiosG: 0, traco: ["lipidiosG"] });
  });
});

describe("planilha binária, como a oficial", () => {
  const cabecalho = [
    ["Número do Alimento", "Descrição dos alimentos", "Energia", "", "Proteína (g)", "Lipídeos (g)", "Carboidrato (g)", "Fibra Alimentar (g)"],
    ["", "", "(kcal)", "(kJ)", "", "", "", ""],
  ];
  const minerais = [
    ["Número do Alimento", "Descrição dos alimentos", "Cálcio (mg)", "Ferro (mg)"],
    ["Frutas e derivados", "", "", ""],
    [501, "Banana, prata, crua", 8, 0.4],
  ];
  const planilha = [
    ...cabecalho,
    ["Frutas e derivados", "", "", "", "", "", "", ""],
    [501, "Banana, prata, crua", 98, 410, 1.3, 0.1, 26, 2],
    ...cabecalho, // repetido na quebra de página
    [502, "Abacaxi, cru", 48, 200, 0.9, "Tr", 12.3, 1],
    ["Gorduras e óleos", "", "", "", "", "", "", ""],
    [600, "Azeite", 884, 3701, "NA", 100, "NA", "NA"],
    ...minerais,
  ];

  it.each(["xlsx", "biff8"] as const)("lê %s, ignorando tabelas sem energia", (bookType) => {
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(planilha), "CMVCol taco3");
    const arquivo = XLSX.write(livro, { type: "buffer", bookType }) as Buffer;
    const lidas = lerPlanilha(arquivo);
    expect(lidas.map((f) => [f.id, f.kcal, f.kj, f.carboidratoG])).toEqual([
      [501, 98, 410, 26],
      [502, 48, 200, 12.3],
    ]);
    expect(lidas[1]).toMatchObject({ lipidiosG: 0, traco: ["lipidiosG"] });
  });
});

describe("PDF da TACO", () => {
  const cabecalho = ["Umidade", "Energia", "Proteína", "Lipídeos", "Colesterol", "Carbo-", "Fibra", "Cinzas"].map(
    (texto, i) => ({ texto, linha: 1, coluna: 100 + i * 10 }),
  );
  const linha = (numero: number, celulas: string[]) =>
    celulas.map((texto, i) => ({ texto, linha: numero, coluna: i }));
  const banana = ["182", "Banana, prata, crua", "71,9", "98", "411", "1,3", "0,1", "NA", "26,0", "2,0", "0,8", "8", "26"];
  const grupo = (texto: string, numero: number) => [{ texto, linha: numero, coluna: 0 }];

  it("monta as linhas pela coordenada, mesmo com itens fora de ordem", () => {
    const itens = [...cabecalho, ...grupo("Frutas e derivados", 2), ...linha(3, banana).reverse()];
    expect(extrairFrutas(gradeDoPdf([itens]))).toMatchObject([
      { id: 182, kcal: 98, kj: 411, proteinaG: 1.3, lipidiosG: 0.1, carboidratoG: 26, fibraG: 2 },
    ]);
  });

  it("ignora o número da página e os outros grupos", () => {
    const itens = [
      ...cabecalho,
      ...linha(2, banana),
      ...grupo("Frutas e derivados", 3),
      ...grupo("36", 4),
      ...grupo("Gorduras e óleos", 5),
      ...linha(6, banana),
    ];
    expect(extrairFrutas(gradeDoPdf([itens]))).toEqual([]);
  });

  it("falha em vez de adivinhar quando falta uma célula", () => {
    const itens = [...cabecalho, ...grupo("Frutas e derivados", 2), ...linha(3, banana.slice(0, 12))];
    expect(() => gradeDoPdf([itens])).toThrow(/12 células/);
  });

  it("falha se as colunas da página estiverem em outra ordem", () => {
    const invertido = cabecalho.map((c, i) => ({ ...c, coluna: 200 - i }));
    expect(() => gradeDoPdf([invertido])).toThrow(/Colunas inesperadas/);
  });
});

describe("teste de sanidade (passo 7)", () => {
  it("passa com os valores de controle", () => {
    expect(testeSanidade(frutas)).toEqual([]);
  });
  it("acusa kcal e kJ incompatíveis, sinal de coluna desalinhada", () => {
    const desalinhadas = frutas.map((f) => (f.busca === "banana prata crua" ? { ...f, kj: 202 } : f));
    expect(testeSanidade(desalinhadas)).toEqual([
      "Banana, prata, crua: 98 kcal e 202 kJ não são compatíveis",
    ]);
  });
  it("acusa valor divergente e fruta ausente", () => {
    const alteradas = frutas
      .filter((f) => f.busca !== "uva italia crua")
      .map((f) => (f.busca === "abacaxi cru" ? { ...f, kcal: 50 } : f));
    expect(testeSanidade(alteradas)).toEqual([
      "abacaxi cru: esperado 48 kcal, veio 50",
      "Fruta de controle ausente: uva italia crua",
    ]);
  });
});
