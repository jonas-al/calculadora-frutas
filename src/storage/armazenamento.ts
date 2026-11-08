/** Único ponto de acesso ao localStorage (seção 6). Nada aqui lança exceção. */
import type { Ordenacao } from "@/domain/frutas";

export const CHAVE = "calcfrutas:v1";
export const CHAVE_BACKUP = "calcfrutas:backup";
export const VERSAO = 1;

export type Prescricao = {
  id: string;
  nome: string;
  frutaId: number;
  gramas: number;
  criadaEm: string;
};

export type ModoCalculo = "substituir" | "complementar" | "combinar";

export type ItemComposicao = { frutaId: number; tipo: "fixo" | "calculado"; gramas?: number };

export type UltimaComposicao = {
  prescricaoId: string;
  modo: ModoCalculo;
  itens: ItemComposicao[];
};

export type Dados = {
  versao: number;
  prescricoes: Prescricao[];
  prescricaoAtivaId: string | null;
  favoritos: number[];
  recentes: number[];
  ultimaComposicao: UltimaComposicao | null;
  preferencias: { mostrarDerivados: boolean; ordenacao: Ordenacao };
};

export type ArmazenamentoLocal = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function dadosIniciais(): Dados {
  return {
    versao: VERSAO,
    prescricoes: [],
    prescricaoAtivaId: null,
    favoritos: [],
    recentes: [],
    ultimaComposicao: null,
    preferencias: { mostrarDerivados: false, ordenacao: "padrao" },
  };
}

function obterLocalStorage(): ArmazenamentoLocal | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Migrações por versão: `MIGRACOES[n]` transforma a versão n em n + 1. */
const MIGRACOES: Record<number, (dados: Record<string, unknown>) => Record<string, unknown>> = {};

/** RP-06: devolve os dados na versão atual, ou null se não houver caminho de migração. */
export function migrar(bruto: unknown): Record<string, unknown> | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  let dados = bruto as Record<string, unknown>;
  if (typeof dados.versao !== "number") return null;
  while ((dados.versao as number) < VERSAO) {
    const passo = MIGRACOES[dados.versao as number];
    if (!passo) return null;
    dados = { ...passo(dados), versao: (dados.versao as number) + 1 };
  }
  return dados.versao === VERSAO ? dados : null;
}

const ORDENACOES: Ordenacao[] = ["padrao", "menos-gramas", "mais-gramas"];
const MODOS: ModoCalculo[] = ["substituir", "complementar", "combinar"];

const ehId = (valor: unknown): valor is number => Number.isInteger(valor);

function ehPrescricao(valor: unknown): valor is Prescricao {
  const p = valor as Prescricao | null;
  return (
    typeof p?.id === "string" &&
    typeof p.nome === "string" &&
    ehId(p.frutaId) &&
    typeof p.gramas === "number" &&
    p.gramas > 0
  );
}

function sanearComposicao(
  bruta: unknown,
  prescricoes: Prescricao[],
  existe: (id: number) => boolean,
): UltimaComposicao | null {
  const c = bruta as UltimaComposicao | null;
  if (!c || !prescricoes.some((p) => p.id === c.prescricaoId) || !MODOS.includes(c.modo)) {
    return null;
  }
  const itens = Array.isArray(c.itens) ? c.itens : [];
  return {
    prescricaoId: c.prescricaoId,
    modo: c.modo,
    itens: itens
      .filter((i) => ehId(i?.frutaId) && existe(i.frutaId) && ["fixo", "calculado"].includes(i.tipo))
      .map((i) => {
        const gramas = i.tipo === "fixo" && typeof i.gramas === "number" ? i.gramas : undefined;
        return gramas === undefined
          ? { frutaId: i.frutaId, tipo: i.tipo }
          : { frutaId: i.frutaId, tipo: i.tipo, gramas };
      }),
  };
}

/** Confia só no que passa pela validação; RP-03 descarta ids fora do dataset. */
function sanear(dados: Record<string, unknown>, existe: (id: number) => boolean): Dados {
  const base = dadosIniciais();
  const prescricoes = (Array.isArray(dados.prescricoes) ? dados.prescricoes : [])
    .filter(ehPrescricao)
    .filter((p) => existe(p.frutaId));
  const idsValidos = (lista: unknown) =>
    [...new Set(Array.isArray(lista) ? lista : [])].filter(ehId).filter(existe);
  const ativa = prescricoes.find((p) => p.id === dados.prescricaoAtivaId) ?? prescricoes[0];
  const preferencias = (dados.preferencias ?? {}) as Partial<Dados["preferencias"]>;
  return {
    ...base,
    prescricoes,
    prescricaoAtivaId: ativa?.id ?? null,
    favoritos: idsValidos(dados.favoritos),
    recentes: idsValidos(dados.recentes).slice(0, 10),
    ultimaComposicao: sanearComposicao(dados.ultimaComposicao, prescricoes, existe),
    preferencias: {
      mostrarDerivados: preferencias.mostrarDerivados === true,
      ordenacao: ORDENACOES.includes(preferencias.ordenacao as Ordenacao)
        ? (preferencias.ordenacao as Ordenacao)
        : base.preferencias.ordenacao,
    },
  };
}

export type ResultadoCarga = { dados: Dados; falhou: boolean };

export function carregar(
  existe: (id: number) => boolean,
  armazenamento: ArmazenamentoLocal | null = obterLocalStorage(),
): ResultadoCarga {
  if (!armazenamento) return { dados: dadosIniciais(), falhou: true };
  let texto: string | null;
  try {
    texto = armazenamento.getItem(CHAVE);
  } catch {
    return { dados: dadosIniciais(), falhou: true };
  }
  if (texto === null) return { dados: dadosIniciais(), falhou: false };

  let migrados: Record<string, unknown> | null = null;
  try {
    migrados = migrar(JSON.parse(texto));
  } catch {
    migrados = null;
  }
  if (migrados) return { dados: sanear(migrados, existe), falhou: false };

  // RP-06: sem migração possível, guarda uma cópia e recomeça.
  try {
    armazenamento.setItem(CHAVE_BACKUP, texto);
    armazenamento.removeItem(CHAVE);
  } catch {
    return { dados: dadosIniciais(), falhou: true };
  }
  return { dados: dadosIniciais(), falhou: false };
}

/** Devolve false se não conseguiu gravar (modo privado, cota cheia). */
export function salvar(
  dados: Dados,
  armazenamento: ArmazenamentoLocal | null = obterLocalStorage(),
): boolean {
  if (!armazenamento) return false;
  try {
    armazenamento.setItem(CHAVE, JSON.stringify(dados));
    return true;
  } catch {
    return false;
  }
}

/** RP-07. Devolve false se a chave não pôde ser removida. */
export function apagarTudo(
  armazenamento: ArmazenamentoLocal | null = obterLocalStorage(),
): boolean {
  if (!armazenamento) return false;
  try {
    armazenamento.removeItem(CHAVE);
    return true;
  } catch {
    return false;
  }
}
