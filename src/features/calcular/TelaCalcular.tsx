"use client";

import { lazy, Suspense, useEffect, useId, useRef } from "react";
import { descreverPrescricao, nomePrescricao } from "@/features/prescricoes/descricao";
import { t } from "@/i18n/pt-BR";
import type { ModoCalculo } from "@/storage/armazenamento";
import { definirModo, escolherPrescricao, kcalDaPrescricao } from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Abas } from "@/ui/Abas";
import { campo, carregando, rotulo, titulo } from "@/ui/estilos";
import { PainelSubstituir } from "./PainelSubstituir";

// Só quem usa cada fluxo baixa o código dele (meta de JS inicial da seção 7).
const PainelComposicao = lazy(() =>
  import("./PainelComposicao").then((modulo) => ({ default: modulo.PainelComposicao })),
);
const FormPrescricao = lazy(() =>
  import("@/features/prescricoes/FormPrescricao").then((modulo) => ({
    default: modulo.FormPrescricao,
  })),
);

/** Sai no HTML estático: é o que a pessoa lê enquanto os dados do navegador não carregam. */
function Carregando() {
  return (
    <>
      <h1 className={titulo}>{t.calcular.titulo}</h1>
      <p>{t.app.descricao}</p>
      <p className={carregando}>{t.app.carregando}</p>
    </>
  );
}

/** T2 (ou T1, enquanto não há prescrição). */
export function TelaCalcular() {
  const { carregado, dados, modo } = useLoja();
  const idSeletor = useId();
  const cabecalho = useRef<HTMLHeadingElement>(null);
  const eraPrimeiroAcesso = useRef(false);

  const ativa = dados.prescricoes.find((p) => p.id === dados.prescricaoAtivaId);

  // Ao sair do cadastro inicial o formulário some: o foco vai para o novo título.
  useEffect(() => {
    if (!carregado) return;
    if (eraPrimeiroAcesso.current && ativa) cabecalho.current?.focus();
    eraPrimeiroAcesso.current = !ativa;
  }, [carregado, ativa]);

  if (!carregado) return <Carregando />;

  if (!ativa) {
    return (
      <Suspense fallback={<Carregando />}>
        <FormPrescricao
          titulo={t.prescricao.tituloPrimeiroAcesso}
          introducao={t.prescricao.introducao}
          onSalvo={() => undefined}
        />
      </Suspense>
    );
  }

  const meta = kcalDaPrescricao(ativa);

  return (
    <>
      <h1 ref={cabecalho} tabIndex={-1} className={`${titulo} outline-none`}>
        {t.calcular.titulo}
      </h1>
      <div>
        <label htmlFor={idSeletor} className={rotulo}>
          {t.calcular.prescricaoAtiva}
        </label>
        <select
          id={idSeletor}
          className={campo}
          value={ativa.id}
          onChange={(evento) => escolherPrescricao(evento.target.value)}
        >
          {dados.prescricoes.map((prescricao) => (
            <option key={prescricao.id} value={prescricao.id}>
              {`${nomePrescricao(prescricao)} · ${descreverPrescricao(prescricao)}`}
            </option>
          ))}
        </select>
      </div>
      <Abas<ModoCalculo>
        rotulo={t.calcular.modos}
        prefixo="modo"
        ativa={modo}
        onChange={definirModo}
        abas={[
          { id: "substituir", rotulo: t.calcular.substituir },
          { id: "complementar", rotulo: t.calcular.complementar },
          { id: "combinar", rotulo: t.calcular.combinar },
        ]}
      />
      <div
        id="modo-painel"
        role="tabpanel"
        aria-labelledby={`modo-aba-${modo}`}
        className="flex flex-col gap-3"
      >
        {modo === "substituir" ? (
          <PainelSubstituir meta={meta} frutaPrescritaId={ativa.frutaId} />
        ) : (
          <Suspense fallback={<p className={carregando}>{t.app.carregando}</p>}>
            <PainelComposicao meta={meta} modo={modo} />
          </Suspense>
        )}
      </div>
    </>
  );
}
