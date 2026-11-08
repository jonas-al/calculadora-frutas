// Servidor estático mínimo para os testes: imita uma hospedagem estática sobre out/.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const RAIZ = path.resolve("out");
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

createServer((pedido, resposta) => {
  let caminho = path.join(RAIZ, decodeURIComponent(new URL(pedido.url, "http://x").pathname));
  if (existsSync(caminho) && statSync(caminho).isDirectory()) caminho = path.join(caminho, "index.html");
  if (!caminho.startsWith(RAIZ) || !existsSync(caminho)) {
    resposta.writeHead(404).end("Não encontrado");
    return;
  }
  resposta.writeHead(200, { "content-type": TIPOS[path.extname(caminho)] ?? "application/octet-stream" });
  createReadStream(caminho).pipe(resposta);
}).listen(4173);
