import type { ReactNode } from "react";

type Props = { className?: string };

/** Ícones decorativos: o texto ou aria-label do controle é quem dá o significado. */
function Icone({ children, className }: Props & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`size-6 shrink-0 ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconeCalcular = (p: Props) => (
  <Icone {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
  </Icone>
);
export const IconeFruta = (p: Props) => (
  <Icone {...p}>
    <path d="M12 8c-2-2-7-1.5-7 4.500C5 17 8 21 10 21c1 0 1.300-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8.500C19 6.500 14 6 12 8Z" />
    <path d="M12 8c0-2 1-4 3-5" />
  </Icone>
);
export const IconeLista = (p: Props) => (
  <Icone {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Icone>
);
export const IconeInfo = (p: Props) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icone>
);
export const IconeLixeira = (p: Props) => (
  <Icone {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icone>
);
export const IconeFechar = (p: Props) => (
  <Icone {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icone>
);
export const IconeAlerta = (p: Props) => (
  <Icone {...p}>
    <path d="M12 4 2.500 20h19L12 4ZM12 10v4M12 17h.01" />
  </Icone>
);
export const IconeCheck = (p: Props) => (
  <Icone {...p}>
    <path d="M4 12.500 9.500 18 20 6.500" />
  </Icone>
);
export const IconeMais = (p: Props) => (
  <Icone {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
);
export function IconeEstrela({ cheia, className }: Props & { cheia: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`size-6 shrink-0 ${className ?? ""}`}
      fill={cheia ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.800 5.800 6.200.9-4.500 4.400 1.100 6.300L12 17.400 6.400 20.400l1.100-6.300L3 9.700l6.200-.9L12 3Z" />
    </svg>
  );
}
