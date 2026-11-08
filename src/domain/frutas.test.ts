import { describe, expect, it } from "vitest";
import {
  adicionarRecente,
  alternarFavorito,
  buscarFrutas,
  listarEquivalentes,
  ordenarPadrao,
  valorNutricional,
  type Fruta,
} from "./frutas";

const fruta = (id: number, nomeExibicao: string, kcal: number | null, extra = {}): Fruta => ({
  id,
  nomeTaco: nomeExibicao,
  nomeExibicao,
  busca: nomeExibicao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase(),
  tipo: "in natura",
  kcal,
  kj: null,
  carboidratoG: null,
  proteinaG: null,
  lipidiosG: null,
  fibraG: null,
  traco: [],
  ...extra,
});

const abacaxi = fruta(1, "Abacaxi", 48);
const banana = fruta(2, "Banana prata", 98);
const macaFuji = fruta(3, "Maçã Fuji", 56);
const macaArgentina = fruta(4, "Maçã Argentina", null);
const uva = fruta(5, "Uva Itália", 53);
const todas = [abacaxi, banana, macaFuji, macaArgentina, uva];

describe("RF-05 — busca", () => {
  it('"maca" encontra as maçãs, sem acento', () => {
    expect(buscarFrutas(todas, "maca").map((f) => f.id)).toEqual([3, 4]);
  });
  it("aceita acento na consulta e prefixo de qualquer palavra", () => {
    expect(buscarFrutas(todas, "MAÇÃ FU")).toEqual([macaFuji]);
    expect(buscarFrutas(todas, "pra")).toEqual([banana]);
  });
  it("não casa no meio da palavra", () => {
    expect(buscarFrutas(todas, "ana")).toEqual([]);
  });
  it("consulta vazia devolve tudo", () => {
    expect(buscarFrutas(todas, "  ")).toEqual(todas);
  });
  it("responde em até 100 ms com a base inteira", () => {
    const base = Array.from({ length: 2000 }, (_, i) => fruta(i, `Fruta ${i} teste`, 50));
    const inicio = performance.now();
    buscarFrutas(base, "fruta tes");
    expect(performance.now() - inicio).toBeLessThan(100);
  });
});

describe("RF-02 — ordenação", () => {
  it("favoritos, recentes e alfabética", () => {
    const ids = ordenarPadrao(todas, [5], [3, 1]).map((f) => f.id);
    expect(ids).toEqual([5, 3, 1, 2, 4]);
  });

  it("Substituir omite a fruta da prescrição e frutas sem kcal", () => {
    const lista = listarEquivalentes({
      frutas: todas,
      meta: 63.7,
      frutaPrescritaId: 2,
      ordenacao: "padrao",
      favoritos: [],
      recentes: [],
    });
    expect(lista.map((e) => e.fruta.id)).toEqual([1, 3, 5]);
    expect(Math.round(lista[2].gramas)).toBe(120);
  });

  it.each([
    ["menos-gramas", [2, 3, 5, 1]],
    ["mais-gramas", [1, 5, 3, 2]],
  ] as const)("%s", (ordenacao, esperado) => {
    const lista = listarEquivalentes({
      frutas: todas,
      meta: 63.7,
      frutaPrescritaId: 999,
      ordenacao,
      favoritos: [],
      recentes: [],
    });
    expect(lista.map((e) => e.fruta.id)).toEqual(esperado);
  });
});

describe("RF-08 / RP-02 — recentes", () => {
  it("entra no início sem duplicar", () => {
    expect(adicionarRecente([1, 2, 3], 2)).toEqual([2, 1, 3]);
  });
  it("mantém no máximo 10", () => {
    const lista = adicionarRecente([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11);
    expect(lista).toHaveLength(10);
    expect(lista[0]).toBe(11);
    expect(lista).not.toContain(10);
  });
});

describe("RF-07 — favoritos", () => {
  it("alterna", () => {
    expect(alternarFavorito([1], 2)).toEqual([1, 2]);
    expect(alternarFavorito([1, 2], 1)).toEqual([2]);
  });
});

describe("RF-06 — valores nutricionais", () => {
  const f = fruta(9, "Teste", 100, { fibraG: 2, lipidiosG: 0, traco: ["lipidiosG"] });
  it("escala para a porção", () => {
    expect(valorNutricional(f, "fibraG", 50)).toEqual({ tipo: "numero", valor: 1 });
  });
  it("null é não analisado, traço é traços", () => {
    expect(valorNutricional(f, "proteinaG", 50).tipo).toBe("nao-analisado");
    expect(valorNutricional(f, "lipidiosG", 50).tipo).toBe("tracos");
  });
});
