"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/i18n/pt-BR";
import { IconeCalcular, IconeFruta, IconeLista } from "./Icones";

const itens = [
  { href: "/", rotulo: t.nav.calcular, Icone: IconeCalcular },
  { href: "/frutas/", rotulo: t.nav.frutas, Icone: IconeFruta },
  { href: "/prescricoes/", rotulo: t.nav.prescricoes, Icone: IconeLista },
];

export function NavInferior() {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <nav aria-label={t.nav.rotulo} className="border-t border-borda bg-superficie">
      <ul className="mx-auto flex max-w-2xl">
        {itens.map(({ href, rotulo, Icone }) => (
          <li key={href} className="min-w-0 flex-auto">
            <Link prefetch={false}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center px-0.5 py-1 text-sm font-semibold ${
                ativo(href) ? "text-primaria underline underline-offset-4" : "text-suave"
              }`}
            >
              <Icone />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
