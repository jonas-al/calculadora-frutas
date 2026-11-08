"use client";

import type { Fruta } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import { alternarFavoritoDe } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { botaoIcone } from "./estilos";
import { IconeEstrela } from "./Icones";

/** O estado vem de aria-pressed e o desenho muda (cheia/vazada), não só a cor. */
export function BotaoFavorito({ fruta }: { fruta: Fruta }) {
  const { dados } = useLoja();
  const favorita = dados.favoritos.includes(fruta.id);
  return (
    <button
      type="button"
      className={botaoIcone}
      aria-pressed={favorita}
      aria-label={t.frutas.favoritar(fruta.nomeExibicao)}
      onClick={() => alternarFavoritoDe(fruta.id)}
    >
      <IconeEstrela cheia={favorita} className="text-estrela" />
    </button>
  );
}
