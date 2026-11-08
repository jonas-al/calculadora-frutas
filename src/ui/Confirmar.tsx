"use client";

import { useId } from "react";
import { t } from "@/i18n/pt-BR";
import { Dialogo } from "./Dialogo";
import { botaoPerigo, botaoSecundario } from "./estilos";

export function Confirmar({
  mensagem,
  botaoConfirmar,
  onConfirmar,
  onCancelar,
}: {
  mensagem: string;
  botaoConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const id = useId();
  return (
    <Dialogo rotuloId={id} onFechar={onCancelar}>
      <p id={id} className="font-semibold">
        {mensagem}
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className={botaoSecundario} onClick={onCancelar}>
          {t.comum.cancelar}
        </button>
        <button type="button" className={botaoPerigo} onClick={onConfirmar}>
          {botaoConfirmar}
        </button>
      </div>
    </Dialogo>
  );
}
