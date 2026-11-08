# Especificação — Calculadora de Substituição de Frutas (TACO)

Nov 4, 2026 · @Jonas

## 1. Visão geral

Um web app mobile-first que troca ou complementa a fruta prescrita pelo nutricionista mantendo a mesma quantidade de kcal, com dados da tabela TACO e sem backend.

**Problema.** A prescrição diz "65 g de banana prata", mas a pessoa nem sempre tem essa fruta, ou tem só parte dela. Hoje ela faz a conta de cabeça ou desiste da refeição.

**Público.** Pacientes em acompanhamento nutricional, que usam o celular na hora de montar a refeição. Inclui pessoas com baixa visão, leitores de tela e pouca familiaridade com tecnologia.

**Os três modos de uso (casos reais do pedido):**

1. **Substituir** — prescrição 65 g de banana prata; o app lista quanto de cada outra fruta equivale às mesmas kcal.
2. **Complementar** — prescrição 65 g de banana prata, mas só há 30 g; o app calcula as kcal que faltam e quanto de outra fruta completa a refeição.
3. **Combinar várias frutas** — prescrição 65 g de banana, mas só há uva e abacaxi; a pessoa informa quanto vai usar da primeira fruta e o app diz quanto pode usar da segunda (e assim por diante, com saldo restante).

**Dentro do escopo (v1):** frutas da TACO, cálculo por kcal, prescrições salvas, favoritos e recentes no navegador, uso offline, PWA instalável.

**Fora do escopo (v1):** contas de usuário, sincronização entre aparelhos, outros grupos de alimentos, equivalência por carboidrato ou fibra (ver Questões em aberto), recomendações de saúde.

**Aviso obrigatório na interface:** "Esta calculadora apoia, mas não substitui, a orientação do seu nutricionista."

## 2. Regras de cálculo

Todo cálculo é uma regra de três sobre a energia por 100 g da TACO; os três modos são o mesmo motor com entradas diferentes.

**Glossário**

| Termo | Definição |
| --- | --- |
| Prescrição | Fruta de referência + gramas indicadas pelo nutricionista (ex.: 65 g de banana prata) |
| Meta (kcal) | Energia da prescrição; é o valor a ser respeitado |
| Item fixo | Fruta com gramas informadas pelo usuário ("tenho 30 g") |
| Item calculado | Fruta cujas gramas o app calcula para completar a meta |
| Saldo | Meta menos as kcal dos itens fixos |
| kcal/100 g | Campo "Energia (kcal)" da TACO, por 100 g de parte comestível |

**Fórmulas**

Energia de uma porção:

```latex
E = \frac{g \cdot k}{100}
```

onde g = gramas e k = kcal por 100 g. Meta da prescrição e gramas equivalentes de outra fruta:

```latex
M = \frac{g_p \cdot k_p}{100} \qquad g_{eq} = \frac{100 \cdot M}{k_{eq}}
```

Saldo e gramas de cada um dos n itens calculados (o saldo é dividido igualmente em kcal):

```latex
S = M - \sum_{i \in fixos} \frac{g_i \cdot k_i}{100} \qquad g_j = \frac{100 \cdot S / n}{k_j}
```

**Regras de negócio**

- RN-01 — Calcular sempre com precisão total; arredondar só na exibição: gramas ao inteiro mais próximo, kcal com 1 casa decimal (vírgula como separador, pt-BR).
- RN-02 — Gramas aceitas: números > 0 e ≤ 2000, com vírgula ou ponto; vazio = item ainda não preenchido.
- RN-03 — Se S < 0 (itens fixos passam da meta), não calcular itens; mostrar "Você passou X kcal da meta" e quantas gramas do último item fixo removem o excesso.
- RN-04 — Se S = 0, mostrar "Meta atingida" e zerar itens calculados.
- RN-05 — Fruta com kcal ausente ou zero na TACO não pode ser item calculado nem aparecer no ranking de equivalentes.
- RN-06 — Tolerância de exibição: o total final pode diferir da meta em até ±1 kcal por causa do arredondamento; mostrar o total real.
- RN-07 — A fruta da prescrição pode também ser item fixo (modo Complementar).

**Exemplos de referência (viram testes)** — valores TACO 4ª ed.: banana prata crua 98 kcal/100 g, uva Itália crua 53, abacaxi cru 48; confirmar contra o dataset importado.

| Caso | Entrada | Cálculo | Saída esperada |
| --- | --- | --- | --- |
| Substituir | 65 g banana prata | M = 63,7 kcal | Uva Itália 120 g · Abacaxi 133 g |
| Complementar | Meta 65 g banana; fixo 30 g banana (29,4 kcal) | S = 34,3 kcal | Abacaxi 71 g |
| Combinar | Meta 65 g banana; fixo 20 g uva (10,6 kcal); calculado abacaxi | S = 53,1 kcal | Abacaxi 111 g |
| Combinar, 2 calculados | Meta 65 g banana; fixo 20 g uva; calculados abacaxi e maçã Fuji (56 kcal/100 g) | S/2 = 26,55 kcal cada | Abacaxi 55 g · Maçã Fuji 47 g |
| Excesso | Meta 65 g banana; fixo 200 g abacaxi (96 kcal) | S = −32,3 kcal | Aviso RN-03: remover 67 g de abacaxi |

## 3. Fonte de dados e modelo

Os dados vêm da TACO 4ª edição (NEPA/UNICAMP, 2011), convertidos uma vez para um JSON estático versionado no repositório; o app não consulta API externa.

**Pipeline de importação (script `scripts/import-taco`)**

1. Baixar manualmente a planilha oficial da TACO 4ª ed. no site do NEPA/UNICAMP e salvar em `data/raw/` (não buscar automaticamente).
2. Filtrar o grupo "Frutas e derivados".
3. Marcar `tipo = "in natura"` para itens cru/crua e `tipo = "derivado"` para sucos, polpas, doces, secas etc. A v1 mostra só `in natura` por padrão; derivados ficam atrás do filtro "Mostrar derivados".
4. Normalizar valores especiais da TACO: "Tr" (traço) → 0 com `traco: true`; "NA" e "\*" (não analisado) → `null`.
5. Gerar `nomeExibicao` legível ("Banana, prata, crua" → "Banana prata") e `busca` sem acentos e em minúsculas.
6. Gravar `src/data/frutas-taco.json` + `meta` com edição, data de importação e hash do arquivo-fonte.
7. Teste de sanidade: banana prata crua = 98 kcal, abacaxi cru = 48 kcal, uva Itália crua = 53 kcal; falhar o build se divergir.

**Modelo `Fruta`**

| Campo | Tipo | Exemplo | Observação |
| --- | --- | --- | --- |
| id | number | 182 | Número do alimento na TACO (chave estável) |
| nomeTaco | string | Banana, prata, crua | Exatamente como na tabela |
| nomeExibicao | string | Banana prata | Usado na interface |
| busca | string | banana prata crua | Sem acentos, minúsculas |
| tipo | "in natura" \| "derivado" | in natura | Ver passo 3 |
| kcal | number \| null | 98 | Por 100 g; obrigatório para cálculo |
| kj | number \| null | 410 | Exibição apenas |
| carboidratoG | number \| null | 26,0 | Por 100 g |
| proteinaG | number \| null | 1,3 | Por 100 g |
| lipidiosG | number \| null | 0,1 | Por 100 g |
| fibraG | number \| null | 2,0 | Por 100 g |
| traco | string\[\] | \["lipidiosG"\] | Campos que eram "Tr" |

O id 182 e os valores de kJ e fibra são ilustrativos; o script deve gravar o que estiver na planilha.

**Acesso do usuário às informações nutricionais.** Toda fruta tem uma tela de detalhe (seção 5) com a tabela por 100 g e pela porção calculada, o nome original da TACO e a nota de fonte: "Fonte: TACO – Tabela Brasileira de Composição de Alimentos, 4ª ed., NEPA/UNICAMP".

## 4. Requisitos funcionais

Nove requisitos cobrem a v1; cada um tem critérios no formato Dado/Quando/Então para virar teste automatizado.

| ID | História | Prioridade |
| --- | --- | --- |
| RF-01 | Como paciente, quero cadastrar a fruta e as gramas prescritas para usar como referência | Alta |
| RF-02 | Quero ver quanto de cada fruta equivale às kcal da prescrição (Substituir) | Alta |
| RF-03 | Quero informar quanto tenho da fruta prescrita e completar com outra (Complementar) | Alta |
| RF-04 | Quero montar a refeição com várias frutas, fixando gramas de umas e calculando as outras (Combinar) | Alta |
| RF-05 | Quero buscar frutas por nome, sem me preocupar com acento | Alta |
| RF-06 | Quero ver as informações nutricionais de qualquer fruta | Alta |
| RF-07 | Quero favoritar frutas e vê-las no topo | Média |
| RF-08 | Quero ver as frutas que usei recentemente | Média |
| RF-09 | Quero salvar mais de uma prescrição (ex.: "Café da manhã", "Lanche") | Média |

**Critérios de aceite**

- **RF-01** — Dado que não há prescrição, quando abro o app, então vejo o fluxo "Cadastre sua prescrição". Ao escolher banana prata e digitar 65, vejo "63,7 kcal" antes de salvar. Gramas inválidas (RN-02) mostram erro em texto ao lado do campo e bloqueiam o salvamento.
- **RF-02** — Dada a prescrição 65 g de banana prata, quando abro Substituir, então vejo a lista de frutas `in natura` com gramas equivalentes (uva Itália 120 g, abacaxi 133 g). Ordem: favoritos, recentes, depois alfabética; opção de ordenar por "menos gramas" / "mais gramas". A fruta da prescrição não aparece na lista.
- **RF-03** — Dada a prescrição 65 g de banana, quando informo "tenho 30 g" e escolho abacaxi, então vejo "Faltam 34,3 kcal → 71 g de abacaxi". Atalho: o modo abre com a fruta prescrita já como item fixo.
- **RF-04** — Dada a prescrição 65 g de banana, quando adiciono uva como fixo com 20 g e abacaxi como calculado, então vejo abacaxi 111 g. Cada item tem um seletor "Eu informo" / "Calcular". Com 2+ itens calculados o saldo se divide igualmente (RN-03 a RN-05 valem). Um resumo fixo mostra meta, usado e saldo, e se atualiza a cada tecla (sem botão "Calcular"). Limite: 6 itens.
- **RF-05** — Quando digito "maca", então aparecem "Maçã Fuji" e "Maçã Argentina". Busca por prefixo de qualquer palavra; resultado em até 100 ms com a base inteira; "Nenhuma fruta encontrada" quando vazio.
- **RF-06** — Quando toco no nome ou no botão "Info" de uma fruta, então vejo kcal, kJ, carboidratos, proteínas, lipídios e fibras por 100 g e pela porção em uso, nome TACO e fonte. Valores `null` aparecem como "não analisado"; traço aparece como "traços".
- **RF-07** — Quando toco na estrela de uma fruta, então ela vira favorita (estado anunciado ao leitor de tela) e aparece no topo das listas e na aba Favoritas; ao recarregar a página, continua favorita.
- **RF-08** — Quando uso uma fruta em qualquer cálculo (item fixo, calculado ou detalhe aberto), então ela entra no início de "Recentes", sem duplicar, até 10 itens. Há um botão "Limpar recentes" com confirmação.
- **RF-09** — Quando salvo uma segunda prescrição, então escolho entre elas no topo da calculadora; posso renomear, editar e excluir (com confirmação). A última escolhida abre por padrão.

## 5. Telas e fluxos

Seis telas, desenhadas primeiro para 360 px de largura, com navegação por barra inferior de 3 abas: Calcular, Frutas, Prescrições.

&#91;embedded content: fluxo de navegação · 6 telas\]

T2, T4 e T6 são as abas da barra inferior; o seletor e o detalhe devolvem sempre a fruta escolhida para a tela Calcular.

**T1 — Primeiro acesso / Nova prescrição.** Campo de busca de fruta, campo de gramas (teclado numérico, `inputmode="decimal"`), nome opcional da refeição, prévia das kcal e botão "Salvar prescrição".

**T2 — Calcular (tela principal).**

- Topo: seletor da prescrição ativa ("Lanche · 65 g Banana prata · 63,7 kcal").
- Abas segmentadas: Substituir · Complementar · Combinar.
- Substituir: lista de frutas com gramas equivalentes, estrela de favorito e botão Info em cada linha; campo de busca no topo da lista.
- Complementar e Combinar: lista de itens (fruta, seletor "Eu informo" / "Calcular", gramas, kcal do item, remover), botão "+ Adicionar fruta".
- Rodapé fixo de resumo: Meta · Usado · Saldo, com barra de progresso e texto (nunca só cor). Excesso em estado de alerta com ícone + texto.

**T3 — Seletor de fruta (folha inferior / bottom sheet).** Busca com foco automático, seções Favoritas, Recentes e Todas (A–Z), filtro "Mostrar derivados". Cada linha mostra nome e kcal/100 g.

**T4 — Frutas (catálogo).** Mesma lista do seletor, em página; abas Todas · Favoritas · Recentes. Tocar abre T5.

**T5 — Detalhe da fruta.** Tabela nutricional por 100 g e pela porção (gramas editáveis na própria tela), nome TACO, nota de fonte, estrela de favorito e botão "Usar na calculadora".

**T6 — Prescrições.** Lista das prescrições salvas com editar, renomear, excluir e "Nova prescrição". Rodapé com "Apagar todos os meus dados" e o aviso da seção 1.

**Estados obrigatórios em todas as telas:** vazio (com ação sugerida), erro de entrada, armazenamento indisponível (RN da seção 6) e offline (tudo funciona; nada a mostrar).

## 6. Persistência local

Tudo que é do usuário fica no `localStorage` do navegador, numa única chave versionada; nada sai do aparelho.

**Chave:** `calcfrutas:v1`

```json
{
  "versao": 1,
  "prescricoes": [
    { "id": "uuid", "nome": "Lanche", "frutaId": 182, "gramas": 65, "criadaEm": "2026-11-04T10:00:00Z" }
  ],
  "prescricaoAtivaId": "uuid",
  "favoritos": [182, 190],
  "recentes": [190, 182],
  "ultimaComposicao": {
    "prescricaoId": "uuid",
    "modo": "combinar",
    "itens": [
      { "frutaId": 190, "tipo": "fixo", "gramas": 20 },
      { "frutaId": 175, "tipo": "calculado" }
    ]
  },
  "preferencias": { "mostrarDerivados": false, "ordenacao": "padrao" }
}
```

**Regras**

- RP-01 — Guardar só `frutaId` (id TACO), nunca cópias dos valores nutricionais; os dados vêm sempre do JSON da TACO.
- RP-02 — Recentes: máximo 10, mais recente primeiro, sem duplicados (regra em RF-08).
- RP-03 — Favoritos: sem limite; ids que não existirem mais no dataset são descartados ao carregar.
- RP-04 — Salvar a cada mudança (com debounce de 300 ms); restaurar `ultimaComposicao` ao reabrir.
- RP-05 — Toda leitura e escrita dentro de try/catch. Se o armazenamento falhar (modo privado, cota cheia), o app funciona em memória e mostra uma vez: "Não foi possível salvar neste navegador; seus dados valem só nesta sessão."
- RP-06 — JSON inválido ou `versao` desconhecida: função `migrar()` por versão; se não houver migração, guardar cópia em `calcfrutas:backup` e começar do zero.
- RP-07 — "Apagar todos os meus dados" remove a chave após confirmação.
- RP-08 — Privacidade: sem cookies, analytics ou rede depois do primeiro carregamento (exceto atualização do service worker).

## 7. Acessibilidade, não funcionais e stack

A meta é WCAG 2.2 nível AA em todas as telas, verificada por teste automatizado e por um roteiro manual com leitor de tela.

**Acessibilidade (obrigatório)**

- HTML semântico: `<main>`, `<nav>`, um `<h1>` por tela, listas como `<ul>`, tabela nutricional como `<table>` com `<th scope>`.
- Todo campo com `<label>` visível; unidade "g" no rótulo, não só como sufixo visual. Erros ligados via `aria-describedby` e `aria-invalid`.
- Resultado do cálculo anunciado em região `aria-live="polite"`, com debounce de 500 ms para não falar a cada tecla (ex.: "Abacaxi: 111 gramas. Saldo zero.").
- Estrela de favorito: `<button aria-pressed>` com rótulo "Favoritar Banana prata".
- Alvos de toque ≥ 44 × 44 px; contraste ≥ 4,5:1 para texto e 3:1 para ícones e bordas; nada comunicado só por cor.
- Funciona com zoom de 200% e fonte do sistema ampliada sem rolagem horizontal (unidades `rem`).
- Navegação completa por teclado, foco visível, ordem lógica; o bottom sheet prende o foco e fecha com Esc devolvendo o foco ao botão de origem.
- Respeitar `prefers-reduced-motion` e `prefers-color-scheme` (tema claro e escuro).
- `lang="pt-BR"`; números lidos corretamente ("63,7 kcal" com `Intl.NumberFormat('pt-BR')`).
- Roteiro manual: TalkBack (Android/Chrome) e VoiceOver (iOS/Safari) completando os três exemplos da seção 2.

**Não funcionais**

| Requisito | Meta |
| --- | --- |
| Dispositivos | 360 px a 1440 px; Chrome Android, Safari iOS 16+, navegadores desktop atuais |
| Desempenho | Lighthouse mobile ≥ 90 em Performance, Accessibility e Best Practices; JS inicial ≤ 150 KB gzip |
| Offline | PWA com manifest e service worker; funciona sem rede após a 1ª visita; instalável na tela inicial |
| Idioma | Interface em pt-BR; textos centralizados em um arquivo para futura tradução |
| Privacidade | Nenhum dado enviado a servidor (RP-08) |
| Hospedagem | Site estático (ex.: GitHub Pages, Netlify ou Vercel) |

**Stack sugerida** (trocável, desde que atenda as metas acima)

- Vite + React + TypeScript (modo strict).
- CSS Modules ou Tailwind, com tokens de cor validados para contraste.
- `vite-plugin-pwa` para manifest e service worker.
- Vitest para regras de cálculo e persistência; Testing Library para componentes; Playwright + `@axe-core/playwright` para fluxos e acessibilidade em viewport de celular.

**Estrutura de pastas**

```
src/
  data/frutas-taco.json       # gerado pelo script, não editar à mão
  domain/calculo.ts           # funções puras: energia, meta, saldo, equivalentes
  domain/calculo.test.ts      # exemplos da seção 2
  storage/armazenamento.ts    # leitura/escrita, migração, fallback em memória
  features/calcular/          # T2
  features/frutas/            # T3, T4, T5
  features/prescricoes/       # T1, T6
  ui/                         # componentes acessíveis reutilizáveis
  i18n/pt-BR.ts
scripts/import-taco.ts
```

## 8. Entregas, testes e instruções para o agente de IA

O desenvolvimento segue cinco etapas pequenas; cada uma só termina com testes verdes e revisão humana.

**Etapas**

1. **Dados** — script de importação, `frutas-taco.json`, teste de sanidade (seção 3).
2. **Domínio** — `calculo.ts` com funções puras e testes com todos os exemplos da seção 2 e as regras RN-01 a RN-07.
3. **Persistência** — `armazenamento.ts` com RP-01 a RP-08, incluindo testes de falha do `localStorage` e de migração.
4. **Telas** — T1 a T6 na ordem T1 → T2 (Substituir) → T3 → T2 (Complementar, Combinar) → T5 → T4 → T6.
5. **Polimento** — PWA, tema escuro, auditoria axe + Lighthouse, roteiro manual com leitor de tela.

**Definição de pronto**

- [ ] Todos os critérios de aceite da seção 4 cobertos por teste (unitário ou E2E)
- [ ] Zero violações axe sérias ou críticas em viewport 360 × 740
- [ ] Lighthouse mobile ≥ 90 nas três categorias
- [ ] Fluxos funcionando offline e após recarregar a página
- [ ] Roteiro TalkBack e VoiceOver concluído

**Instruções para o agente de IA (colar no início de cada sessão)**

```markdown
Você está implementando a Calculadora de Substituição de Frutas descrita nesta especificação.

Regras:
1. Esta especificação é a fonte da verdade. Se algo estiver ambíguo, pare e pergunte; não invente regra de negócio.
2. Nunca digite valores nutricionais à mão. Use apenas src/data/frutas-taco.json, gerado pelo script.
3. Trabalhe em uma etapa por vez (seção 8). Comece pelos testes do domínio (TDD) usando os exemplos da seção 2.
4. Lógica de cálculo só em src/domain, como funções puras sem React.
5. Todo componente novo deve passar no axe e ser operável por teclado e leitor de tela.
6. Textos da interface em pt-BR, vindos de src/i18n/pt-BR.ts.
7. Acesso ao localStorage só via src/storage, sempre com try/catch.
8. Ao terminar uma etapa: rode lint, testes e build; liste o que foi feito, os IDs de requisito cobertos e as dúvidas abertas.
```

**Questões em aberto**

- O nutricionista quer equivalência também por carboidrato? Se sim, o motor aceita trocar `kcal` por `carboidratoG` sem mudar as fórmulas.
- Incluir frutas que não estão na TACO (ex.: mirtilo) como cadastro manual do usuário? Hoje: não.
- Arredondar gramas para múltiplos de 5 como opção, para facilitar a pesagem?
- Permitir exportar/importar os dados (arquivo JSON) para trocar de aparelho?
