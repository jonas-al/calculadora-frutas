/** Motor de cálculo (seção 2). Funções puras: sem React e sem arredondamento (RN-01). */

export const GRAMAS_MAXIMAS = 2000;

/** Abaixo disso a diferença é ruído de ponto flutuante, não saldo real. */
const EPSILON_KCAL = 1e-9;

export type GramasInterpretadas =
  | { estado: "vazio" }
  | { estado: "invalido" }
  | { estado: "valido"; valor: number };

/** RN-02: números > 0 e ≤ 2000, com vírgula ou ponto; vazio = não preenchido. */
export function interpretarGramas(texto: string): GramasInterpretadas {
  const limpo = texto.trim();
  if (limpo === "") return { estado: "vazio" };
  if (!/^(\d+[.,]?\d*|[.,]\d+)$/.test(limpo)) return { estado: "invalido" };
  const valor = Number(limpo.replace(",", "."));
  if (!(valor > 0) || valor > GRAMAS_MAXIMAS) return { estado: "invalido" };
  return { estado: "valido", valor };
}

export function energia(gramas: number, kcalPor100: number): number {
  return (gramas * kcalPor100) / 100;
}

/** RN-05: kcal ausente ou zero não pode gerar gramas. */
export function podeSerCalculada(fruta: { kcal: number | null }): boolean {
  return fruta.kcal !== null && fruta.kcal > 0;
}

export function gramasEquivalentes(kcalAlvo: number, kcalPor100: number | null): number | null {
  if (kcalPor100 === null || kcalPor100 <= 0) return null;
  return (100 * kcalAlvo) / kcalPor100;
}

export type ItemEntrada = {
  tipo: "fixo" | "calculado";
  kcalPor100: number | null;
  /** Só itens fixos; ausente = ainda não preenchido. */
  gramas?: number;
};

export type ItemResultado = {
  /** Precisão total; null quando o item não tem valor a mostrar. */
  gramas: number | null;
  gramasExibidas: number | null;
  kcal: number | null;
};

export type EstadoComposicao =
  | "pendente" // nenhum item contribui ainda
  | "em-andamento" // há fixos e ainda sobra saldo
  | "completo" // itens calculados fecham a meta
  | "meta-atingida" // RN-04
  | "excesso"; // RN-03

export type ResultadoComposicao = {
  meta: number;
  /** Σ kcal dos itens fixos. */
  somaFixos: number;
  /** S da especificação: meta − Σ fixos. */
  saldoFixos: number;
  /** Kcal consumidas, incluindo o que os itens calculados completam (sem arredondar). */
  usado: number;
  /** Meta − usado: o que ainda resta depois de distribuir o saldo. */
  saldoFinal: number;
  /** RN-06: soma das kcal das gramas como exibidas. */
  totalReal: number;
  estado: EstadoComposicao;
  itens: ItemResultado[];
  excesso: { kcal: number; gramasRemover: number; indiceItem: number } | null;
};

export function calcularComposicao(meta: number, itens: ItemEntrada[]): ResultadoComposicao {
  const kcalFixo = (item: ItemEntrada) =>
    item.tipo === "fixo" && item.gramas !== undefined
      ? energia(item.gramas, item.kcalPor100 ?? 0)
      : 0;

  const somaFixos = itens.reduce((soma, item) => soma + kcalFixo(item), 0);
  const bruto = meta - somaFixos;
  const saldoFixos = Math.abs(bruto) < EPSILON_KCAL ? 0 : bruto;
  const elegiveis = itens.filter(
    (item) => item.tipo === "calculado" && podeSerCalculada({ kcal: item.kcalPor100 }),
  ).length;

  const kcalPorCalculado = saldoFixos > 0 && elegiveis > 0 ? saldoFixos / elegiveis : 0;

  const resultados = itens.map((item): ItemResultado => {
    if (item.tipo === "fixo") {
      const preenchido = item.gramas !== undefined;
      return {
        gramas: item.gramas ?? null,
        gramasExibidas: item.gramas ?? null,
        kcal: preenchido ? kcalFixo(item) : null,
      };
    }
    const gramas = gramasEquivalentes(kcalPorCalculado, item.kcalPor100);
    if (gramas === null || saldoFixos < 0) return { gramas: null, gramasExibidas: null, kcal: null };
    const exibidas = Math.round(gramas);
    return { gramas, gramasExibidas: exibidas, kcal: kcalPorCalculado };
  });

  const usado = somaFixos + kcalPorCalculado * elegiveis;
  const totalReal = itens.reduce((soma, item, i) => {
    const exibidas = resultados[i].gramasExibidas;
    return exibidas === null ? soma : soma + energia(exibidas, item.kcalPor100 ?? 0);
  }, 0);

  return {
    meta,
    somaFixos,
    saldoFixos,
    usado,
    saldoFinal: saldoFixos > 0 && elegiveis > 0 ? 0 : saldoFixos,
    totalReal,
    estado: definirEstado(saldoFixos, somaFixos, elegiveis),
    itens: resultados,
    excesso: saldoFixos < 0 ? calcularExcesso(-saldoFixos, itens) : null,
  };
}

function definirEstado(saldo: number, somaFixos: number, elegiveis: number): EstadoComposicao {
  if (saldo < 0) return "excesso";
  if (saldo === 0) return "meta-atingida";
  if (elegiveis > 0) return "completo";
  return somaFixos > 0 ? "em-andamento" : "pendente";
}

/** RN-03: quantas gramas do último item fixo removem o excesso. */
function calcularExcesso(kcal: number, itens: ItemEntrada[]) {
  const indiceItem = itens.findLastIndex(
    (item) => item.tipo === "fixo" && item.gramas !== undefined && (item.kcalPor100 ?? 0) > 0,
  );
  const gramasRemover = gramasEquivalentes(kcal, itens[indiceItem].kcalPor100);
  return { kcal, gramasRemover: gramasRemover as number, indiceItem };
}
