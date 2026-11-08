import { expect, test } from "@playwright/test";
import { cadastrarBanana, CHAVE, escolherFrutaNoSeletor } from "./apoio";

async function cadastrarSegunda(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Prescrições" }).click();
  await page.getByRole("link", { name: "Nova prescrição" }).click();
  await page.getByRole("button", { name: /Fruta prescrita/ }).click();
  await escolherFrutaNoSeletor(page, "Abacaxi");
  await page.getByLabel("Gramas prescritas (g)").fill("100");
  await page.getByLabel("Nome da refeição (opcional)").fill("Café da manhã");
  await page.getByRole("button", { name: "Salvar prescrição" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Calcular" })).toBeVisible();
}

test.describe("RF-09 — várias prescrições", () => {
  test.beforeEach(async ({ page }) => {
    await cadastrarBanana(page);
    await cadastrarSegunda(page);
  });

  test("escolhe no topo da calculadora e a última abre por padrão", async ({ page }) => {
    const seletor = page.getByLabel("Prescrição ativa");
    await expect(seletor.locator("option")).toHaveText([
      "Lanche · 65 g Banana prata · 63,7 kcal",
      "Café da manhã · 100 g Abacaxi · 48,0 kcal",
    ]);
    await seletor.selectOption({ label: "Lanche · 65 g Banana prata · 63,7 kcal" });
    await page.waitForFunction(
      ([c, id]) => JSON.parse(localStorage.getItem(c as string) ?? "{}").prescricaoAtivaId === id,
      [CHAVE, await seletor.inputValue()],
    );
    await page.reload();
    await expect(page.getByLabel("Prescrição ativa").locator("option:checked")).toHaveText(
      "Lanche · 65 g Banana prata · 63,7 kcal",
    );
  });

  test("renomeia, edita e exclui com confirmação", async ({ page }) => {
    await page.getByRole("link", { name: "Prescrições" }).click();

    await page.getByRole("button", { name: "Renomear Lanche" }).click();
    await page.getByLabel("Novo nome").fill("Ceia");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Ceia" })).toBeVisible();

    await page.getByRole("link", { name: "Editar Ceia" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Editar prescrição" })).toBeVisible();
    await expect(page.getByLabel("Gramas prescritas (g)")).toHaveValue("65");
    await page.getByLabel("Gramas prescritas (g)").fill("70");
    await page.getByRole("button", { name: "Salvar prescrição" }).click();
    await expect(page.getByText("70 g Banana prata · 68,6 kcal")).toBeVisible();

    await page.getByRole("button", { name: "Excluir Ceia" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Ceia" })).toBeVisible();
    await page.getByRole("button", { name: "Excluir Ceia" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Ceia" })).toHaveCount(0);
  });
});

test("RP-07 — apagar todos os dados pede confirmação e remove a chave", async ({ page }) => {
  await cadastrarBanana(page);
  await page.waitForFunction((c) => localStorage.getItem(c) !== null, CHAVE);
  await page.getByRole("link", { name: "Prescrições" }).click();
  await page.getByRole("button", { name: "Apagar todos os meus dados" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apagar tudo" }).click();
  await expect(page.getByText("Seus dados foram apagados.")).toBeVisible();
  expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE)).toBeNull();
  await page.getByRole("link", { name: "Calcular" }).click();
  await expect(page.getByRole("heading", { name: "Cadastre sua prescrição" })).toBeVisible();
});

test("RP-05 — armazenamento indisponível: funciona em memória e avisa uma vez", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("cota");
    };
    Storage.prototype.getItem = () => {
      throw new Error("negado");
    };
  });
  await cadastrarBanana(page);
  const aviso = page.getByText("Não foi possível salvar neste navegador; seus dados valem só nesta sessão.");
  await expect(aviso).toBeVisible();
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(aviso).toHaveCount(0);
  await page.getByRole("button", { name: "Favoritar Abacaxi" }).click();
  await expect(page.getByRole("button", { name: "Favoritar Abacaxi" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(500);
  await expect(aviso).toHaveCount(0);
});

test("o aviso obrigatório aparece em todas as telas", async ({ page }) => {
  for (const rota of ["/", "/frutas/", "/prescricoes/", "/prescricoes/nova/"]) {
    await page.goto(rota);
    await expect(page.getByText("Esta calculadora apoia, mas não substitui, a orientação do seu nutricionista.")).toBeVisible();
  }
});
