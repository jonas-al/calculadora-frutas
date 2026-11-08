import Link from "next/link";
import { t } from "@/i18n/pt-BR";
import { botaoSecundario, titulo } from "@/ui/estilos";

export default function NaoEncontrada() {
  return (
    <>
      <h1 className={titulo}>{t.detalhe.naoEncontrada}</h1>
      <Link prefetch={false} href="/frutas/" className={botaoSecundario}>
        {t.detalhe.voltarLista}
      </Link>
    </>
  );
}
