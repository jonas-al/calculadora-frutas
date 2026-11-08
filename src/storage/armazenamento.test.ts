import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apagarTudo,
  carregar,
  CHAVE,
  CHAVE_BACKUP,
  dadosIniciais,
  migrar,
  salvar,
  type ArmazenamentoLocal,
  type Dados,
} from "./armazenamento";

const existe = (id: number) => [182, 190, 175].includes(id);

function memoria(inicial: Record<string, string> = {}) {
  const mapa = new Map(Object.entries(inicial));
  return {
    mapa,
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => void mapa.set(k, v),
    removeItem: (k: string) => void mapa.delete(k),
  };
}

const falhando: ArmazenamentoLocal = {
  getItem: () => {
    throw new Error("negado");
  },
  setItem: () => {
    throw new Error("cota");
  },
  removeItem: () => {
    throw new Error("negado");
  },
};

const prescricao = {
  id: "p1",
  nome: "Lanche",
  frutaId: 182,
  gramas: 65,
  criadaEm: "2026-11-04T10:00:00Z",
};

const exemplo: Dados = {
  ...dadosIniciais(),
  prescricoes: [prescricao],
  prescricaoAtivaId: "p1",
  favoritos: [182, 190],
  recentes: [190, 182],
  ultimaComposicao: {
    prescricaoId: "p1",
    modo: "combinar",
    itens: [
      { frutaId: 190, tipo: "fixo", gramas: 20 },
      { frutaId: 175, tipo: "calculado" },
    ],
  },
};

describe("leitura e escrita", () => {
  it("devolve o estado inicial quando não há nada salvo", () => {
    expect(carregar(existe, memoria())).toEqual({ dados: dadosIniciais(), falhou: false });
  });

  it("faz o ciclo completo na chave calcfrutas:v1 (RP-04)", () => {
    const ls = memoria();
    expect(salvar(exemplo, ls)).toBe(true);
    expect([...ls.mapa.keys()]).toEqual([CHAVE]);
    expect(CHAVE).toBe("calcfrutas:v1");
    expect(carregar(existe, ls).dados).toEqual(exemplo);
  });

  it("guarda só frutaId, sem valores nutricionais (RP-01)", () => {
    const ls = memoria();
    salvar(exemplo, ls);
    expect(ls.mapa.get(CHAVE)).not.toMatch(/kcal|carboidrato|proteina/);
  });
});

describe("RP-03 — ids fora do dataset", () => {
  it("descarta favoritos, recentes e itens que não existem mais", () => {
    const ls = memoria({
      [CHAVE]: JSON.stringify({
        ...exemplo,
        favoritos: [182, 999],
        recentes: [999, 190, 190],
        ultimaComposicao: {
          ...exemplo.ultimaComposicao,
          itens: [{ frutaId: 999, tipo: "calculado" }, { frutaId: 175, tipo: "calculado" }],
        },
      }),
    });
    const { dados } = carregar(existe, ls);
    expect(dados.favoritos).toEqual([182]);
    expect(dados.recentes).toEqual([190]);
    expect(dados.ultimaComposicao?.itens).toEqual([{ frutaId: 175, tipo: "calculado" }]);
  });
});

describe("RP-05 — falha do armazenamento", () => {
  it("leitura com exceção vira estado em memória, sem lançar", () => {
    expect(carregar(existe, falhando)).toEqual({ dados: dadosIniciais(), falhou: true });
  });
  it("localStorage inacessível também", () => {
    expect(carregar(existe, null).falhou).toBe(true);
    expect(salvar(exemplo, null)).toBe(false);
  });
  it("escrita com exceção devolve false, sem lançar", () => {
    expect(salvar(exemplo, falhando)).toBe(false);
  });
  it("apagar com exceção devolve false, sem lançar", () => {
    expect(apagarTudo(falhando)).toBe(false);
  });
});

describe("RP-06 — migração", () => {
  it("guarda backup e recomeça com JSON inválido", () => {
    const ls = memoria({ [CHAVE]: "{quebrado" });
    const { dados, falhou } = carregar(existe, ls);
    expect(dados).toEqual(dadosIniciais());
    expect(falhou).toBe(false);
    expect(ls.mapa.get(CHAVE_BACKUP)).toBe("{quebrado");
    expect(ls.mapa.has(CHAVE)).toBe(false);
  });

  it("guarda backup com versão desconhecida", () => {
    const original = JSON.stringify({ versao: 99, prescricoes: [] });
    const ls = memoria({ [CHAVE]: original });
    expect(carregar(existe, ls).dados).toEqual(dadosIniciais());
    expect(ls.mapa.get(CHAVE_BACKUP)).toBe(original);
  });

  it("migrar devolve null sem versão ou sem caminho", () => {
    expect(migrar(null)).toBeNull();
    expect(migrar({})).toBeNull();
    expect(migrar({ versao: 0 })).toBeNull();
  });

  it("migrar mantém a versão atual", () => {
    expect(migrar({ versao: 1, favoritos: [] })).toEqual({ versao: 1, favoritos: [] });
  });

  it("campos malformados na versão atual viram padrão, sem derrubar o app", () => {
    const ls = memoria({
      [CHAVE]: JSON.stringify({
        versao: 1,
        prescricoes: "x",
        favoritos: [182, "a"],
        preferencias: { ordenacao: "invalida" },
      }),
    });
    const { dados } = carregar(existe, ls);
    expect(dados.prescricoes).toEqual([]);
    expect(dados.favoritos).toEqual([182]);
    expect(dados.preferencias.ordenacao).toBe("padrao");
  });
});

describe("RP-07 — apagar", () => {
  it("remove a chave", () => {
    const ls = memoria({ [CHAVE]: "{}" });
    expect(apagarTudo(ls)).toBe(true);
    expect(ls.mapa.has(CHAVE)).toBe(false);
  });
});

describe("loja", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    (await import("./loja")).reiniciarLoja();
  });

  it("grava com debounce de 300 ms (RP-04)", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    loja.alternarFavoritoDe(1);
    loja.alternarFavoritoDe(2);
    vi.advanceTimersByTime(299);
    expect(localStorage.getItem(CHAVE)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(JSON.parse(localStorage.getItem(CHAVE)!).favoritos).toEqual([1, 2]);
  });

  it("salvarAgora não perde a última mudança ao sair da página", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    loja.alternarFavoritoDe(7);
    loja.salvarAgora();
    expect(JSON.parse(localStorage.getItem(CHAVE)!).favoritos).toEqual([7]);
  });

  it("restaura a composição ao reabrir (RP-04)", async () => {
    const loja = await import("./loja");
    localStorage.setItem(
      CHAVE,
      JSON.stringify({
        ...dadosIniciais(),
        prescricoes: [{ ...prescricao, frutaId: 182 }],
        prescricaoAtivaId: "p1",
        ultimaComposicao: {
          prescricaoId: "p1",
          modo: "combinar",
          itens: [{ frutaId: 256, tipo: "fixo", gramas: 20 }],
        },
      }),
    );
    const estado = loja.obterEstado();
    expect(estado.modo).toBe("combinar");
    expect(estado.itens).toMatchObject([{ frutaId: 256, tipo: "fixo", gramas: 20 }]);
  });

  it("mostra o aviso de falha só uma vez e segue em memória (RP-05)", async () => {
    const loja = await import("./loja");
    const espiao = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota");
    });
    loja.obterEstado();
    loja.alternarFavoritoDe(3);
    vi.advanceTimersByTime(300);
    expect(loja.obterEstado().avisoArmazenamento).toBe(true);
    expect(loja.obterEstado().dados.favoritos).toEqual([3]);
    loja.dispensarAvisoArmazenamento();
    loja.alternarFavoritoDe(4);
    vi.advanceTimersByTime(300);
    expect(loja.obterEstado().avisoArmazenamento).toBe(false);
    espiao.mockRestore();
  });

  it("Complementar abre com a fruta prescrita como item fixo (RF-03)", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    loja.salvarPrescricao({ nome: "", frutaId: 182, gramas: 65 });
    loja.definirModo("complementar");
    expect(loja.obterEstado().itens).toMatchObject([{ frutaId: 182, tipo: "fixo" }]);
    loja.definirModo("substituir");
    loja.definirModo("complementar");
    expect(loja.obterEstado().itens).toHaveLength(1);
  });

  it("trocar de prescrição descarta a composição anterior", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    const a = loja.salvarPrescricao({ nome: "A", frutaId: 182, gramas: 65 });
    loja.salvarPrescricao({ nome: "B", frutaId: 164, gramas: 100 });
    loja.definirModo("combinar");
    loja.adicionarItem(256);
    loja.escolherPrescricao(a);
    expect(loja.obterEstado().itens).toEqual([]);
    expect(loja.obterEstado().dados.prescricaoAtivaId).toBe(a);
  });

  it("excluir a prescrição ativa ativa a próxima (RF-09)", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    const a = loja.salvarPrescricao({ nome: "A", frutaId: 182, gramas: 65 });
    const b = loja.salvarPrescricao({ nome: "B", frutaId: 164, gramas: 100 });
    loja.excluirPrescricao(b);
    expect(loja.obterEstado().dados.prescricaoAtivaId).toBe(a);
    loja.excluirPrescricao(a);
    expect(loja.obterEstado().dados.prescricaoAtivaId).toBeNull();
  });

  it("item usado entra em recentes (RF-08)", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    loja.adicionarItem(256);
    expect(loja.obterEstado().dados.recentes).toEqual([256]);
  });

  it("apagar meus dados limpa tudo e cancela a gravação pendente (RP-07)", async () => {
    const loja = await import("./loja");
    loja.obterEstado();
    loja.alternarFavoritoDe(1);
    vi.advanceTimersByTime(300);
    loja.alternarFavoritoDe(2);
    loja.apagarMeusDados();
    vi.advanceTimersByTime(300);
    expect(localStorage.getItem(CHAVE)).toBeNull();
    expect(loja.obterEstado().dados.favoritos).toEqual([]);
  });
});
