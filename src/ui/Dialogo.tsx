"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/**
 * Modal sobre <dialog> nativo: prende o foco e fecha com Esc. Ao desmontar,
 * devolve o foco ao botão de origem, inclusive quando fechado por uma escolha.
 */
export function Dialogo({
  rotuloId,
  onFechar,
  focoInicial,
  folha = false,
  children,
}: {
  rotuloId: string;
  onFechar: () => void;
  focoInicial?: RefObject<HTMLElement | null>;
  folha?: boolean;
  children: ReactNode;
}) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    const origem = document.activeElement as HTMLElement | null;
    dialogo?.showModal();
    focoInicial?.current?.focus();
    return () => {
      dialogo?.close();
      origem?.focus();
    };
  }, [focoInicial]);

  return (
    <dialog
      ref={referencia}
      aria-labelledby={rotuloId}
      className={
        folha
          ? "folha rounded-t-2xl bg-superficie p-0 text-texto"
          : "m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl bg-superficie p-4 text-texto"
      }
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
      onClick={(evento) => {
        // Clique no fundo escurecido cai no próprio <dialog>.
        if (evento.target === referencia.current) onFechar();
      }}
    >
      {children}
    </dialog>
  );
}
