import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adicionarFruta, cadastrarBanana } from "./apoio";

async function semViolacoes(page: Page) {
  // A animação de abertura deixa o contraste transitório errado; espera assentar.
  await page.waitForTimeout(250);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const graves = violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(graves).toEqual([]);
}

async function umH1(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
}

async function semRolagemHorizontal(page: Page) {
  const excede = await page.evaluate(() => {
    const raiz = document.documentElement;
    const principal = document.querySelector("main")!;
    return raiz.scrollWidth > raiz.clientWidth || principal.scrollWidth > principal.clientWidth;
  });
  expect(excede).toBe(false);
}

async function montarCombinar(page: Page) {
  await cadastrarBanana(page);
  await page.getByRole("tab", { name: "Combinar" }).click();
  await adicionarFruta(page, "Uva Itália");
  await page.getByLabel("Gramas de Uva Itália (g)").fill("300");
  await adicionarFruta(page, "Abacaxi");
}

const telas: [string, (page: Page) => Promise<unknown>][] = [
  ["T1 primeiro acesso", (p) => p.goto("/")],
  ["T1 com erro", async (p) => {
    await p.goto("/");
    await p.getByLabel("Gramas prescritas (g)").fill("abc");
    await p.getByRole("button", { name: "Salvar prescrição" }).click();
  }],
  ["T2 Substituir", cadastrarBanana],
  ["T2 Combinar com excesso", montarCombinar],
  ["T3 seletor", async (p) => {
    await cadastrarBanana(p);
    await p.getByRole("tab", { name: "Combinar" }).click();
    await p.getByRole("button", { name: "Adicionar fruta" }).click();
    await expect(p.getByRole("dialog").getByLabel("Buscar fruta")).toBeFocused();
  }],
  ["T4 catálogo", (p) => p.goto("/frutas/")],
  ["T4 favoritas vazia", async (p) => {
    await p.goto("/frutas/");
    await p.getByRole("tab", { name: "Favoritas" }).click();
  }],
  ["T5 detalhe", async (p) => {
    await p.goto("/frutas/");
    await p.getByRole("link", { name: "Banana prata", exact: true }).click();
    await expect(p.getByRole("table")).toBeVisible();
  }],
  ["T6 vazia", (p) => p.goto("/prescricoes/")],
  ["T6 com prescrição", async (p) => {
    await cadastrarBanana(p);
    await p.getByRole("link", { name: "Prescrições" }).click();
    await expect(p.getByRole("heading", { level: 2 })).toBeVisible();
  }],
];

for (const esquema of ["light", "dark"] as const) {
  test.describe(`tema ${esquema}`, () => {
    test.use({ colorScheme: esquema });
    for (const [nome, preparar] of telas) {
      test(`${nome}: zero violações sérias ou críticas`, async ({ page }) => {
        await preparar(page);
        await semViolacoes(page);
      });
    }
  });
}

for (const [nome, preparar] of telas) {
  test(`${nome}: um h1 e sem rolagem horizontal em 360 px`, async ({ page }) => {
    await preparar(page);
    if (!nome.startsWith("T3")) await umH1(page);
    await semRolagemHorizontal(page);
  });
}

test.describe("zoom de 200% (viewport de 180 × 370)", () => {
  test.use({ viewport: { width: 180, height: 370 } });
  for (const [nome, preparar] of telas) {
    test(`${nome}: sem rolagem horizontal`, async ({ page }) => {
      await preparar(page);
      await semRolagemHorizontal(page);
    });
  }
});

test("fonte do sistema ampliada não causa rolagem horizontal", async ({ page }) => {
  await montarCombinar(page);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await semRolagemHorizontal(page);
});

test("alvos de toque têm pelo menos 44 × 44 px", async ({ page }) => {
  await montarCombinar(page);
  await page.getByRole("button", { name: "Adicionar fruta" }).scrollIntoViewIfNeeded();
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll("main button, main a, main select, main input:not(.sr-only), nav a, main label:has(input[type=radio])")]
      .map((el) => ({ el, caixa: el.getBoundingClientRect() }))
      .filter(({ caixa }) => caixa.width < 44 || caixa.height < 44)
      .map(({ el, caixa }) => `${el.tagName} "${el.textContent}" ${caixa.width}×${caixa.height}`),
  );
  expect(pequenos).toEqual([]);
});

test("Calcular é operável só com teclado", async ({ page }) => {
  await cadastrarBanana(page);
  await page.getByRole("tab", { name: "Substituir" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Complementar" })).toBeFocused();
  await expect(page.getByLabel("Gramas de Banana prata (g)")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Combinar" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Substituir" })).toBeFocused();
});

test("rádios Eu informo / Calcular funcionam pelo teclado", async ({ page }) => {
  await montarCombinar(page);
  await page.getByRole("radio", { name: "Eu informo" }).first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Calcular" }).first()).toBeChecked();
});

test("campo com erro em item da refeição é anunciado", async ({ page }) => {
  await montarCombinar(page);
  const campo = page.getByLabel("Gramas de Uva Itália (g)");
  await campo.fill("0");
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  await expect(campo).toHaveAccessibleDescription(/maior que 0/);
});

test("respeita prefers-reduced-motion", async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 360, height: 740 } });
  const page = await contexto.newPage();
  await page.goto("http://localhost:4173/");
  await page.getByRole("button", { name: /Fruta prescrita/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const animacao = await page.locator("dialog").evaluate((el) => getComputedStyle(el).animationName);
  expect(animacao).toBe("none");
  await contexto.close();
});

test("remover um item não perde o foco", async ({ page }) => {
  await montarCombinar(page);
  await page.getByRole("button", { name: "Remover Abacaxi" }).click();
  await expect(page.getByRole("button", { name: "Adicionar fruta" })).toBeFocused();
});

test("excluir uma prescrição não perde o foco", async ({ page }) => {
  await cadastrarBanana(page);
  await page.getByRole("link", { name: "Prescrições" }).click();
  await page.getByRole("button", { name: "Excluir Lanche" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Prescrições" })).toBeFocused();
});
