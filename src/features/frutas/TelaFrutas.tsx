"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { frutasVisiveis, obterFruta } from "@/data/frutas";
import { formatarKcal } from "@/domain/formato";
import { buscarFrutas, ordenarPadrao, type Fruta } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import { definirMostrarDerivados, limparRecentes } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Abas } from "@/ui/Abas";
import { BotaoFavorito } from "@/ui/BotaoFavorito";
import { Confirmar } from "@/ui/Confirmar";
import { botaoSecundario, campo, cartao, LINHAS_INICIAIS, rotulo, titulo } from "@/ui/estilos";
import { LinkInfo } from "@/ui/LinkInfo";
import { FiltroDerivados } from "./FiltroDerivados";

type AbaFrutas = "todas" | "favoritas" | "recentes";

function LinhaFruta({ fruta }: { fruta: Fruta }) {
  return (
    <li className={`${cartao} flex flex-wrap items-center gap-1`}>
      <div className="min-w-32 flex-1">
        <Link prefetch={false} href={`/frutas/${fruta.id}/`} className="inline-flex min-h-11 items-center font-semibold underline">
          {fruta.nomeExibicao}
        </Link>
        <p className="text-sm text-suave">
          {fruta.kcal === null
            ? t.detalhe.naoAnalisado
            : t.comum.kcal100(formatarKcal(fruta.kcal))}
        </p>
      </div>
      <BotaoFavorito fruta={fruta} />
      <LinkInfo fruta={fruta} />
    </li>
  );
}

/** T4: catálogo. */
export function TelaFrutas() {
  const { dados } = useLoja();
  const [aba, setAba] = useState<AbaFrutas>("todas");
  const [consulta, setConsulta] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const idBusca = useId();
  const { mostrarDerivados } = dados.preferencias;

  const lista = useMemo(() => {
    const visiveis = frutasVisiveis(mostrarDerivados);
    const encontradas = buscarFrutas(visiveis, consulta);
    if (aba === "favoritas") {
      return ordenarPadrao(
        encontradas.filter((f) => dados.favoritos.includes(f.id)),
        [],
        dados.recentes,
      );
    }
    if (aba === "recentes") {
      return dados.recentes
        .map(obterFruta)
        .filter((f): f is Fruta => f !== undefined && encontradas.includes(f));
    }
    return ordenarPadrao(encontradas, dados.favoritos, dados.recentes);
  }, [aba, consulta, mostrarDerivados, dados.favoritos, dados.recentes]);

  // As primeiras linhas saem no HTML estático; as demais não travam a tela ao carregar.
  const linhas = useDeferredValue(lista, lista.slice(0, LINHAS_INICIAIS));

  const vazioDaAba =
    consulta.trim() === "" && aba === "favoritas"
      ? t.frutas.favoritasVazio
      : consulta.trim() === "" && aba === "recentes"
        ? t.frutas.recentesVazio
        : t.frutas.nenhuma;

  return (
    <>
      <h1 className={titulo}>{t.frutas.titulo}</h1>
      <Abas
        rotulo={t.frutas.abas}
        prefixo="frutas"
        ativa={aba}
        onChange={setAba}
        abas={[
          { id: "todas", rotulo: t.frutas.todas },
          { id: "favoritas", rotulo: t.frutas.favoritas },
          { id: "recentes", rotulo: t.frutas.recentes },
        ]}
      />
      <div
        id="frutas-painel"
        role="tabpanel"
        aria-labelledby={`frutas-aba-${aba}`}
        className="flex flex-col gap-3"
      >
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
        <FiltroDerivados valor={mostrarDerivados} onChange={definirMostrarDerivados} />
        {aba === "recentes" && dados.recentes.length > 0 && (
          <button
            type="button"
            className={botaoSecundario}
            onClick={() => setConfirmando(true)}
          >
            {t.frutas.limparRecentes}
          </button>
        )}
        <div role="status">
          {lista.length === 0 && <p className="font-semibold">{vazioDaAba}</p>}
        </div>
        {lista.length === 0 && aba !== "todas" && (
          <button type="button" className={botaoSecundario} onClick={() => setAba("todas")}>
            {t.frutas.verTodas}
          </button>
        )}
        {lista.length > 0 && (
          <ul className="flex flex-col gap-2">
            {linhas.map((fruta) => (
              <LinhaFruta key={fruta.id} fruta={fruta} />
            ))}
          </ul>
        )}
      </div>
      {confirmando && (
        <Confirmar
          mensagem={t.frutas.limparConfirmar}
          botaoConfirmar={t.frutas.limparConfirmarBotao}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            limparRecentes();
            setConfirmando(false);
          }}
        />
      )}
    </>
  );
}
