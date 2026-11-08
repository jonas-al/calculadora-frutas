"use client";

import { useRef, type KeyboardEvent } from "react";

export type Aba<T extends string> = { id: T; rotulo: string };

/** Abas segmentadas no padrão ARIA: setas, Home e End movem entre as abas. */
export function Abas<T extends string>({
  rotulo,
  abas,
  ativa,
  prefixo,
  onChange,
}: {
  rotulo: string;
  abas: Aba<T>[];
  ativa: T;
  prefixo: string;
  onChange: (id: T) => void;
}) {
  const lista = useRef<HTMLDivElement>(null);

  function aoTeclar(evento: KeyboardEvent) {
    const atual = abas.findIndex((aba) => aba.id === ativa);
    const destinos: Record<string, number> = {
      ArrowRight: (atual + 1) % abas.length,
      ArrowLeft: (atual - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    onChange(abas[destino].id);
    lista.current?.querySelectorAll<HTMLElement>('[role="tab"]')[destino]?.focus();
  }

  return (
    <div
      ref={lista}
      role="tablist"
      aria-label={rotulo}
      onKeyDown={aoTeclar}
      className="flex flex-wrap gap-1 rounded-xl border border-borda bg-superficie p-1"
    >
      {abas.map((aba) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            type="button"
            role="tab"
            id={`${prefixo}-aba-${aba.id}`}
            aria-selected={selecionada}
            aria-controls={`${prefixo}-painel`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(aba.id)}
            className={`min-h-11 flex-auto rounded-lg px-2 font-semibold [overflow-wrap:normal] ${
              selecionada
                ? "bg-primaria text-sobre-primaria underline underline-offset-4"
                : "text-texto"
            }`}
          >
            {aba.rotulo}
          </button>
        );
      })}
    </div>
  );
}
