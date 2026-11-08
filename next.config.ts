import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site estático, sem servidor (seção 7). trailingSlash gera pasta/index.html,
  // formato aceito por qualquer hospedagem estática.
  output: "export",
  trailingSlash: true,
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
