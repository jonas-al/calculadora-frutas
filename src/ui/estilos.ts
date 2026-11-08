/** Classes compartilhadas. Alvos de toque: min-h-11 = 2,75rem = 44 px. */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold";

export const botaoPrimario = `${base} bg-primaria text-sobre-primaria`;
export const botaoSecundario = `${base} border border-borda bg-superficie text-texto`;
export const botaoPerigo = `${base} border border-alerta bg-superficie text-alerta`;
export const botaoIcone =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-texto";
export const campo =
  "min-h-11 w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-texto";
export const cartao = "rounded-xl border border-borda bg-superficie p-3";
export const rotulo = "mb-1 block font-semibold";
export const titulo = "text-2xl font-bold";
export const carregando = "text-suave";

/** Linhas pintadas de imediato; o restante da lista entra em segundo plano. */
export const LINHAS_INICIAIS = 16;
