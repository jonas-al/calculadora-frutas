import { expect, test } from "@playwright/test";
import {
  adicionarFruta,
  anuncio,
  cadastrarBanana,
  CHAVE,
  escolherFrutaNoSeletor,
  itemDaRefeicao,
} from "./apoio";

test.describe("RF-01 — prescrição", () => {
  test("mostra a prévia de 63,7 kcal antes de salvar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Fruta prescrita/ }).click();
    await escolherFrutaNoSeletor(page, "Banana prata");
    await page.getByLabel("Gramas prescritas (g)").fill("65");
    await expect(page.getByText("63,7 kcal")).toBeVisible();
  });

  test("gramas inválidas mostram erro ligado ao campo e bloqueiam o salvamento", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Fruta prescrita/ }).click();
    await escolherFrutaNoSeletor(page, "Banana prata");
    const campo = page.getByLabel("Gramas prescritas (g)");
    await campo.fill("3000");
    await expect(campo).toHaveAttribute("aria-invalid", "true");
    await expect(campo).toHaveAccessibleDescription(/até 2000 gramas/);
    await page.getByRole("button", { name: "Salvar prescrição" }).click();
    await expect(page.getByRole("heading", { name: "Cadastre sua prescrição" })).toBeVisible();
    await expect(campo).toBeFocused();
  });

  test("exige a fruta", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Gramas prescritas (g)").fill("65");
    await page.getByRole("button", { name: "Salvar prescrição" }).click();
    await expect(page.getByText("Escolha a fruta prescrita.")).toBeVisible();
  });
});

test.describe("RF-02 — Substituir", () => {
  test.beforeEach(async ({ page }) => cadastrarBanana(page));

  test("lista as gramas equivalentes sem a fruta prescrita", async ({ page }) => {
    await expect(itemDaRefeicao(page, "Uva Itália")).toContainText("120 g");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("133 g");
    await expect(page.getByRole("link", { name: "Banana prata", exact: true })).toHaveCount(0);
  });

  test("ordena por menos e mais gramas", async ({ page }) => {
    const primeiro = page.locator("#modo-painel ul > li a").first();
    await page.getByLabel("Ordenar por").selectOption({ label: "Menos gramas" });
    await expect(primeiro).toHaveText("Macaúba");
    await page.getByLabel("Ordenar por").selectOption({ label: "Mais gramas" });
    await expect(primeiro).toHaveText("Jambo");
  });

  test("favorita sobe para o topo", async ({ page }) => {
    await page.getByRole("button", { name: "Favoritar Uva Itália" }).click();
    await expect(page.locator("#modo-painel ul > li a").first()).toHaveText("Uva Itália");
  });
});

test.describe("RF-03 — Complementar", () => {
  test("30 g de banana + abacaxi", async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("tab", { name: "Complementar" }).click();
    // Atalho: abre com a fruta prescrita como item fixo.
    await page.getByLabel("Gramas de Banana prata (g)").fill("30");
    await adicionarFruta(page, "Abacaxi");
    await expect(page.getByText("Faltam 34,3 kcal → 71 g de abacaxi")).toBeVisible();
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("71 g");
    await expect(await anuncio(page)).toHaveText("Abacaxi: 71 gramas. Saldo zero.");
  });
});

test.describe("RF-04 — Combinar", () => {
  test.beforeEach(async ({ page }) => {
    await cadastrarBanana(page);
    await page.getByRole("tab", { name: "Combinar" }).click();
    await adicionarFruta(page, "Uva Itália");
    await page.getByLabel("Gramas de Uva Itália (g)").fill("20");
    await adicionarFruta(page, "Abacaxi");
  });

  test("1 calculado, com resumo e anúncio", async ({ page }) => {
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("111 g");
    const resumo = page.getByRole("region", { name: "Resumo da refeição" });
    await expect(resumo).toContainText("Meta63,7 kcal");
    await expect(resumo).toContainText("Usado63,7 kcal");
    await expect(resumo).toContainText("Saldo0,0 kcal");
    await expect(resumo).toContainText("Total com as gramas arredondadas: 63,9 kcal");
    await expect(await anuncio(page)).toHaveText("Abacaxi: 111 gramas. Saldo zero.");
  });

  test("2 calculados dividem o saldo igualmente", async ({ page }) => {
    await adicionarFruta(page, "Maçã Fuji");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("55 g");
    await expect(itemDaRefeicao(page, "Maçã Fuji")).toContainText("47 g");
  });

  test("atualiza a cada tecla, sem botão Calcular", async ({ page }) => {
    const campo = page.getByLabel("Gramas de Uva Itália (g)");
    await campo.fill("");
    await page.keyboard.type("3");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("129 g");
    await page.keyboard.type("0");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("100 g");
  });

  test("seletor Eu informo / Calcular troca o papel do item", async ({ page }) => {
    await itemDaRefeicao(page, "Uva Itália").getByText("Calcular", { exact: true }).click();
    await expect(itemDaRefeicao(page, "Uva Itália")).toContainText("60 g");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("66 g");
  });

  test("excesso: não calcula e mostra alerta com texto (RN-03)", async ({ page }) => {
    await page.getByLabel("Gramas de Uva Itália (g)").fill("300");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("não calculado");
    const resumo = page.getByRole("region", { name: "Resumo da refeição" });
    await expect(resumo).toContainText("Você passou 95,3 kcal da meta");
    await expect(resumo).toContainText("Remova 180 g de Uva Itália.");
  });

  test("restaura a composição ao recarregar (RP-04)", async ({ page }) => {
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("111 g");
    await page.waitForFunction((c) => localStorage.getItem(c)?.includes('"gramas":20'), CHAVE);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Combinar" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Gramas de Uva Itália (g)")).toHaveValue("20");
    await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("111 g");
  });

  test("limite de 6 itens", async ({ page }) => {
    await adicionarFruta(page, "Maçã Fuji");
    await adicionarFruta(page, "Abacaxi");
    await adicionarFruta(page, "Abacaxi");
    await adicionarFruta(page, "Abacaxi");
    await page.getByRole("button", { name: "Adicionar fruta" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Limite de 6 frutas atingido")).toBeVisible();
  });
});

test("excesso com um único item: remover 67 g de abacaxi (exemplo da seção 2)", async ({ page }) => {
  await cadastrarBanana(page);
  await page.getByRole("tab", { name: "Combinar" }).click();
  await adicionarFruta(page, "Abacaxi");
  await page.getByLabel("Gramas de Abacaxi (g)").fill("200");
  const resumo = page.getByRole("region", { name: "Resumo da refeição" });
  await expect(resumo).toContainText("Você passou 32,3 kcal da meta");
  await expect(resumo).toContainText("Remova 67 g de Abacaxi.");
});

test("meta atingida (RN-04)", async ({ page }) => {
  await cadastrarBanana(page);
  await page.getByRole("tab", { name: "Complementar" }).click();
  await page.getByLabel("Gramas de Banana prata (g)").fill("65");
  await adicionarFruta(page, "Abacaxi");
  await expect(page.getByRole("region", { name: "Resumo da refeição" })).toContainText("Meta atingida");
  await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("0 g");
});
