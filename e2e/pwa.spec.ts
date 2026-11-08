import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { adicionarFruta, cadastrarBanana, CHAVE, itemDaRefeicao } from "./apoio";

test("manifest instalável", async ({ request }) => {
  const manifesto = await (await request.get("/manifest.webmanifest")).json();
  expect(manifesto).toMatchObject({ lang: "pt-BR", display: "standalone", start_url: "/" });
  expect(manifesto.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
});

test("funciona offline depois da 1ª visita, incluindo navegação e recarga", async ({ page, context }) => {
  await cadastrarBanana(page);
  await page.waitForFunction(async () => {
    const registro = await navigator.serviceWorker.ready;
    return registro.active?.state === "activated" && navigator.serviceWorker.controller !== null;
  });
  await page.waitForFunction((c) => localStorage.getItem(c) !== null, CHAVE);

  await context.setOffline(true);

  await page.reload();
  await expect(itemDaRefeicao(page, "Abacaxi")).toContainText("133 g");

  await page.getByRole("link", { name: "Frutas" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Frutas" })).toBeVisible();
  await page.getByRole("link", { name: "Uva Itália", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Uva Itália" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Uva Itália" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("tab", { name: "Combinar" }).click();
  await adicionarFruta(page, "Abacaxi");
  await expect(itemDaRefeicao(page, "Abacaxi")).toBeVisible();
});

test("RP-08 — nenhuma requisição para fora do site e sem cookies", async ({ page, context }) => {
  const externas: string[] = [];
  page.on("request", (pedido) => {
    if (!pedido.url().startsWith("http://localhost:4173")) externas.push(pedido.url());
  });
  await cadastrarBanana(page);
  await page.getByRole("link", { name: "Frutas" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Frutas" })).toBeVisible();
  expect(externas).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("JS inicial ≤ 150 KB gzip (scripts nomodule não são baixados por navegadores atuais)", () => {
  for (const pagina of ["out/index.html", "out/frutas/index.html", "out/prescricoes/index.html"]) {
    const html = readFileSync(pagina, "utf8");
    const scripts = new Set(
      [...html.matchAll(/<script[^>]*>/g)]
        .map(([tag]) => tag)
        .filter((tag) => !/nomodule/i.test(tag))
        .flatMap((tag) => tag.match(/src="(\/_next\/[^"]+\.js)"/)?.[1] ?? []),
    );
    const total = [...scripts].reduce(
      (soma, script) => soma + gzipSync(readFileSync(`out${script}`)).length,
      0,
    );
    expect(scripts.size).toBeGreaterThan(0);
    console.log(pagina, (total / 1024).toFixed(1), "KB");
    expect(total).toBeLessThanOrEqual(150 * 1024);
  }
});
