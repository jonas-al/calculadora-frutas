import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaNovaPrescricao } from "@/features/prescricoes/TelaNovaPrescricao";
import { t } from "@/i18n/pt-BR";
import { carregando, titulo } from "@/ui/estilos";

export const metadata: Metadata = { title: t.prescricao.tituloNova };

export default function PaginaNovaPrescricao() {
  return (
    <Suspense
      fallback={
        <>
          <h1 className={titulo}>{t.prescricao.tituloNova}</h1>
          <p className={carregando}>{t.app.carregando}</p>
        </>
      }
    >
      <TelaNovaPrescricao />
    </Suspense>
  );
}
