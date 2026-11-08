import type { Metadata, Viewport } from "next";
import { metaDados } from "@/data/frutas";
import { t } from "@/i18n/pt-BR";
import { AvisoArmazenamento } from "@/ui/AvisoArmazenamento";
import { NavInferior } from "@/ui/NavInferior";
import { RegistrarSW } from "@/ui/RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: t.app.nome, template: `%s · ${t.app.nome}` },
  description: t.app.descricao,
  applicationName: t.app.nome,
  appleWebApp: { capable: true, title: t.app.nome },
  icons: { icon: "/icone.svg", apple: "/icone-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121815" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex h-dvh flex-col overflow-hidden">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-superficie focus:p-3"
        >
          {t.app.pularConteudo}
        </a>
        {metaDados.fixture && (
          <p className="bg-alerta-fundo p-2 text-center text-sm font-semibold text-texto">
            {t.app.dadosDeTeste}
          </p>
        )}
        <AvisoArmazenamento />
        <main id="conteudo" tabIndex={-1} className="min-h-0 flex-1 scroll-pb-48 overflow-y-auto outline-none">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
            {children}
            <p className="mt-auto pt-4 text-center text-sm text-suave">{t.app.aviso}</p>
          </div>
        </main>
        <NavInferior />
        <RegistrarSW />
      </body>
    </html>
  );
}
