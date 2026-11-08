import { describe, expect, it } from "vitest";
import {
  calcularComposicao,
  energia,
  gramasEquivalentes,
  interpretarGramas,
  podeSerCalculada,
  type ItemEntrada,
} from "./calculo";

const BANANA = 98;
const UVA = 53;
const ABACAXI = 48;
const MACA_FUJI = 56;
const META = energia(65, BANANA);

const fixo = (kcalPor100: number | null, gramas?: number): ItemEntrada => ({
  tipo: "fixo",
  kcalPor100,
  gramas,
});
const calculado = (kcalPor100: number | null): ItemEntrada => ({ tipo: "calculado", kcalPor100 });

describe("exemplos da seção 2", () => {
  it("Substituir: 65 g de banana prata", () => {
    expect(META).toBeCloseTo(63.7, 10);
    expect(Math.round(gramasEquivalentes(META, UVA)!)).toBe(120);
    expect(Math.round(gramasEquivalentes(META, ABACAXI)!)).toBe(133);
  });

  it("Complementar: 30 g de banana + abacaxi", () => {
    const r = calcularComposicao(META, [fixo(BANANA, 30), calculado(ABACAXI)]);
    expect(r.somaFixos).toBeCloseTo(29.4, 10);
    expect(r.saldoFixos).toBeCloseTo(34.3, 10);
    expect(r.itens[1].gramasExibidas).toBe(71);
  });

  it("Combinar: 20 g de uva + abacaxi", () => {
    const r = calcularComposicao(META, [fixo(UVA, 20), calculado(ABACAXI)]);
    expect(r.somaFixos).toBeCloseTo(10.6, 10);
    expect(r.saldoFixos).toBeCloseTo(53.1, 10);
    expect(r.itens[1].gramasExibidas).toBe(111);
  });

  it("Combinar com 2 calculados: saldo dividido igualmente em kcal", () => {
    const r = calcularComposicao(META, [fixo(UVA, 20), calculado(ABACAXI), calculado(MACA_FUJI)]);
    expect(r.itens[1].kcal).toBeCloseTo(26.55, 10);
    expect(r.itens[2].kcal).toBeCloseTo(26.55, 10);
    expect(r.itens[1].gramasExibidas).toBe(55);
    expect(r.itens[2].gramasExibidas).toBe(47);
  });

  it("Excesso: 200 g de abacaxi", () => {
    const r = calcularComposicao(META, [fixo(ABACAXI, 200)]);
    expect(r.estado).toBe("excesso");
    expect(r.saldoFixos).toBeCloseTo(-32.3, 10);
    expect(r.excesso?.kcal).toBeCloseTo(32.3, 10);
    expect(Math.round(r.excesso!.gramasRemover)).toBe(67);
    expect(r.excesso?.indiceItem).toBe(0);
  });
});

describe("RN-01 — precisão total, arredondar só na exibição", () => {
  it("mantém as gramas sem arredondar ao lado do valor exibido", () => {
    const r = calcularComposicao(META, [calculado(ABACAXI)]);
    expect(r.itens[0].gramas).toBeCloseTo(132.7083, 3);
    expect(r.itens[0].gramasExibidas).toBe(133);
  });
});

describe("RN-02 — gramas aceitas", () => {
  it.each([
    ["65", 65],
    ["65,5", 65.5],
    ["65.5", 65.5],
    [" 30 ", 30],
    ["2000", 2000],
    ["0,1", 0.1],
    ["30,", 30],
  ])("aceita %s", (texto, valor) => {
    expect(interpretarGramas(texto)).toEqual({ estado: "valido", valor });
  });

  it.each(["0", "-5", "2000,5", "abc", "1,2,3", "1e3", "."])("rejeita %s", (texto) => {
    expect(interpretarGramas(texto).estado).toBe("invalido");
  });

  it.each(["", "   "])("vazio é item ainda não preenchido", (texto) => {
    expect(interpretarGramas(texto).estado).toBe("vazio");
  });
});

describe("RN-03 — excesso", () => {
  it("não calcula itens e usa o último item fixo para remover o excesso", () => {
    const r = calcularComposicao(META, [
      fixo(BANANA, 65),
      fixo(UVA, 100),
      calculado(ABACAXI),
    ]);
    expect(r.estado).toBe("excesso");
    expect(r.itens[2].gramas).toBeNull();
    expect(r.itens[2].kcal).toBeNull();
    expect(r.excesso?.indiceItem).toBe(1);
    expect(r.excesso?.gramasRemover).toBeCloseTo(100, 10);
  });

  it("ignora itens fixos vazios ao escolher o último", () => {
    const r = calcularComposicao(META, [fixo(ABACAXI, 200), fixo(UVA)]);
    expect(r.excesso?.indiceItem).toBe(0);
  });
});

describe("RN-04 — meta atingida", () => {
  it("zera os itens calculados", () => {
    const r = calcularComposicao(META, [fixo(BANANA, 65), calculado(ABACAXI)]);
    expect(r.estado).toBe("meta-atingida");
    expect(r.itens[1].gramas).toBe(0);
    expect(r.itens[1].kcal).toBe(0);
  });

  it("não confunde ruído de ponto flutuante com saldo", () => {
    const r = calcularComposicao(META, [fixo(BANANA, 30), fixo(BANANA, 35)]);
    expect(r.estado).toBe("meta-atingida");
    expect(r.saldoFinal).toBe(0);
  });
});

describe("RN-05 — fruta sem kcal", () => {
  it.each([null, 0])("kcal %s não pode ser calculada", (kcal) => {
    expect(podeSerCalculada({ kcal })).toBe(false);
  });

  it("fica de fora da divisão do saldo", () => {
    const r = calcularComposicao(META, [calculado(null), calculado(ABACAXI), calculado(0)]);
    expect(r.itens[0].gramas).toBeNull();
    expect(r.itens[2].gramas).toBeNull();
    expect(r.itens[1].kcal).toBeCloseTo(META, 10);
  });

  it("gramasEquivalentes não produz Infinity", () => {
    expect(gramasEquivalentes(META, 0)).toBeNull();
    expect(gramasEquivalentes(META, null)).toBeNull();
  });
});

describe("RN-06 — total real", () => {
  it("soma as kcal das gramas arredondadas e fica a até ±1 kcal da meta", () => {
    const r = calcularComposicao(META, [fixo(UVA, 20), calculado(ABACAXI)]);
    expect(r.totalReal).toBeCloseTo(10.6 + (111 * 48) / 100, 10);
    expect(Math.abs(r.totalReal - META)).toBeLessThanOrEqual(1);
    expect(r.usado).toBeCloseTo(META, 10);
    expect(r.saldoFinal).toBeCloseTo(0, 10);
  });
});

describe("RN-07 — fruta da prescrição como item fixo", () => {
  it("funciona igual a qualquer outro item", () => {
    const r = calcularComposicao(META, [fixo(BANANA, 30)]);
    expect(r.estado).toBe("em-andamento");
    expect(r.saldoFinal).toBeCloseTo(34.3, 10);
  });
});

describe("estados", () => {
  it("sem itens preenchidos está pendente, com o saldo igual à meta", () => {
    const r = calcularComposicao(META, [fixo(BANANA)]);
    expect(r.estado).toBe("pendente");
    expect(r.usado).toBe(0);
    expect(r.saldoFinal).toBeCloseTo(META, 10);
  });

  it("item calculado sozinho completa a meta", () => {
    const r = calcularComposicao(META, [calculado(UVA)]);
    expect(r.estado).toBe("completo");
  });
});
