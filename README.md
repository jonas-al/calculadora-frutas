# Calculadora de Substituição de Frutas

Web app mobile-first para quem segue uma prescrição nutricional e quer **trocar ou complementar
a fruta indicada mantendo as mesmas kcal**. Os valores vêm da TACO (Tabela Brasileira de
Composição de Alimentos, 4ª ed., NEPA/UNICAMP). Tudo roda no navegador: não há backend nem
conta, e o app funciona offline.

> A calculadora apoia, mas não substitui, a orientação do nutricionista.

A especificação completa está em
`Especificação — Calculadora de Substituição de Frutas (TACO).md`.

## Funcionalidades

### Prescrições

O ponto de partida é a **prescrição**: a fruta e as gramas indicadas pelo nutricionista (por
exemplo, 65 g de banana prata). A energia dessa porção vira a **meta em kcal** que todos os
cálculos respeitam.

- No primeiro acesso o app pede a prescrição antes de tudo e mostra uma prévia das kcal.
- É possível salvar várias prescrições (uma por refeição, por exemplo), dar nome, editar,
  renomear, excluir e escolher qual está **em uso** na tela Calcular.
- "Apagar todos os meus dados" remove prescrições, favoritos e recentes do aparelho.

### Calcular: três modos

Os três modos usam o mesmo motor: uma regra de três sobre as kcal por 100 g da TACO.

| Modo | Para quando… | O que o app faz |
| --- | --- | --- |
| **Substituir** | você não tem a fruta prescrita | Lista todas as frutas in natura com as gramas que dão as mesmas kcal. |
| **Complementar** | você tem só parte da fruta prescrita | Você informa quanto tem; o app mostra as kcal que faltam e quanto de outra fruta completa a refeição. |
| **Combinar** | você quer montar a refeição com várias frutas | Para cada fruta você escolhe "Eu informo" (gramas fixas) ou "Calcular"; o saldo de kcal é dividido igualmente entre as frutas calculadas. |

Exemplos com a prescrição de 65 g de banana prata (63,7 kcal):

- **Substituir:** 120 g de uva Itália ou 133 g de abacaxi.
- **Complementar:** com 30 g de banana (29,4 kcal), faltam 34,3 kcal, ou seja, 71 g de abacaxi.
- **Combinar:** 20 g de uva informados, abacaxi e maçã Fuji calculados: 55 g de abacaxi e 47 g de
  maçã Fuji.

Detalhes do cálculo:

- **Resumo ao vivo** com meta, kcal usadas, saldo e barra de progresso.
- **Excesso:** se as frutas informadas passam da meta, o app avisa quantas kcal sobraram e
  quantas gramas tirar da última fruta informada.
- **Precisão:** o cálculo usa precisão total e só arredonda na exibição (gramas inteiras, kcal com
  uma casa decimal). O total com as gramas arredondadas também aparece, porque pode diferir da
  meta em até ±1 kcal.
- No modo Substituir a lista pode ser ordenada por favoritas e recentes primeiro, por menos gramas
  ou por mais gramas.
- Gramas aceitas: de 0 a 2000 (sem incluir o zero), com vírgula ou ponto. Uma refeição tem no
  máximo 6 frutas.
- Frutas sem kcal na TACO aparecem no catálogo, mas não podem ser calculadas.

### Catálogo de frutas

- 96 itens do grupo "Frutas e derivados" da TACO: 64 in natura e 32 derivados (sucos, polpas,
  doces, frutas secas). Os derivados ficam ocultos atrás do filtro "Mostrar derivados".
- Busca por nome, abas **Todas**, **Favoritas** e **Recentes**, com a estrela para favoritar.
- **Recentes** guarda as últimas 10 frutas usadas, sem repetir, e pode ser limpa.
- A **ficha de cada fruta** mostra energia (kcal e kJ), carboidratos, proteínas, lipídios e
  fibras por 100 g e para uma porção que você escolhe, indicando "traços" e "não analisado" como
  na TACO. Um botão leva a fruta direto para a calculadora.

### Privacidade, offline e acessibilidade

- Os dados ficam só no `localStorage` do navegador; nada é enviado para servidor. Se o
  armazenamento estiver bloqueado, o app avisa que os dados valem só nesta sessão.
- PWA instalável na tela inicial que funciona sem rede depois da primeira visita.
- Interface em português com navegação por teclado, foco gerenciado, anúncios para leitores de
  tela (resultados e saldo) e contraste verificado em testes. Os fluxos passam pelo axe nos
  testes e2e.

## Dados: passo obrigatório antes de publicar

`src/data/frutas-taco.json` é gerado por script e não deve ser editado à mão.

A fonte atual é o PDF oficial da TACO 4ª ed. em `data/raw/`. Para reimportar, deixe só um
arquivo da TACO (PDF ou planilha) nessa pasta e rode `npm run import-taco`. O script nunca
acessa a internet e falha se um valor de controle divergir ou se kcal e kJ não forem compatíveis.

`npm run import-taco -- --fixture` grava dados de teste: nesse caso o app mostra uma faixa de
aviso e `npm run build` falha, para que o fixture nunca seja publicado.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Valida os dados, exporta o site estático para `out/` e gera o service worker |
| `npm start` | Serve `out/` em http://localhost:4173 |
| `npm run lint` · `npm run typecheck` | ESLint e TypeScript |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Fluxos, axe e PWA (Playwright), sobre o `out/` já gerado |

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/app/` | Rotas: Calcular (`/`), Frutas, ficha da fruta e Prescrições |
| `src/domain/` | Motor de cálculo e regras sobre frutas, em funções puras |
| `src/features/` | Telas de cada fluxo (calcular, frutas, prescrições) |
| `src/storage/` | Persistência no navegador e estado compartilhado |
| `src/ui/` | Componentes de interface reutilizáveis |
| `src/i18n/` | Todos os textos da interface (pt-BR) |
| `src/data/` | Dataset gerado a partir da TACO |
| `scripts/` | Importação da TACO, validação dos dados e geração do service worker |
| `e2e/` | Testes Playwright |

## Stack

Next.js com exportação estática, no lugar do Vite sugerido na especificação: o projeto já
nasceu assim e atende às metas. O service worker é gerado por `scripts/gerar-sw.ts`.
O site funciona em qualquer hospedagem estática, desde que publicado na raiz do domínio.
