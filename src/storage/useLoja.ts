"use client";

import { useSyncExternalStore } from "react";
import { assinar, obterEstado, obterEstadoServidor } from "./loja";

/** Antes da hidratação devolve o estado vazio, com `carregado: false`. */
export function useLoja() {
  return useSyncExternalStore(assinar, obterEstado, obterEstadoServidor);
}
