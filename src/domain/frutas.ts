/** Regras puras sobre listas de frutas: busca, ordenação e recentes. */
import { gramasEquivalentes, podeSerCalculada } from "./calculo";

export type Fruta = {
  id: number;
  nomeTaco: string;
  nomeExibicao: string;
  busca: string;
  tipo: string;
  kcal: number | null;
  kj: number | null;
  carboidratoG: number | null;
  proteinaG: number | null;
  lipidiosG: number | null;
  fibraG: number | null;
  traco: string[];
};

export type Ordenacao = "padrao" | "menos-gramas" | "mais-gramas";

export const LIMITE_RECENTES = 10;
export const LIMITE_ITENS = 6;

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** RF-05: cada termo digitado precisa ser prefixo de alguma palavra. */
export function buscarFrutas<T extends Pick<Fruta, "busca">>(frutas: T[], consulta: string): T[] {
  const termos = normalizarBusca(consulta).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return frutas;
  return frutas.filter((fruta) => {
    const palavras = fruta.busca.split(" ");
    return termos.every((termo) => palavras.some((palavra) => palavra.startsWith(termo)));
  });
}

export function ordenarAlfabetica<T extends Pick<Fruta, "nomeExibicao">>(frutas: T[]): T[] {
  return [...frutas].sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao, "pt-BR"));
}

/** RF-02: favoritos, depois recentes (mais recente primeiro), depois alfabética. */
export function ordenarPadrao<T extends Pick<Fruta, "id" | "nomeExibicao">>(
  frutas: T[],
  favoritos: number[],
  recentes: number[],
): T[] {
  const favoritosSet = new Set(favoritos);
  const posicaoRecente = new Map(recentes.map((id, i) => [id, i]));
  const grupo = (id: number) => (favoritosSet.has(id) ? 0 : posicaoRecente.has(id) ? 1 : 2);
  return ordenarAlfabetica(frutas).sort((a, b) => {
    const diferenca = grupo(a.id) - grupo(b.id);
    if (diferenca !== 0) return diferenca;
    if (grupo(a.id) === 1) return posicaoRecente.get(a.id)! - posicaoRecente.get(b.id)!;
    return 0;
  });
}

export type Equivalente = { fruta: Fruta; gramas: number };

/** RF-02 + RN-05: lista de Substituir, sem a fruta da prescrição e sem frutas sem kcal. */
export function listarEquivalentes(opcoes: {
  frutas: Fruta[];
  meta: number;
  frutaPrescritaId: number;
  ordenacao: Ordenacao;
  favoritos: number[];
  recentes: number[];
}): Equivalente[] {
  const { frutas, meta, frutaPrescritaId, ordenacao, favoritos, recentes } = opcoes;
  const candidatas = frutas.filter((f) => f.id !== frutaPrescritaId && podeSerCalculada(f));
  const ordenadas = ordenarPadrao(candidatas, favoritos, recentes);
  const equivalentes = ordenadas.map((fruta) => ({
    fruta,
    gramas: gramasEquivalentes(meta, fruta.kcal) as number,
  }));
  if (ordenacao === "menos-gramas") return equivalentes.sort((a, b) => a.gramas - b.gramas);
  if (ordenacao === "mais-gramas") return equivalentes.sort((a, b) => b.gramas - a.gramas);
  return equivalentes;
}

/** RP-02 / RF-08: início da lista, sem duplicar, até 10. */
export function adicionarRecente(recentes: number[], id: number): number[] {
  return [id, ...recentes.filter((r) => r !== id)].slice(0, LIMITE_RECENTES);
}

export function alternarFavorito(favoritos: number[], id: number): number[] {
  return favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id];
}

export type Nutriente = "kcal" | "kj" | "carboidratoG" | "proteinaG" | "lipidiosG" | "fibraG";

export type ValorNutricional =
  | { tipo: "nao-analisado" }
  | { tipo: "tracos" }
  | { tipo: "numero"; valor: number };

/** RF-06: valor de um nutriente para certa quantidade em gramas. */
export function valorNutricional(
  fruta: Fruta,
  nutriente: Nutriente,
  gramas: number,
): ValorNutricional {
  if (fruta.traco.includes(nutriente)) return { tipo: "tracos" };
  const por100 = fruta[nutriente];
  if (por100 === null) return { tipo: "nao-analisado" };
  return { tipo: "numero", valor: (por100 * gramas) / 100 };
}
