"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/i18n/pt-BR";
import { useLoja } from "@/storage/useLoja";
import { carregando, titulo } from "@/ui/estilos";
import { FormPrescricao } from "./FormPrescricao";

export function TelaNovaPrescricao() {
  const { carregado, dados } = useLoja();
  const router = useRouter();
  const parametros = useSearchParams();
  const id = parametros.get("id");
  const fruta = Number(parametros.get("fruta"));

  if (!carregado) {
    return (
      <>
        <h1 className={titulo}>{t.prescricao.tituloNova}</h1>
        <p className={carregando}>{t.app.carregando}</p>
      </>
    );
  }

  const inicial = dados.prescricoes.find((p) => p.id === id);
  return (
    <FormPrescricao
      key={inicial?.id ?? "nova"}
      titulo={inicial ? t.prescricao.tituloEditar : t.prescricao.tituloNova}
      inicial={inicial}
      frutaInicialId={Number.isInteger(fruta) ? fruta : undefined}
      onSalvo={() => router.push(inicial ? "/prescricoes/" : "/")}
    />
  );
}
