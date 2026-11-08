/**
 * Roda antes do build: repete o teste de sanidade e impede publicar o fixture.
 * PERMITIR_DADOS_DE_TESTE=1 libera o fixture apenas para os testes E2E.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testeSanidade, type Dataset } from "./import-taco.ts";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(
  readFileSync(path.join(raiz, "src/data/frutas-taco.json"), "utf8"),
) as Dataset;

const erros = testeSanidade(dataset.frutas);
if (dataset.meta.fixture && process.env.PERMITIR_DADOS_DE_TESTE !== "1") {
  erros.push(
    "src/data/frutas-taco.json veio do fixture de teste, não da TACO. " +
      "Coloque a planilha oficial em data/raw/ e rode npm run import-taco.",
  );
}

if (erros.length > 0) {
  console.error(`Dados inválidos:\n- ${erros.join("\n- ")}`);
  process.exit(1);
}
console.log(`Dados OK: ${dataset.frutas.length} frutas (${dataset.meta.edicao}).`);
