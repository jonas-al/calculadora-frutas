import { expect, test } from "@playwright/test";
import { adicionarFruta, cadastrarBanana, CHAVE, itemDaRefeicao } from "./apoio";

test.describe("RF-05 — busca", () => {
  test('"maca" encontra as maçãs, em qualquer acentuação', async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByLabel("Buscar fruta").fill("maca");
    await expect(page.getByRole("link", { name: "Maçã Fuji", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maçã Argentina", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abacaxi", exact: true })).toHaveCount(0);
  });

  test("avisa quando nada é encontrado", async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByLabel("Buscar fruta").fill("zzz");
    await expect(page.getByText("Nenhuma fruta encontrada")).toBeVisible();
  });
});

test.describe("RF-06 — detalhe", () => {
  test("mostra por 100 g, pela porção, nome TACO e fonte", async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByRole("link", { name: "Banana prata", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Banana prata" })).toBeVisible();
    await page.getByLabel("Porção (g)").fill("50");
    const linha = page.getByRole("row", { name: /Energia \(kcal\)/ });
    await expect(linha).toContainText("98,0");
    await expect(linha).toContainText("49,0");
    await expect(page.getByRole("columnheader", { name: "Por 50 g" })).toBeVisible();
    await expect(page.getByText("Banana, prata, crua")).toBeVisible();
    await expect(page.getByText("Fonte: TACO – Tabela Brasileira de Composição de Alimentos, 4ª ed., NEPA/UNICAMP")).toBeVisible();
  });

  test("traço aparece como traços", async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByRole("link", { name: "Informações de Maçã Fuji" }).click();
    await expect(page.getByRole("row", { name: /Lipídios/ })).toContainText("traços");
  });

  test("a tabela já vem no HTML estático, sem depender de JavaScript", async ({ request }) => {
    const html = await (await request.get("/frutas/182/")).text();
    expect(html).toContain("Banana, prata, crua");
    expect(html).toContain("Energia (kcal)");
    expect(html).toContain("98,0");
  });

  test("a porção abre com o valor em uso", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("link", { name: "Informações de Abacaxi" }).click();
    await expect(page.getByLabel("Porção (g)")).toHaveValue("133");
  });

  test("Usar na calculadora devolve a fruta para Calcular", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("link", { name: "Informações de Abacaxi" }).click();
    await page.getByRole("button", { name: "Usar na calculadora" }).click();
    await expect(page.getByRole("tab", { name: "Combinar" })).toHaveAttribute("aria-selected", "true");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("133 g");
  });

  test("sem prescrição, Usar na calculadora leva ao cadastro com a fruta escolhida", async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByRole("link", { name: "Banana prata", exact: true }).click();
    await page.getByRole("button", { name: "Usar na calculadora" }).click();
    await expect(page.getByRole("button", { name: /Fruta prescrita Banana prata/ })).toBeVisible();
  });

});

test.describe("RF-07 — favoritos", () => {
  test("anuncia o estado, sobe na lista e sobrevive ao recarregar", async ({ page }) => {
    await page.goto("/frutas/");
    const estrela = page.getByRole("button", { name: "Favoritar Uva Itália" });
    await expect(estrela).toHaveAttribute("aria-pressed", "false");
    await estrela.click();
    await expect(estrela).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#frutas-painel ul > li a").first()).toHaveText("Uva Itália");
    await page.getByRole("tab", { name: "Favoritas" }).click();
    await expect(page.getByRole("link", { name: "Uva Itália", exact: true })).toBeVisible();
    await page.waitForFunction((c) => localStorage.getItem(c)?.includes("favoritos"), CHAVE);
    await page.reload();
    await expect(page.getByRole("button", { name: "Favoritar Uva Itália" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("RF-08 — recentes", () => {
  test("detalhe aberto entra em recentes, sem duplicar, e pode ser limpo", async ({ page }) => {
    await page.goto("/frutas/");
    await page.getByRole("link", { name: "Abacaxi", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Abacaxi" })).toBeVisible();
    await page.getByRole("link", { name: "Frutas" }).click();
    await page.getByRole("link", { name: "Uva Itália", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Uva Itália" })).toBeVisible();
    await page.getByRole("link", { name: "Frutas" }).click();
    await page.getByRole("link", { name: "Abacaxi", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Abacaxi" })).toBeVisible();
    await page.getByRole("link", { name: "Frutas" }).click();
    await page.getByRole("tab", { name: "Recentes" }).click();
    const nomes = page.locator("#frutas-painel ul > li a:not([aria-label])");
    await expect(nomes).toHaveText(["Abacaxi", "Uva Itália"]);

    await page.getByRole("button", { name: "Limpar recentes" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Limpar" }).click();
    await expect(page.getByText("As frutas que você usar aparecem aqui.")).toBeVisible();
  });

  test("item usado no cálculo aparece no seletor em Recentes", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("tab", { name: "Combinar" }).click();
    await adicionarFruta(page, "Abacaxi");
    await page.getByRole("button", { name: "Adicionar fruta" }).click();
    const secao = page.getByRole("dialog").locator("section").filter({ hasText: "Recentes" });
    await expect(secao.getByRole("button", { name: /^Abacaxi/ })).toBeVisible();
  });
});

test.describe("T3 — seletor", () => {
  test("foco na busca, Esc fecha e devolve o foco ao botão de origem", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("tab", { name: "Combinar" }).click();
    const botao = page.getByRole("button", { name: "Adicionar fruta" });
    await botao.click();
    await expect(page.getByRole("dialog").getByLabel("Buscar fruta")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(botao).toBeFocused();
  });

  test("prende o foco dentro do bottom sheet", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("tab", { name: "Combinar" }).click();
    await page.getByRole("button", { name: "Adicionar fruta" }).click();
    await expect(page.getByRole("dialog").getByLabel("Buscar fruta")).toBeFocused();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const dentro = await page.evaluate(
        () => !document.activeElement?.closest("nav, main") || !!document.activeElement.closest("dialog"),
      );
      expect(dentro).toBe(true);
    }
  });

  test("filtro Mostrar derivados revela os derivados", async ({ page }) => {
    await page.goto("/frutas/");
    await expect(page.getByRole("link", { name: "Banana doce em barra", exact: true })).toHaveCount(0);
    await page.getByLabel("Mostrar derivados").check();
    await expect(page.getByRole("link", { name: "Banana doce em barra", exact: true })).toBeVisible();
  });
});
