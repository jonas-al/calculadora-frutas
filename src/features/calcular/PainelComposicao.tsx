"use client";

import Link from "next/link";
import { lazy, Suspense, useId, useRef, useState } from "react";
import { obterFruta } from "@/data/frutas";
import {
  calcularComposicao,
  interpretarGramas,
  podeSerCalculada,
  type ItemResultado,
  type ResultadoComposicao,
} from "@/domain/calculo";
import { formatarGramas, formatarGramasInformadas, formatarKcal } from "@/domain/formato";
import { LIMITE_ITENS } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import type { ModoCalculo } from "@/storage/armazenamento";
import {
  adicionarItem,
  definirGramasItem,
  definirTipoItem,
  removerItem,
  type ItemEmUso,
} from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Anunciador } from "@/ui/Anunciador";
import { CampoGramas } from "@/ui/CampoGramas";
import { botaoIcone, botaoSecundario, cartao } from "@/ui/estilos";
import { IconeCheck, IconeLixeira, IconeMais } from "@/ui/Icones";
import { LinkInfo } from "@/ui/LinkInfo";
import { ResumoRefeicao } from "./ResumoRefeicao";

const SeletorFruta = lazy(() =>
  import("@/features/frutas/SeletorFruta").then((modulo) => ({ default: modulo.SeletorFruta })),
);

function nomeDe(frutaId: number): string {
  return obterFruta(frutaId)?.nomeExibicao ?? "";
}

function minusculaInicial(nome: string): string {
  return nome.charAt(0).toLocaleLowerCase("pt-BR") + nome.slice(1);
}

function SeletorTipo({ item, nome }: { item: ItemEmUso; nome: string }) {
  const grupo = useId();
  const calculavel = podeSerCalculada({ kcal: obterFruta(item.frutaId)?.kcal ?? null });
  const opcoes = [
    { tipo: "fixo", rotulo: t.calcular.euInformo, desabilitado: false },
    { tipo: "calculado", rotulo: t.calcular.calcular, desabilitado: !calculavel },
  ] as const;
  return (
    <fieldset className="flex flex-wrap gap-1">
      <legend className="sr-only">{t.calcular.comoDefinir(nome)}</legend>
      {opcoes.map(({ tipo, rotulo, desabilitado }) => {
        const marcado = item.tipo === tipo;
        return (
          <label
            key={tipo}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-borda px-2 font-semibold has-focus-visible:outline-3 has-focus-visible:outline-primaria ${
              marcado ? "bg-realce" : ""
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name={grupo}
              checked={marcado}
              disabled={desabilitado}
              onChange={() => definirTipoItem(item.chave, tipo)}
            />
            {marcado && <IconeCheck className="size-5" />}
            {rotulo}
          </label>
        );
      })}
    </fieldset>
  );
}

function GramasFixas({ item, nome }: { item: ItemEmUso; nome: string }) {
  const [texto, setTexto] = useState(
    item.gramas === undefined ? "" : formatarGramasInformadas(item.gramas).replace(/\./g, ""),
  );
  const interpretado = interpretarGramas(texto);
  return (
    <CampoGramas
      rotulo={t.calcular.gramasItem(nome)}
      valor={texto}
      erro={interpretado.estado === "invalido" ? t.gramas.erro : undefined}
      onChange={(novo) => {
        setTexto(novo);
        const lido = interpretarGramas(novo);
        definirGramasItem(item.chave, lido.estado === "valido" ? lido.valor : undefined);
      }}
    />
  );
}

function LinhaItem({
  item,
  resultado,
  podeCalcular,
  onRemover,
}: {
  item: ItemEmUso;
  resultado: ItemResultado;
  podeCalcular: boolean;
  onRemover: () => void;
}) {
  const fruta = obterFruta(item.frutaId);
  const nome = fruta?.nomeExibicao ?? "";
  return (
    <li className={`${cartao} flex flex-col gap-2`}>
      <div className="flex flex-wrap items-center gap-1">
        <Link prefetch={false}
          href={`/frutas/${item.frutaId}/`}
          className="inline-flex min-h-11 min-w-0 flex-1 items-center font-semibold underline"
        >
          {nome}
        </Link>
        {fruta && <LinkInfo fruta={fruta} />}
        <button
          type="button"
          className={botaoIcone}
          aria-label={t.calcular.remover(nome)}
          onClick={onRemover}
        >
          <IconeLixeira />
        </button>
      </div>
      <SeletorTipo item={item} nome={nome} />
      {item.tipo === "fixo" ? (
        <GramasFixas item={item} nome={nome} />
      ) : !podeCalcular ? (
        <p>{t.calcular.semKcal}</p>
      ) : (
        <p>
          {t.calcular.gramasCalculadas}{" "}
          <strong className="text-xl">
            {resultado.gramasExibidas === null
              ? t.calcular.naoCalculado
              : `${formatarGramas(resultado.gramasExibidas)} g`}
          </strong>
        </p>
      )}
      {resultado.gramasExibidas !== null && (
        <p className="text-suave">
          {t.calcular.kcalItem(
            formatarKcal(((resultado.gramasExibidas ?? 0) * (fruta?.kcal ?? 0)) / 100),
          )}
        </p>
      )}
    </li>
  );
}

function descreverFaltante(itens: ItemEmUso[], resultado: ResultadoComposicao): string | null {
  const calculados = itens.flatMap((item, i) => {
    const gramas = resultado.itens[i].gramasExibidas;
    return item.tipo === "calculado" && gramas !== null
      ? [t.calcular.gramasDe(formatarGramas(gramas), minusculaInicial(nomeDe(item.frutaId)))]
      : [];
  });
  if (resultado.saldoFixos <= 0 || calculados.length === 0) return null;
  return t.calcular.falta(formatarKcal(resultado.saldoFixos), calculados.join(t.calcular.e));
}

function montarAnuncio(itens: ItemEmUso[], resultado: ResultadoComposicao): string {
  if (resultado.excesso) {
    const { kcal, gramasRemover, indiceItem } = resultado.excesso;
    return t.anuncio.excesso(
      formatarKcal(kcal),
      formatarGramas(gramasRemover),
      nomeDe(itens[indiceItem].frutaId),
    );
  }
  if (resultado.estado === "meta-atingida") return t.anuncio.metaAtingida;
  const calculados = itens.flatMap((item, i) => {
    const gramas = resultado.itens[i].gramasExibidas;
    return item.tipo === "calculado" && gramas !== null
      ? [t.anuncio.item(nomeDe(item.frutaId), formatarGramas(gramas))]
      : [];
  });
  const saldo =
    resultado.saldoFinal === 0
      ? t.anuncio.saldoZero
      : t.anuncio.saldo(formatarKcal(resultado.saldoFinal));
  return [...calculados, saldo].join(" ");
}

/** RF-03 e RF-04: mesmo motor, com a lista de itens e o resumo ao vivo. */
export function PainelComposicao({
  meta,
  modo,
}: {
  meta: number;
  modo: Exclude<ModoCalculo, "substituir">;
}) {
  const { itens } = useLoja();
  const [escolhendo, setEscolhendo] = useState(false);
  const [avisoLimite, setAvisoLimite] = useState(false);
  const botaoAdicionar = useRef<HTMLButtonElement>(null);

  const resultado = calcularComposicao(
    meta,
    itens.map((item) => ({
      tipo: item.tipo,
      gramas: item.gramas,
      kcalPor100: obterFruta(item.frutaId)?.kcal ?? null,
    })),
  );

  const faltante = modo === "complementar" ? descreverFaltante(itens, resultado) : null;

  return (
    <>
      {itens.length === 0 ? (
        <div>
          <p className="font-semibold">{t.calcular.itensVazio}</p>
          <p>{t.calcular.itensVazioAcao}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((item, i) => (
            <LinhaItem
              key={item.chave}
              item={item}
              resultado={resultado.itens[i]}
              podeCalcular={podeSerCalculada({ kcal: obterFruta(item.frutaId)?.kcal ?? null })}
              onRemover={() => {
                removerItem(item.chave);
                // O botão clicado some com a linha: o foco não pode se perder.
                botaoAdicionar.current?.focus();
              }}
            />
          ))}
        </ul>
      )}
      <button
        ref={botaoAdicionar}
        type="button"
        className={botaoSecundario}
        onClick={() => {
          if (itens.length >= LIMITE_ITENS) setAvisoLimite(true);
          else setEscolhendo(true);
        }}
      >
        <IconeMais />
        {t.calcular.adicionar}
      </button>
      <div role="status">
        {avisoLimite && itens.length >= LIMITE_ITENS && (
          <p className="font-semibold">{t.calcular.limite}</p>
        )}
      </div>
      {faltante && <p className="text-lg font-bold">{faltante}</p>}
      <Anunciador texto={montarAnuncio(itens, resultado)} />
      <ResumoRefeicao meta={meta} resultado={resultado} nomeDoItem={(i) => nomeDe(itens[i].frutaId)} />
      {escolhendo && (
        <Suspense>
          <SeletorFruta
            onFechar={() => setEscolhendo(false)}
            onEscolher={(fruta) => {
              adicionarItem(fruta.id);
              setEscolhendo(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
