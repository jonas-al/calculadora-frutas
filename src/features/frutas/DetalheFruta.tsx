"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { obterFruta } from "@/data/frutas";
import {
  calcularComposicao,
  gramasEquivalentes,
  interpretarGramas,
  podeSerCalculada,
} from "@/domain/calculo";
import { formatarDecimal, formatarGramasInformadas } from "@/domain/formato";
import {
  LIMITE_ITENS,
  valorNutricional,
  type Fruta,
  type Nutriente,
} from "@/domain/frutas";
import { t } from "@/i18n/pt-BR";
import {
  adicionarItem,
  definirModo,
  kcalDaPrescricao,
  registrarRecente,
  type EstadoLoja,
} from "@/storage/loja";
import { useLoja } from "@/storage/useLoja";
import { BotaoFavorito } from "@/ui/BotaoFavorito";
import { CampoGramas } from "@/ui/CampoGramas";
import { botaoPrimario, botaoSecundario, titulo } from "@/ui/estilos";

const LINHAS: { nutriente: Nutriente; rotulo: string }[] = [
  { nutriente: "kcal", rotulo: t.detalhe.energiaKcal },
  { nutriente: "kj", rotulo: t.detalhe.energiaKj },
  { nutriente: "carboidratoG", rotulo: t.detalhe.carboidratos },
  { nutriente: "proteinaG", rotulo: t.detalhe.proteinas },
  { nutriente: "lipidiosG", rotulo: t.detalhe.lipidios },
  { nutriente: "fibraG", rotulo: t.detalhe.fibras },
];

function exibirValor(fruta: Fruta, nutriente: Nutriente, gramas: number): string {
  const valor = valorNutricional(fruta, nutriente, gramas);
  if (valor.tipo === "nao-analisado") return t.detalhe.naoAnalisado;
  if (valor.tipo === "tracos") return t.detalhe.tracos;
  return formatarDecimal(valor.valor);
}

/** Porção "em uso": o item na refeição, a prescrição ou o equivalente às kcal da meta. */
function porcaoEmUso(fruta: Fruta, estado: EstadoLoja): number {
  const { dados, itens } = estado;
  const ativa = dados.prescricoes.find((p) => p.id === dados.prescricaoAtivaId);
  if (!ativa) return 100;
  if (ativa.frutaId === fruta.id) return ativa.gramas;
  const meta = kcalDaPrescricao(ativa);
  const entradas = itens.map((item) => ({
    tipo: item.tipo,
    gramas: item.gramas,
    kcalPor100: obterFruta(item.frutaId)?.kcal ?? null,
  }));
  const resultado = calcularComposicao(meta, entradas);
  const indice = itens.findIndex((item) => item.frutaId === fruta.id);
  const doItem = indice >= 0 ? resultado.itens[indice].gramas : null;
  if (doItem) return Math.round(doItem);
  const equivalente = gramasEquivalentes(meta, fruta.kcal);
  return equivalente === null ? 100 : Math.round(equivalente);
}

function Conteudo({ fruta, estado }: { fruta: Fruta; estado: EstadoLoja }) {
  const router = useRouter();
  const [editado, setEditado] = useState<string | null>(null);
  // Até a pessoa editar, acompanha a porção em uso; o HTML estático sai com 100 g.
  const texto = editado ?? formatarGramasInformadas(porcaoEmUso(fruta, estado)).replace(/\./g, "");
  const [aviso, setAviso] = useState("");
  const gramas = interpretarGramas(texto);
  const porcao = gramas.estado === "valido" ? gramas.valor : null;
  const utilizavel = podeSerCalculada(fruta);

  useEffect(() => {
    if (estado.carregado) registrarRecente(fruta.id);
  }, [estado.carregado, fruta.id]);

  function usarNaCalculadora() {
    if (estado.dados.prescricoes.length === 0) {
      router.push(`/prescricoes/nova/?fruta=${fruta.id}`);
      return;
    }
    if (estado.itens.length >= LIMITE_ITENS) {
      setAviso(t.detalhe.limite);
      return;
    }
    if (estado.modo === "substituir") definirModo("combinar");
    adicionarItem(fruta.id, "calculado");
    router.push("/");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={titulo}>{fruta.nomeExibicao}</h1>
        <BotaoFavorito fruta={fruta} />
      </div>
      <div>
        <CampoGramas
          rotulo={t.detalhe.porcao}
          valor={texto}
          erro={gramas.estado === "invalido" ? t.gramas.erro : undefined}
          onChange={setEditado}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t.detalhe.tabela(fruta.nomeExibicao)}</caption>
          <thead>
            <tr className="border-b border-borda">
              <th scope="col" className="py-2 pr-1">
                {t.detalhe.nutriente}
              </th>
              <th scope="col" className="px-1 py-2 text-right">
                {t.detalhe.por100}
              </th>
              <th scope="col" className="py-2 pl-1 text-right">
                {porcao === null
                  ? t.detalhe.porPorcaoVazia
                  : t.detalhe.porPorcao(formatarGramasInformadas(porcao))}
              </th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map(({ nutriente, rotulo }) => (
              <tr key={nutriente} className="border-b border-borda">
                <th scope="row" className="py-2 pr-1 font-semibold">
                  {rotulo}
                </th>
                <td className="px-1 py-2 text-right">{exibirValor(fruta, nutriente, 100)}</td>
                <td className="py-2 pl-1 text-right">
                  {porcao === null ? "—" : exibirValor(fruta, nutriente, porcao)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <strong>{t.detalhe.nomeTaco}</strong> {fruta.nomeTaco}
      </p>
      <p className="text-sm text-suave">{t.detalhe.fonte}</p>
      <div role="status">{aviso && <p className="font-semibold text-alerta">{aviso}</p>}</div>
      {utilizavel ? (
        <button type="button" className={botaoPrimario} onClick={usarNaCalculadora}>
          {t.detalhe.usar}
        </button>
      ) : (
        <p className="font-semibold">{t.detalhe.semKcal}</p>
      )}
    </>
  );
}

/** T5. */
export function DetalheFruta({ id }: { id: number }) {
  const estado = useLoja();
  const fruta = obterFruta(id);
  if (!fruta) {
    return (
      <>
        <h1 className={titulo}>{t.detalhe.naoEncontrada}</h1>
        <Link prefetch={false} href="/frutas/" className={botaoSecundario}>
          {t.detalhe.voltarLista}
        </Link>
      </>
    );
  }
  return <Conteudo fruta={fruta} estado={estado} />;
}

