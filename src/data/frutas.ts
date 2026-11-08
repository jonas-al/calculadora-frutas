import type { Fruta } from "@/domain/frutas";
import dataset from "./frutas-taco.json";

export const frutas = dataset.frutas as Fruta[];
export const metaDados = dataset.meta;

const porId = new Map(frutas.map((fruta) => [fruta.id, fruta]));

export const obterFruta = (id: number): Fruta | undefined => porId.get(id);
export const existeFruta = (id: number): boolean => porId.has(id);

export function frutasVisiveis(mostrarDerivados: boolean): Fruta[] {
  return mostrarDerivados ? frutas : frutas.filter((fruta) => fruta.tipo === "in natura");
}
