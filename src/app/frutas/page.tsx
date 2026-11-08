import type { Metadata } from "next";
import { TelaFrutas } from "@/features/frutas/TelaFrutas";
import { t } from "@/i18n/pt-BR";

export const metadata: Metadata = { title: t.frutas.titulo };

export default function PaginaFrutas() {
  return <TelaFrutas />;
}
