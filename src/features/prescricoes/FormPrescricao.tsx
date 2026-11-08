"use client";

import { lazy, Suspense, useId, useRef, useState } from "react";
import { obterFruta } from "@/data/frutas";
import { energia, interpretarGramas } from "@/domain/calculo";
import { formatarGramasInformadas, formatarKcal } from "@/domain/formato";
import type { Fruta } from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import type { Prescricao } from "@/storage/armazenamento";
import { salvarPrescricao } from "@/storage/loja";
import { Anunciador } from "@/ui/Anunciador";
import { CampoGramas } from "@/ui/CampoGramas";
import { botaoPrimario, botaoSecundario, campo, rotulo, titulo as classeTitulo } from "@/ui/estilos";

const SeletorFruta = lazy(() =>
  import("@/features/frutas/SeletorFruta").then((modulo) => ({ default: modulo.SeletorFruta })),
);

/** T1: primeiro acesso, nova prescrição e edição usam o mesmo formulário. */
export function FormPrescricao({
  titulo,
  introducao,
  inicial,
  frutaInicialId,
  onSalvo,
}: {
  titulo: string;
  introducao?: string;
  inicial?: Prescricao;
  frutaInicialId?: number;
  onSalvo: () => void;
}) {
  const [fruta, setFruta] = useState<Fruta | undefined>(() =>
    obterFruta(inicial?.frutaId ?? frutaInicialId ?? -1),
  );
  const [gramasTexto, setGramasTexto] = useState(
    inicial ? formatarGramasInformadas(inicial.gramas).replace(/\./g, "") : "",
  );
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [escolhendo, setEscolhendo] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const idNome = useId();
  const idFruta = useId();
  const idErroFruta = useId();
  const campoGramas = useRef<HTMLInputElement>(null);
  const botaoFruta = useRef<HTMLButtonElement>(null);

  const gramas = interpretarGramas(gramasTexto);
  const erroGramas =
    gramas.estado === "invalido"
      ? t.gramas.erro
      : gramas.estado === "vazio" && tentouSalvar
        ? t.gramas.obrigatorio
        : undefined;
  const erroFruta = !fruta && tentouSalvar ? t.prescricao.frutaObrigatoria : undefined;
  const kcal =
    gramas.estado === "valido" && fruta?.kcal ? energia(gramas.valor, fruta.kcal) : null;

  function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    setTentouSalvar(true);
    if (!fruta) {
      botaoFruta.current?.focus();
      return;
    }
    if (gramas.estado !== "valido") {
      campoGramas.current?.focus();
      return;
    }
    salvarPrescricao({
      id: inicial?.id,
      nome: nome.trim(),
      frutaId: fruta.id,
      gramas: gramas.valor,
    });
    onSalvo();
  }

  return (
    <>
      <h1 className={classeTitulo}>{titulo}</h1>
      {introducao && <p>{introducao}</p>}
      <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
        <div>
          <span id={idFruta} className={rotulo}>
            {t.prescricao.fruta}
          </span>
          <button
            ref={botaoFruta}
            type="button"
            className={`${botaoSecundario} w-full`}
            aria-labelledby={`${idFruta} ${idFruta}-valor`}
            aria-describedby={erroFruta ? idErroFruta : undefined}
            onClick={() => setEscolhendo(true)}
          >
            <span id={`${idFruta}-valor`}>{fruta?.nomeExibicao ?? t.prescricao.escolherFruta}</span>
          </button>
          {erroFruta && (
            <p id={idErroFruta} className="mt-1 font-semibold text-alerta">
              {erroFruta}
            </p>
          )}
        </div>
        <CampoGramas
          rotulo={t.prescricao.gramas}
          valor={gramasTexto}
          erro={erroGramas}
          onChange={setGramasTexto}
          inputRef={campoGramas}
        />
        <div>
          <label htmlFor={idNome} className={rotulo}>
            {t.prescricao.nome}
          </label>
          <input
            id={idNome}
            type="text"
            className={campo}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>
        {kcal !== null && (
          <p>
            {t.prescricao.previaRotulo}{" "}
            <strong className="text-xl">{t.prescricao.previa(formatarKcal(kcal))}</strong>
          </p>
        )}
        <Anunciador texto={kcal === null ? "" : t.prescricao.previa(formatarKcal(kcal))} />
        <button type="submit" className={botaoPrimario}>
          {t.prescricao.salvar}
        </button>
      </form>
      {escolhendo && (
        <Suspense>
          <SeletorFruta
            onFechar={() => setEscolhendo(false)}
            onEscolher={(escolhida) => {
              setFruta(escolhida);
              setEscolhendo(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
