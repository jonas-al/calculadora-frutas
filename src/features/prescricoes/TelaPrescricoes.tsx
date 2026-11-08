"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { t } from "@/i18n/pt-BR";
import type { Prescricao } from "@/storage/armazenamento";
import {
  apagarMeusDados,
  escolherPrescricao,
  excluirPrescricao,
  renomearPrescricao,
} from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { Confirmar } from "@/ui/Confirmar";
import { Dialogo } from "@/ui/Dialogo";
import {
  botaoPerigo,
  botaoPrimario,
  botaoSecundario,
  campo,
  carregando,
  cartao,
  rotulo,
  titulo,
} from "@/ui/estilos";
import { IconeCheck } from "@/ui/Icones";
import { descreverPrescricao, nomePrescricao } from "./descricao";

function Renomear({
  prescricao,
  onFechar,
}: {
  prescricao: Prescricao;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(prescricao.nome);
  const idTitulo = useId();
  const idCampo = useId();
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <Dialogo rotuloId={idTitulo} onFechar={onFechar} focoInicial={entrada}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          renomearPrescricao(prescricao.id, nome.trim());
          onFechar();
        }}
      >
        <h2 id={idTitulo} className="text-xl font-bold">
          {t.prescricoes.renomearTitulo}
        </h2>
        <div>
          <label htmlFor={idCampo} className={rotulo}>
            {t.prescricoes.novoNome}
          </label>
          <input
            ref={entrada}
            id={idCampo}
            type="text"
            className={campo}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botaoSecundario} onClick={onFechar}>
            {t.comum.cancelar}
          </button>
          <button type="submit" className={botaoPrimario}>
            {t.comum.salvar}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

/** T6. */
export function TelaPrescricoes() {
  const { carregado, dados } = useLoja();
  const [renomeando, setRenomeando] = useState<Prescricao | null>(null);
  const [excluindo, setExcluindo] = useState<Prescricao | null>(null);
  const [apagando, setApagando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const cabecalho = useRef<HTMLHeadingElement>(null);

  // O botão acionado pode sumir da tela; espera o diálogo fechar e leva o foco ao título.
  const focarTitulo = () => setTimeout(() => cabecalho.current?.focus());

  return (
    <>
      <h1 ref={cabecalho} tabIndex={-1} className={`${titulo} outline-none`}>
        {t.prescricoes.titulo}
      </h1>
      <div role="status">{mensagem && <p className="font-semibold">{mensagem}</p>}</div>
      {!carregado ? (
        <p className={carregando}>{t.app.carregando}</p>
      ) : dados.prescricoes.length === 0 ? (
        <>
          <p>{t.prescricoes.vazio}</p>
          <Link prefetch={false} href="/prescricoes/nova/" className={botaoPrimario}>
            {t.prescricoes.vazioAcao}
          </Link>
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {dados.prescricoes.map((prescricao) => {
              const nome = nomePrescricao(prescricao);
              const ativa = prescricao.id === dados.prescricaoAtivaId;
              return (
                <li key={prescricao.id} className={`${cartao} flex flex-col gap-2`}>
                  <div>
                    <h2 className="text-lg font-bold">{nome}</h2>
                    <p className="text-suave">{descreverPrescricao(prescricao)}</p>
                    {ativa && (
                      <p className="mt-1 inline-flex items-center gap-1 font-semibold text-primaria">
                        <IconeCheck />
                        {t.prescricoes.emUso}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!ativa && (
                      <button
                        type="button"
                        className={botaoSecundario}
                        aria-label={t.prescricoes.usarRotulo(nome)}
                        onClick={() => {
                          escolherPrescricao(prescricao.id);
                          focarTitulo();
                        }}
                      >
                        {t.prescricoes.usar}
                      </button>
                    )}
                    <Link prefetch={false}
                      href={`/prescricoes/nova/?id=${prescricao.id}`}
                      className={botaoSecundario}
                      aria-label={t.prescricoes.editarRotulo(nome)}
                    >
                      {t.prescricoes.editar}
                    </Link>
                    <button
                      type="button"
                      className={botaoSecundario}
                      aria-label={t.prescricoes.renomearRotulo(nome)}
                      onClick={() => setRenomeando(prescricao)}
                    >
                      {t.prescricoes.renomear}
                    </button>
                    <button
                      type="button"
                      className={botaoSecundario}
                      aria-label={t.prescricoes.excluirRotulo(nome)}
                      onClick={() => setExcluindo(prescricao)}
                    >
                      {t.prescricoes.excluir}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link prefetch={false} href="/prescricoes/nova/" className={botaoPrimario}>
            {t.prescricoes.nova}
          </Link>
        </>
      )}
      {carregado && (
        <button type="button" className={`${botaoPerigo} mt-4`} onClick={() => setApagando(true)}>
          {t.prescricoes.apagarTudo}
        </button>
      )}

      {renomeando && <Renomear prescricao={renomeando} onFechar={() => setRenomeando(null)} />}
      {excluindo && (
        <Confirmar
          mensagem={t.prescricoes.excluirConfirmar(nomePrescricao(excluindo))}
          botaoConfirmar={t.prescricoes.excluir}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            excluirPrescricao(excluindo.id);
            setExcluindo(null);
            focarTitulo();
          }}
        />
      )}
      {apagando && (
        <Confirmar
          mensagem={t.prescricoes.apagarConfirmar}
          botaoConfirmar={t.prescricoes.apagarConfirmarBotao}
          onCancelar={() => setApagando(false)}
          onConfirmar={() => {
            const removido = apagarMeusDados();
            setApagando(false);
            focarTitulo();
            setMensagem(removido ? t.prescricoes.apagados : t.prescricoes.apagarFalhou);
          }}
        />
      )}
    </>
  );
}
