import type { MetadataRoute } from "next";
import { t } from "@/i18n/pt-BR";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.app.nome,
    short_name: "Frutas",
    description: t.app.descricao,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#1b6b3a",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
