"use client";

import { useEffect, useState } from "react";

const ATRASO_MS = 500;

/** Região aria-live com debounce, para o leitor de tela não falar a cada tecla. */
export function Anunciador({ texto }: { texto: string }) {
  const [anunciado, setAnunciado] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setAnunciado(texto), ATRASO_MS);
    return () => clearTimeout(timer);
  }, [texto]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="anuncio">
      {anunciado}
    </div>
  );
}
