import { describe, expect, it } from "vitest";
import { testeSanidade } from "../../scripts/import-taco";
import { calcularComposicao, energia, gramasEquivalentes } from "@/domain/calculo";
import dataset from "./frutas-taco.json";

const kcalDe = (nomeTaco: string) => {
  const fruta = dataset.frutas.find((f) => f.nomeTaco === nomeTaco);
  if (!fruta?.kcal) throw new Error(`Fruta ausente: ${nomeTaco}`);
  return fruta.kcal;
};

const banana = kcalDe("Banana, prata, crua");
const uva = kcalDe("Uva, Itália, crua");
const abacaxi = kcalDe("Abacaxi, cru");
const macaFuji = kcalDe("Maçã, Fuji, com casca, crua");
const meta = energia(65, banana);

describe("dataset importado", () => {
  it("veio da fonte oficial, não do fixture", () => {
    expect(dataset.meta.fixture).toBe(false);
    expect(dataset.meta.hashFonte).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("passa no teste de sanidade (passo 7)", () => {
    expect(testeSanidade(dataset.frutas as Parameters<typeof testeSanidade>[0])).toEqual([]);
  });

  it("confirma os valores usados nos exemplos da seção 2", () => {
    expect([banana, uva, abacaxi, macaFuji]).toEqual([98, 53, 48, 56]);
  });

  it("confirma cada exemplo da seção 2 com os dados reais", () => {
    expect(Math.round(gramasEquivalentes(meta, uva)!)).toBe(120);
    expect(Math.round(gramasEquivalentes(meta, abacaxi)!)).toBe(133);

    const combinado = calcularComposicao(meta, [
      { tipo: "fixo", kcalPor100: uva, gramas: 20 },
      { tipo: "calculado", kcalPor100: abacaxi },
      { tipo: "calculado", kcalPor100: macaFuji },
    ]);
    expect(combinado.itens[1].gramasExibidas).toBe(55);
    expect(combinado.itens[2].gramasExibidas).toBe(47);
  });

  it("guarda a página que a extração de texto embaralha com os valores certos", () => {
    expect(kcalDe("Caju, suco concentrado, envasado")).toBe(45);
    expect(kcalDe("Caqui, chocolate, cru")).toBe(71);
    expect(kcalDe("Carambola, crua")).toBe(46);
  });

  it("tem ids contínuos, sem frutas perdidas", () => {
    const ids = dataset.frutas.map((f) => f.id).sort((a, b) => a - b);
    expect(ids).toEqual(ids.map((_, i) => ids[0] + i));
  });
});
