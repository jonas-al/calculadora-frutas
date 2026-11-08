"use client";

import { t } from "@/i18n/pt-BR";

export function FiltroDerivados({
  valor,
  onChange,
}: {
  valor: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2 font-semibold">
      <input
        type="checkbox"
        className="size-5 accent-primaria"
        checked={valor}
        onChange={(evento) => onChange(evento.target.checked)}
      />
      {t.frutas.derivados}
    </label>
  );
}
