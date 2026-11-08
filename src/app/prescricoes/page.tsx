import type { Metadata } from "next";
import { TelaPrescricoes } from "@/features/prescricoes/TelaPrescricoes";
import { t } from "@/i18n/pt-BR";

export const metadata: Metadata = { title: t.prescricoes.titulo };

export default function PaginaPrescricoes() {
  return <TelaPrescricoes />;
}
