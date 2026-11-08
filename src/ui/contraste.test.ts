import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");

function tokens(bloco: string): Record<string, string> {
  return Object.fromEntries(
    [...bloco.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]),
  );
}

const claro = tokens(css.slice(css.indexOf(":root"), css.indexOf("@media")));
const escuro = tokens(css.slice(css.indexOf("@media"), css.indexOf("@theme")));

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

describe.each([
  ["claro", claro],
  ["escuro", escuro],
])("tema %s", (_, t) => {
  it.each([
    ["texto", "fundo"],
    ["texto", "superficie"],
    ["texto", "realce"],
    ["texto-suave", "fundo"],
    ["texto-suave", "superficie"],
    ["texto-suave", "realce"],
    ["primaria", "fundo"],
    ["primaria", "superficie"],
    ["primaria", "realce"],
    ["sobre-primaria", "primaria"],
    ["alerta", "alerta-fundo"],
    ["alerta", "superficie"],
    ["texto", "alerta-fundo"],
    ["estrela", "superficie"],
    ["estrela", "fundo"],
  ])("%s sobre %s ≥ 4,5:1", (frente, atras) => {
    expect(contraste(t[frente], t[atras])).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["borda", "fundo"],
    ["borda", "superficie"],
  ])("%s sobre %s ≥ 3:1", (frente, atras) => {
    expect(contraste(t[frente], t[atras])).toBeGreaterThanOrEqual(3);
  });
});
