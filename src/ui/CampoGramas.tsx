"use client";

import { useId, type Ref } from "react";
import { campo, rotulo as classeRotulo } from "./estilos";

/** Campo numérico com rótulo visível e erro ligado por aria-describedby. */
export function CampoGramas({
  rotulo,
  valor,
  erro,
  onChange,
  inputRef,
}: {
  rotulo: string;
  valor: string;
  erro?: string;
  onChange: (texto: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div>
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={campo}
        value={valor}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        onChange={(evento) => onChange(evento.target.value)}
      />
      {erro && (
        <p id={idErro} className="mt-1 font-semibold text-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
