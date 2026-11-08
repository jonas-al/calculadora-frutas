/**
 * Roda depois do build: gera out/sw.js com a lista de todos os arquivos publicados.
 * Cache-first: depois da 1ª visita o app não usa a rede (RP-08); um novo deploy muda
 * o nome do cache, e o navegador só baixa de novo ao atualizar o service worker.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");

function listar(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((item) => {
    const completo = path.join(diretorio, item.name);
    return item.isDirectory() ? listar(completo) : [completo];
  });
}

// Os arquivos __next.* só servem ao prefetch, que está desligado nos links.
const arquivos = listar(pasta).filter((arquivo) => {
  const nome = path.basename(arquivo);
  return nome !== "sw.js" && !nome.startsWith("__next.") && !arquivo.includes(`${path.sep}__next.`);
});
const hash = createHash("sha256");
for (const arquivo of arquivos) hash.update(readFileSync(arquivo));

const urls = arquivos.map((arquivo) => {
  const relativo = path.relative(pasta, arquivo).split(path.sep).join("/");
  return `/${relativo.replace(/(^|\/)index\.html$/, "$1")}`;
});

const sw = `const CACHE = "calcfrutas-${hash.digest("hex").slice(0, 12)}";
const URLS = ${JSON.stringify(urls)};

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const salvo = await cache.match(request, { ignoreSearch: true });
      if (salvo) return salvo;
      try {
        return await fetch(request);
      } catch (erro) {
        if (request.mode === "navigate") return cache.match("/");
        throw erro;
      }
    }),
  );
});
`;

writeFileSync(path.join(pasta, "sw.js"), sw);
console.log(`Service worker gerado com ${urls.length} arquivos.`);
