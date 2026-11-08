"use client";

import { useId, useRef, useState } from "react";
import { frutasVisiveis, obterFruta } from "@/data/frutas";
import { podeSerCalculada } from "@/domain/calculo";
import { formatarKcal } from "@/domain/formato";
import { buscarFrutas, ordenarAlfabetica, type Fruta } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import { definirMostrarDerivados } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Dialogo } from "@/ui/Dialogo";
import { botaoIcone, campo, rotulo } from "@/ui/estilos";
import { IconeFechar } from "@/ui/Icones";
import { FiltroDerivados } from "./FiltroDerivados";

function Secao({
  titulo,
  frutas,
  onEscolher,
}: {
  titulo: string;
  frutas: Fruta[];
  onEscolher: (fruta: Fruta) => void;
}) {
  if (frutas.length === 0) return null;
  return (
    <section>
      <h3 className="px-4 pt-3 pb-1 font-bold text-suave">{titulo}</h3>
      <ul>
        {frutas.map((fruta) => (
          <li key={fruta.id}>
            <button
              type="button"
              className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 px-4 py-2 text-left"
              onClick={() => onEscolher(fruta)}
            >
              <span className="font-semibold">{fruta.nomeExibicao}</span>
              <span className="text-suave">{t.comum.kcal100(formatarKcal(fruta.kcal as number))}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** T3: bottom sheet. Só oferece frutas com kcal, pois o resultado sempre entra em um cálculo. */
export function SeletorFruta({
  onEscolher,
  onFechar,
}: {
  onEscolher: (fruta: Fruta) => void;
  onFechar: () => void;
}) {
  const { dados } = useLoja();
  const [consulta, setConsulta] = useState("");
  const idTitulo = useId();
  const idBusca = useId();
  const busca = useRef<HTMLInputElement>(null);
  const { mostrarDerivados } = dados.preferencias;

  const disponiveis = frutasVisiveis(mostrarDerivados).filter(podeSerCalculada);
  const resultados = ordenarAlfabetica(buscarFrutas(disponiveis, consulta));

  const porIds = (ids: number[]) =>
    ids
      .map(obterFruta)
      .filter((f): f is Fruta => f !== undefined && disponiveis.includes(f));

  const buscando = consulta.trim() !== "";

  return (
    <Dialogo rotuloId={idTitulo} onFechar={onFechar} focoInicial={busca} folha>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-borda bg-superficie p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={idTitulo} className="text-xl font-bold">
              {t.calcular.adicionarTitulo}
            </h2>
            <button
              type="button"
              className={botaoIcone}
              aria-label={t.comum.fechar}
              onClick={onFechar}
            >
              <IconeFechar />
            </button>
          </div>
          <div>
            <label htmlFor={idBusca} className={rotulo}>
              {t.frutas.buscar}
            </label>
            <input
              ref={busca}
              id={idBusca}
              type="search"
              autoComplete="off"
              className={campo}
              value={consulta}
              onChange={(evento) => setConsulta(evento.target.value)}
            />
          </div>
          <FiltroDerivados valor={mostrarDerivados} onChange={definirMostrarDerivados} />
        </div>
        <div className="pb-4" role="status">
          {resultados.length === 0 && (
            <p className="p-4 font-semibold">{t.frutas.nenhuma}</p>
          )}
        </div>
        <div className="pb-4">
          {!buscando && (
            <>
              <Secao
                titulo={t.frutas.favoritas}
                frutas={porIds(dados.favoritos)}
                onEscolher={onEscolher}
              />
              <Secao
                titulo={t.frutas.recentes}
                frutas={porIds(dados.recentes)}
                onEscolher={onEscolher}
              />
            </>
          )}
          <Secao titulo={t.frutas.todasAZ} frutas={resultados} onEscolher={onEscolher} />
        </div>
      </div>
    </Dialogo>
  );
}
