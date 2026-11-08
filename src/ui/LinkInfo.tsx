import Link from "next/link";
import type { Fruta } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import { botaoIcone } from "./estilos";
import { IconeInfo } from "./Icones";

export function LinkInfo({ fruta }: { fruta: Fruta }) {
  return (
    <Link prefetch={false}
      href={`/frutas/${fruta.id}/`}
      className={botaoIcone}
      aria-label={t.frutas.info(fruta.nomeExibicao)}
    >
      <IconeInfo />
    </Link>
  );
}
