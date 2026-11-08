"use client";

import type { ResultadoComposicao } from "@/domain/calculo";
import { formatarGramas, formatarKcal } from "@/domain/formato";
import { t } from "@/i18n/pt-BR";
import { IconeAlerta, IconeCheck } from "@/ui/Icones";

function Metrica({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="min-w-20 flex-1">
      <dt className="text-sm text-suave">{rotulo}</dt>
      <dd className="font-bold">{t.resumo.kcal(formatarKcal(valor))}</dd>
    </div>
  );
}

/** Rodapé fixo. Em Substituir não há consumo: mostra só a meta. */
export function ResumoRefeicao({
  meta,
  resultado,
  nomeDoItem,
}: {
  meta: number;
  resultado?: ResultadoComposicao;
  nomeDoItem?: (indice: number) => string;
}) {
  const porcentagem = resultado ? Math.round((resultado.usado / meta) * 100) : 0;
  const excesso = resultado?.excesso;
  const fechou = resultado?.estado === "completo" || resultado?.estado === "meta-atingida";

  return (
    <section
      aria-label={t.resumo.rotulo}
      className="resumo-fixo sticky -bottom-0.5 z-10 -mx-1 flex flex-col gap-1 rounded-t-xl border border-borda bg-superficie p-3"
    >
      <dl className="flex flex-wrap gap-2">
        <Metrica rotulo={t.resumo.meta} valor={meta} />
        {resultado && (
          <>
            <Metrica rotulo={t.resumo.usado} valor={resultado.usado} />
            <Metrica rotulo={t.resumo.saldo} valor={resultado.saldoFinal} />
          </>
        )}
      </dl>
      {resultado && (
        <div className="flex items-center gap-2">
          <progress
            className={`h-3 min-w-0 flex-1 ${excesso ? "excedido" : ""}`}
            max={100}
            value={Math.min(porcentagem, 100)}
            aria-label={t.resumo.progresso}
          />
          <span className="text-sm whitespace-nowrap">
            {t.resumo.progressoTexto(String(porcentagem))}
          </span>
        </div>
      )}
      {excesso && nomeDoItem && (
        <div className="flex items-start gap-2 rounded-lg bg-alerta-fundo p-2 text-texto">
          <IconeAlerta className="text-alerta" />
          <p>
            <strong>{t.resumo.excesso(formatarKcal(excesso.kcal))}</strong>{" "}
            {t.resumo.removerExcesso(
              formatarGramas(excesso.gramasRemover),
              nomeDoItem(excesso.indiceItem),
            )}
          </p>
        </div>
      )}
      {resultado?.estado === "meta-atingida" && (
        <p className="flex items-center gap-1 font-bold text-primaria">
          <IconeCheck />
          {t.resumo.metaAtingida}
        </p>
      )}
      {fechou && (
        <p className="text-sm text-suave">{t.resumo.totalReal(formatarKcal(resultado!.totalReal))}</p>
      )}
    </section>
  );
}
