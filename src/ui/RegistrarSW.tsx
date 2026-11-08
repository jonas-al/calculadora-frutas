"use client";

import { useEffect } from "react";

/** Registra o service worker gerado no build; em desenvolvimento ele não existe. */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sem service worker o app segue funcionando, só não fica offline.
      });
    }
  }, []);
  return null;
}
