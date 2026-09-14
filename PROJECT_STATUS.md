# StudyOS — Project Status

Last updated: 2026-09-14

## Fase atual

Fases 1–11 concluídas (scaffold → auth → design system → dashboard →
matérias/tópicos → tarefas → sessões/pomodoro → provas → estatísticas →
revisão espaçada com FSRS). Avançando para Fase 12 (curva do
esquecimento) e Fase 7 (cronograma/calendário).

## Concluído

- **Fase 1 — Arquitetura + scaffold**: Next.js 16 (App Router/Turbopack),
  TypeScript, Tailwind v4 com design tokens próprios (light/dark via
  `prefers-color-scheme`), ESLint. Build de produção limpo, sem warnings.
- **Fase 2 — Banco + autenticação**: Prisma 6.19 + SQLite local
  (Postgres-ready). Auth própria (bcrypt + sessão opaca em cookie
  httpOnly, sem next-auth). Registro, login, logout reais e testados
  ponta a ponta.
- **Fase 3 — Design system (base)**: tokens semânticos de cor, componentes
  `Button`/`Input`/`Textarea`/`Card`/`Badge` com variantes via CVA.
  Sidebar (desktop) + bottom nav (mobile), user menu.
- **Fase 4 — Dashboard (shell)**: saudação dinâmica, estado vazio real
  ("Vamos configurar seus estudos") quando não há matérias, grade de
  matérias reais quando existem. Ainda sem motor de recomendação (depende
  de dados de tarefas/provas/revisão que ainda não existem — de propósito,
  para não simular).
- **Fase 5 — Matérias + Tópicos**: CRUD completo de matérias (criação
  rápida por nome, edição completa: descrição, professor, semestre,
  prioridade, cor). Tópicos e subtópicos (um nível de aninhamento),
  status (NOVO/APRENDENDO/REVISANDO/DOMINADO), exclusão. Autorização
  sempre escopada por `userId` na camada de serviço.
- **Fase 6 — Tarefas**: CRUD completo, criação rápida (só título) +
  detalhes opcionais (matéria, prioridade, prazo), filtros por status
  (Todas/A fazer/Em andamento/Concluídas), "atrasada" derivado em tempo de
  leitura (não armazenado). Checkbox de concluir usa `useOptimistic`.
- **Fase 8 — Sessões de estudo + Pomodoro**: modo Livre (cronômetro
  contínuo, com pausar/retomar) e modo Pomodoro (25/5, 50/10, 90/15 ou
  customizado, com transição automática foco↔pausa; só o tempo de foco
  conta como `StudyEvent`, pausas não). Cada sessão finalizada grava um
  `StudyEvent` real via server action. Tela mostra atividade recente
  (dados reais). Dashboard agora mostra minutos estudados hoje, tarefas
  pendentes e atrasadas — todos derivados de `StudyEvent`/`Task` reais.
  Nota técnica: o timer foi implementado sem `ref` nem `Date.now()`
  lidos durante o render (exigência das novas regras `react-hooks/purity`
  e `react-hooks/refs` do ESLint no Next 16/React 19) — toda leitura de
  relógio acontece dentro do callback do `setInterval`, nunca no corpo
  do componente.
- **Testes**: Playwright cobrindo três fluxos completos —
  `core-flow.spec.ts` (matérias/tópicos + persistência entre sessões),
  `tasks.spec.ts` (CRUD + filtros + conclusão), `sessions.spec.ts`
  (sessão de foco ponta a ponta). Todos passando.

- **Fase 9 — Provas**: CRUD (matéria, nome, data, local), contagem
  regressiva ("X dias", cor muda perto do prazo), associação de tópicos
  da matéria à prova (checklist com `useOptimistic`), % de preparação e
  breakdown 🔴/🟡/🟢 calculados a partir do `status` real dos tópicos
  vinculados (sem números inventados — se não há tópicos associados,
  mostra "Nenhum conteúdo associado ainda" em vez de uma % falsa).
- **Bug real encontrado e corrigido pelos testes e2e**: `new Date("YYYY-MM-DD")`
  interpreta a string como UTC meia-noite; comparado com "agora" em
  timezone atrás de UTC (ex: Brasil), isso subtraía um dia da contagem
  regressiva de provas e afetava o cálculo de tarefa atrasada. Corrigido
  usando `date-fns parseISO` (interpreta como meia-noite local) em vez do
  construtor nativo — ver nota em `CLAUDE.md`. Tarefa "atrasada" agora
  compara contra `endOfDay(dueDate)`, não o instante da meia-noite.

- **Fase 11 — Revisão espaçada (FSRS)**: `ts-fsrs` real (não um algoritmo
  inventado) via `src/server/services/reviews.ts`. Um `ReviewState` por
  (usuário, tópico) espelha um FSRS `Card`; cada avaliação gera também um
  `ReviewLog` (histórico completo, necessário para a curva de
  esquecimento na Fase 12). Curto-prazo (steps de minutos) desabilitado
  de propósito — revisão é por tópico, não por flashcard individual, então
  todo intervalo proposto é de pelo menos um dia. Fila de revisão em
  `/review`: tópicos vencidos mostram % de retenção estimada
  (`get_retrievability`, sempre rotulado como estimativa), avaliação em
  4 botões (Errei/Difícil/Bom/Fácil), e uma lista separada para
  "iniciar revisão" em tópicos que ainda não entraram no sistema.
  Deliberadamente **não** sincroniza automaticamente com o `status`
  manual do tópico (NOVO/APRENDENDO/...) — são dois eixos independentes
  por design, para não inventar uma regra de negócio não pedida.
  Dashboard agora mostra a contagem de revisões pendentes.

- **Fase 10 — Estatísticas**: seletor de período (7/30/90/180/365 dias +
  personalizado via `from`/`to`), tiles de horas estudadas/sessões/dias
  estudados/sequência atual, gráfico de barras horas-por-dia e horas-por-
  matéria (cor de cada barra = a cor que o usuário escolheu para a
  matéria — identidade categórica correta, não uma paleta gerada). Segui
  o skill `dataviz` deste projeto: barras com ponta arredondada de 4px,
  grades horizontais finas e recessivas, tooltip com valor em destaque e
  nome em segundo plano. Cores do gráfico resolvidas via
  `useSyncExternalStore` em cima de `matchMedia`, não via CSS var direto
  no SVG (Recharts escreve atributos de apresentação, que nem sempre
  resolvem `var()` de forma confiável) — ver `use-chart-theme.ts`.
- **Bug de lint pego pela nova regra `react-hooks/set-state-in-effect`**:
  o hook de tema do gráfico originalmente lia `matchMedia` e chamava
  `setState` dentro do corpo de um `useEffect` — reescrito com
  `useSyncExternalStore`, o jeito correto de assinar estado externo do
  navegador sem o anti-padrão de "efeito que só espelha estado".

## Em andamento / próximos passos (ordem planejada)

1. Fase 7 — Cronograma/calendário (dia/semana/mês) — ainda não iniciado;
   tarefas e provas já têm campos de data, falta a visualização de
   calendário propriamente dita
2. Fase 12 — Curva do esquecimento a partir de `ReviewLog`/FSRS (sempre
   rotulada como estimativa)
3. Fase 13 — Mapa de conhecimento
4. Fase 14 — PWA (manifest, ícones, service worker, offline básico)
5. Fases 15–21 — Study Events já existe como modelo central; Anki
   (arquitetura de conector local), hub de fontes, SanarFlix (links
   manuais), motor de planejamento, recomendações, arquitetura de IA
6. Fases 22–26 — offline/sync, testes completos, auditoria de
   segurança, polimento visual, auditoria final

## Limitações conhecidas / decisões pendentes do usuário

- **Migração para Supabase fica deliberadamente para o final** (decisão
  explícita do usuário, reconfirmada em 2026-09-14). Banco é SQLite local
  em `prisma/dev.db` (não versionado) até lá. A migração (Fase 22 —
  offline/sync — é o ponto natural pra isso) exige que o usuário crie um
  projeto Supabase e forneça URL + anon key + service role key; a
  arquitetura já está pronta para o swap.
- **Sem Docker/Postgres disponíveis** no ambiente de desenvolvimento atual.
- **Ícones/PWA** ainda não implementados — não existem assets de ícone
  reais ainda; vai ser feito na Fase 14 com ícones de verdade, não
  placeholders.
- **Anki e SanarFlix**: nenhuma integração implementada ainda (fases 16 e
  18). O modelo de dados (`AnkiDeckLink`, `StudySource`) já existe para
  suportar isso sem remodelagem.

## Bugs conhecidos

Nenhum no momento. `npx tsc --noEmit`, `npm run build` e `npm run
test:e2e` passam limpos no último commit.
