"use client";

import { t } from "@/i18n/pt-BR";
import { dispensarAvisoArmazenamento } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { botaoSecundario } from "./estilos";
import { IconeAlerta } from "./Icones";

/** RP-05. A região existe desde o início para o leitor de tela anunciar a mudança. */
export function AvisoArmazenamento() {
  const { avisoArmazenamento } = useLoja();
  return (
    <div role="status">
      {avisoArmazenamento && (
        <div className="flex flex-wrap items-center gap-2 bg-alerta-fundo p-3 text-texto">
          <IconeAlerta className="text-alerta" />
          <p className="min-w-0 flex-1">{t.armazenamento.falha}</p>
          <button type="button" className={botaoSecundario} onClick={dispensarAvisoArmazenamento}>
            {t.comum.entendi}
          </button>
        </div>
      )}
    </div>
  );
}
