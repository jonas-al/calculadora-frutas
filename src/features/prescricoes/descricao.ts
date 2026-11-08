import { obterFruta } from "@/data/frutas";
import { formatarGramasInformadas, formatarKcal } from "@/domain/formato";
import { t } from "@/i18n/pt-BR";
import type { Prescricao } from "@/storage/armazenamento";
import { kcalDaPrescricao } from "@/storage/loja";

export function nomePrescricao(prescricao: Prescricao): string {
  return prescricao.nome || t.prescricao.semNome;
}

export function descreverPrescricao(prescricao: Prescricao): string {
  return t.prescricao.resumo(
    formatarGramasInformadas(prescricao.gramas),
    obterFruta(prescricao.frutaId)?.nomeExibicao ?? "",
    formatarKcal(kcalDaPrescricao(prescricao)),
  );
}
