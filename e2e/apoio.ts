import { expect, type Page } from "@playwright/test";

export const CHAVE = "calcfrutas:v1";

export function frutaNaLista(page: Page, nome: string) {
  return page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${nome}`) });
}

export async function escolherFrutaNoSeletor(page: Page, nome: string) {
  await page.getByRole("dialog").getByLabel("Buscar fruta").fill(nome);
  await frutaNaLista(page, nome).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/** Primeiro acesso: 65 g de banana prata. */
export async function cadastrarBanana(page: Page, nome = "Lanche") {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Cadastre sua prescrição" })).toBeVisible();
  await page.getByRole("button", { name: /Fruta prescrita/ }).click();
  await escolherFrutaNoSeletor(page, "Banana prata");
  await page.getByLabel("Gramas prescritas (g)").fill("65");
  await page.getByLabel("Nome da refeição (opcional)").fill(nome);
  await page.getByRole("button", { name: "Salvar prescrição" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Calcular" })).toBeVisible();
}

export async function adicionarFruta(page: Page, nome: string) {
  await page.getByRole("button", { name: "Adicionar fruta" }).click();
  await escolherFrutaNoSeletor(page, nome);
}

export function itemDaRefeicao(page: Page, nome: string) {
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: nome, exact: true }) });
}

export async function anuncio(page: Page) {
  return page.getByTestId("anuncio");
}
