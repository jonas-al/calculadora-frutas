"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { frutasVisiveis } from "@/data/frutas";
import { formatarGramas, formatarKcal } from "@/domain/formato";
import { buscarFrutas, listarEquivalentes, type Ordenacao } from "@/domain/frutas";
import { FiltroDerivados } from "@/features/frutas/FiltroDerivados";
import { t } from "@/i18n/pt-BR";
import { definirMostrarDerivados, definirOrdenacao } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Anunciador } from "@/ui/Anunciador";
import { BotaoFavorito } from "@/ui/BotaoFavorito";
import { campo, cartao, LINHAS_INICIAIS, rotulo } from "@/ui/estilos";
import { LinkInfo } from "@/ui/LinkInfo";
import { ResumoRefeicao } from "./ResumoRefeicao";

/** RF-02. */
export function PainelSubstituir({
  meta,
  frutaPrescritaId,
}: {
  meta: number;
  frutaPrescritaId: number;
}) {
  const { dados } = useLoja();
  const { mostrarDerivados, ordenacao } = dados.preferencias;
  const [consulta, setConsulta] = useState("");
  const idBusca = useId();
  const idOrdem = useId();

  const lista = useMemo(
    () =>
      listarEquivalentes({
        frutas: buscarFrutas(frutasVisiveis(mostrarDerivados), consulta),
        meta,
        frutaPrescritaId,
        ordenacao,
        favoritos: dados.favoritos,
        recentes: dados.recentes,
      }),
    [mostrarDerivados, consulta, meta, frutaPrescritaId, ordenacao, dados.favoritos, dados.recentes],
  );

  const linhas = useDeferredValue(lista, lista.slice(0, LINHAS_INICIAIS));

  return (
    <>
      <div>
        <label htmlFor={idBusca} className={rotulo}>
          {t.frutas.buscar}
        </label>
        <input
          id={idBusca}
          type="search"
          autoComplete="off"
          className={campo}
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
        />
      </div>
      <div>
        <label htmlFor={idOrdem} className={rotulo}>
          {t.calcular.ordenar}
        </label>
        <select
          id={idOrdem}
          className={campo}
          value={ordenacao}
          onChange={(evento) => definirOrdenacao(evento.target.value as Ordenacao)}
        >
          <option value="padrao">{t.calcular.ordemPadrao}</option>
          <option value="menos-gramas">{t.calcular.ordemMenos}</option>
          <option value="mais-gramas">{t.calcular.ordemMais}</option>
        </select>
      </div>
      <FiltroDerivados valor={mostrarDerivados} onChange={definirMostrarDerivados} />
      <Anunciador
        texto={lista.length === 0 ? t.frutas.nenhuma : t.calcular.quantidadeFrutas(lista.length)}
      />
      {lista.length === 0 ? (
        <p className="font-semibold">{t.frutas.nenhuma}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map(({ fruta, gramas }) => (
            <li key={fruta.id} className={`${cartao} flex flex-wrap items-center gap-1`}>
              <div className="min-w-32 flex-1">
                <Link prefetch={false}
                  href={`/frutas/${fruta.id}/`}
                  className="inline-flex min-h-11 items-center font-semibold underline"
                >
                  {fruta.nomeExibicao}
                </Link>
                <p className="text-sm text-suave">
                  {t.comum.kcal100(formatarKcal(fruta.kcal as number))}
                </p>
              </div>
              <strong className="px-2 text-xl whitespace-nowrap">{`${formatarGramas(gramas)} g`}</strong>
              <BotaoFavorito fruta={fruta} />
              <LinkInfo fruta={fruta} />
            </li>
          ))}
        </ul>
      )}
      <ResumoRefeicao meta={meta} />
    </>
  );
}
