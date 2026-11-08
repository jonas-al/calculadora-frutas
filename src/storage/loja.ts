/**
 * Estado do app fora do React, consumido com useSyncExternalStore.
 * Mantém os dados em memória e grava com debounce (RP-04); se a gravação falhar,
 * segue em memória e sinaliza o aviso de RP-05 uma única vez.
 */
import { energia } from "@/domain/calculo";
import {
  adicionarRecente,
  alternarFavorito,
  LIMITE_ITENS,
  type Ordenacao,
} from "@/domain/frutas";
import { existeFruta, obterFruta } from "@/data/frutas";
import {
  apagarTudo,
  carregar,
  dadosIniciais,
  salvar,
  type Dados,
  type ItemComposicao,
  type ModoCalculo,
  type Prescricao,
} from "./armazenamento";

export const DEBOUNCE_SALVAR_MS = 300;

/** Item em uso na tela; `chave` é só de sessão e não vai para o armazenamento. */
export type ItemEmUso = ItemComposicao & { chave: string };

export type EstadoLoja = {
  carregado: boolean;
  dados: Dados;
  itens: ItemEmUso[];
  modo: ModoCalculo;
  avisoArmazenamento: boolean;
};

const ESTADO_SERVIDOR: EstadoLoja = {
  carregado: false,
  dados: dadosIniciais(),
  itens: [],
  modo: "substituir",
  avisoArmazenamento: false,
};

let estado = ESTADO_SERVIDOR;
let timerSalvar: ReturnType<typeof setTimeout> | null = null;
let avisoJaMostrado = false;
let contadorChaves = 0;
const ouvintes = new Set<() => void>();

const novaChave = () => `item-${++contadorChaves}`;
const comChaves = (itens: ItemComposicao[]): ItemEmUso[] =>
  itens.map((item) => ({ ...item, chave: novaChave() }));

function emitir() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function sinalizarFalha() {
  if (avisoJaMostrado) return;
  avisoJaMostrado = true;
  estado = { ...estado, avisoArmazenamento: true };
  emitir();
}

function comporDados(atual: EstadoLoja): Dados {
  const ativaId = atual.dados.prescricaoAtivaId;
  return {
    ...atual.dados,
    ultimaComposicao: ativaId
      ? {
          prescricaoId: ativaId,
          modo: atual.modo,
          itens: atual.itens.map(({ frutaId, tipo, gramas }) =>
            gramas === undefined ? { frutaId, tipo } : { frutaId, tipo, gramas },
          ),
        }
      : null,
  };
}

/** Grava pendências agora; usado ao sair da página para não perder a última tecla. */
export function salvarAgora() {
  if (timerSalvar === null) return;
  clearTimeout(timerSalvar);
  timerSalvar = null;
  if (!salvar(comporDados(estado))) sinalizarFalha();
}

function agendarSalvamento() {
  if (timerSalvar !== null) clearTimeout(timerSalvar);
  timerSalvar = setTimeout(salvarAgora, DEBOUNCE_SALVAR_MS);
}

function atualizar(mudanca: Partial<EstadoLoja>) {
  estado = { ...estado, ...mudanca };
  emitir();
  agendarSalvamento();
}

function atualizarDados(mudanca: Partial<Dados>) {
  atualizar({ dados: { ...estado.dados, ...mudanca } });
}

function inicializar() {
  if (estado.carregado) return;
  const { dados, falhou } = carregar(existeFruta);
  const composicao = dados.ultimaComposicao;
  const valeParaAtiva = composicao?.prescricaoId === dados.prescricaoAtivaId;
  estado = {
    ...estado,
    carregado: true,
    dados,
    modo: valeParaAtiva ? composicao!.modo : "substituir",
    itens: valeParaAtiva ? comChaves(composicao!.itens) : [],
  };
  if (falhou) sinalizarFalha();
  window.addEventListener("pagehide", salvarAgora);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") salvarAgora();
  });
}

export function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function obterEstado(): EstadoLoja {
  if (typeof window !== "undefined") inicializar();
  return estado;
}

export const obterEstadoServidor = (): EstadoLoja => ESTADO_SERVIDOR;

/** Só para testes: volta ao estado de antes da primeira leitura. */
export function reiniciarLoja() {
  if (timerSalvar !== null) clearTimeout(timerSalvar);
  timerSalvar = null;
  avisoJaMostrado = false;
  estado = ESTADO_SERVIDOR;
}

export function dispensarAvisoArmazenamento() {
  estado = { ...estado, avisoArmazenamento: false };
  emitir();
}

export function kcalDaPrescricao(prescricao: Pick<Prescricao, "frutaId" | "gramas">): number {
  return energia(prescricao.gramas, obterFruta(prescricao.frutaId)?.kcal ?? 0);
}

// ---- Prescrições ------------------------------------------------------------

export function salvarPrescricao(entrada: {
  id?: string;
  nome: string;
  frutaId: number;
  gramas: number;
}) {
  const { prescricoes } = estado.dados;
  if (entrada.id) {
    const mudouMeta = prescricoes.some(
      (p) =>
        p.id === entrada.id && (p.frutaId !== entrada.frutaId || p.gramas !== entrada.gramas),
    );
    atualizarDados({
      prescricoes: prescricoes.map((p) =>
        p.id === entrada.id
          ? { ...p, nome: entrada.nome, frutaId: entrada.frutaId, gramas: entrada.gramas }
          : p,
      ),
    });
    if (mudouMeta && estado.dados.prescricaoAtivaId === entrada.id) {
      atualizar({ itens: [], modo: "substituir" });
    }
    return entrada.id;
  }
  const id = crypto.randomUUID();
  const nova: Prescricao = {
    id,
    nome: entrada.nome,
    frutaId: entrada.frutaId,
    gramas: entrada.gramas,
    criadaEm: new Date().toISOString(),
  };
  atualizar({
    dados: { ...estado.dados, prescricoes: [...prescricoes, nova], prescricaoAtivaId: id },
    itens: [],
    modo: "substituir",
  });
  return id;
}

export function escolherPrescricao(id: string) {
  if (id === estado.dados.prescricaoAtivaId) return;
  atualizar({
    dados: { ...estado.dados, prescricaoAtivaId: id },
    itens: [],
    modo: "substituir",
  });
}

export function renomearPrescricao(id: string, nome: string) {
  atualizarDados({
    prescricoes: estado.dados.prescricoes.map((p) => (p.id === id ? { ...p, nome } : p)),
  });
}

export function excluirPrescricao(id: string) {
  const prescricoes = estado.dados.prescricoes.filter((p) => p.id !== id);
  if (estado.dados.prescricaoAtivaId !== id) {
    atualizarDados({ prescricoes });
    return;
  }
  atualizar({
    dados: { ...estado.dados, prescricoes, prescricaoAtivaId: prescricoes[0]?.id ?? null },
    itens: [],
    modo: "substituir",
  });
}

// ---- Favoritos, recentes e preferências --------------------------------------

export function alternarFavoritoDe(id: number) {
  atualizarDados({ favoritos: alternarFavorito(estado.dados.favoritos, id) });
}

export function registrarRecente(id: number) {
  if (estado.dados.recentes[0] === id) return;
  atualizarDados({ recentes: adicionarRecente(estado.dados.recentes, id) });
}

export function limparRecentes() {
  atualizarDados({ recentes: [] });
}

export function definirMostrarDerivados(mostrarDerivados: boolean) {
  atualizarDados({ preferencias: { ...estado.dados.preferencias, mostrarDerivados } });
}

export function definirOrdenacao(ordenacao: Ordenacao) {
  atualizarDados({ preferencias: { ...estado.dados.preferencias, ordenacao } });
}

// ---- Composição -------------------------------------------------------------

export function definirModo(modo: ModoCalculo) {
  const ativa = estado.dados.prescricoes.find((p) => p.id === estado.dados.prescricaoAtivaId);
  const precisaSemear =
    modo === "complementar" &&
    ativa &&
    !estado.itens.some((item) => item.frutaId === ativa.frutaId);
  if (!precisaSemear || estado.itens.length >= LIMITE_ITENS) {
    atualizar({ modo });
    return;
  }
  // RF-03: Complementar abre com a fruta prescrita como item fixo.
  atualizar({
    modo,
    itens: [
      { frutaId: ativa.frutaId, tipo: "fixo", chave: novaChave() },
      ...estado.itens,
    ],
  });
}

export function adicionarItem(frutaId: number, tipoForcado?: ItemEmUso["tipo"]) {
  const tipo =
    tipoForcado ?? (estado.itens.some((item) => item.tipo === "fixo") ? "calculado" : "fixo");
  registrarRecente(frutaId);
  atualizar({ itens: [...estado.itens, { frutaId, tipo, chave: novaChave() }] });
}

export function removerItem(chave: string) {
  atualizar({ itens: estado.itens.filter((item) => item.chave !== chave) });
}

export function definirTipoItem(chave: string, tipo: ItemEmUso["tipo"]) {
  atualizar({
    itens: estado.itens.map((item) =>
      item.chave === chave ? { frutaId: item.frutaId, tipo, chave, gramas: item.gramas } : item,
    ),
  });
}

export function definirGramasItem(chave: string, gramas: number | undefined) {
  const item = estado.itens.find((i) => i.chave === chave);
  if (item && gramas !== undefined) registrarRecente(item.frutaId);
  atualizar({
    itens: estado.itens.map((i) => (i.chave === chave ? { ...i, gramas } : i)),
  });
}

export function apagarMeusDados(): boolean {
  if (timerSalvar !== null) clearTimeout(timerSalvar);
  timerSalvar = null;
  const removido = apagarTudo();
  estado = {
    ...ESTADO_SERVIDOR,
    carregado: true,
    dados: dadosIniciais(),
    avisoArmazenamento: false,
  };
  emitir();
  return removido;
}
