import type { Metadata } from "next";
import { frutas, obterFruta } from "@/data/frutas";
import { DetalheFruta } from "@/features/frutas/DetalheFruta";

export const dynamicParams = false;

export function generateStaticParams() {
  return frutas.map((fruta) => ({ id: String(fruta.id) }));
}

export async function generateMetadata({ params }: PageProps<"/frutas/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: obterFruta(Number(id))?.nomeExibicao };
}

export default async function PaginaFruta({ params }: PageProps<"/frutas/[id]">) {
  const { id } = await params;
  return <DetalheFruta id={Number(id)} />;
}
