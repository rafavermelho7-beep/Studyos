# StudyOS — Project Status

Last updated: 2026-09-14

## Fase atual

Todas as fases de produto (1–21, exceto Fase 15 que já era o modelo
`StudyEvent` central desde o início) estão concluídas. Restam as fases
de infraestrutura/operação: 22–26 (offline/sync + Supabase, auditoria
de testes, segurança, polimento visual, auditoria final).

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

- **Fase 12 — Curva do esquecimento**: nova página `/topics/[id]` (antes
  os tópicos não tinham rota própria — agora o nome do tópico em
  Matérias e na fila de Revisão leva pra lá). Mostra o estado FSRS
  atual, retenção estimada agora, e um gráfico com duas curvas: a atual
  (usando a estabilidade que a última revisão produziu) e — quando há
  histórico suficiente — uma linha tracejada mostrando como a retenção
  teria caído *sem* essa última revisão, usando a estabilidade anterior.
  Isso responde as duas perguntas do brief ("como minha retenção cai se
  eu não revisar" e "como as revisões estão mudando essa curva") sem
  precisar reconstruir o histórico completo em dente-de-serra. Sempre
  rotulado "(estimativa)" — nunca apresentado como fato medido.

- **Fase 7 — Cronograma**: `/schedule` com visualização de dia, semana e
  mês (navegação anterior/hoje/próximo), unificando tarefas (por
  `dueDate`), provas (por `date`) e sessões de estudo já registradas
  (por `startedAt`) numa única linha do tempo — cada item leva de volta
  para a tela onde pode ser editado. Reorganização por arrastar-e-soltar
  não foi implementada (é um adicional de UX, não a visualização em si);
  por ora a forma de reagendar é editar a tarefa/prova diretamente.

- **Fase 13 — Mapa de conhecimento**: `/knowledge-map`, uma grade por
  matéria de "tiles" coloridos por tópico. Status combina dois eixos
  reais: o `status` manual do tópico E o estado da revisão espaçada —
  um tópico DOMINADO cuja revisão venceu aparece 🔴 (revisão atrasada),
  não 🟢, porque uma revisão vencida é mais urgente que o rótulo manual
  antigo. ⚪ não estudado só quando o tópico nunca entrou em revisão E
  está com status NOVO. Cada tile leva para `/topics/[id]`.

- **Fase 14 — PWA**: `manifest.webmanifest` via `src/app/manifest.ts`
  (convenção nativa do App Router, sem arquivo estático). Ícones reais
  gerados com `next/og` `ImageResponse` (favicon 32px, apple-touch-icon
  180px, e os PNGs 192/512 do manifest incluindo uma variante
  maskable) — nada de placeholder, todos verificados abrindo a imagem
  de verdade. Service worker (`public/sw.js`) com escopo deliberadamente
  limitado: cache-first só para assets estáticos imutáveis
  (`_next/static`, `/icons`), network-first com fallback pra
  `offline.html` em navegações, e **nunca** cacheia dado autenticado —
  cachear página dinâmica por usuário seria um bug de correção/
  privacidade (dado de outra sessão aparecendo offline). Registrado só
  em produção (evita atrito com HMR do `next dev`). Isso é o "offline
  básico" pedido nesta fase — offline com dados reais e sync é Fase 22.

- **Fases 17/18 — Hub de fontes + SanarFlix**: `StudySource` por tópico
  (tipo, título, URL opcional, concluída) gerenciado direto na página do
  tópico, mais `/sources` como visão global agrupada por matéria.
  "Registrar tempo" em uma fonte cria um `StudyEvent` real (`source:
  MANUAL`) — é o único lugar que faz isso, evitando dupla contagem (só
  marcar "concluída" não gera evento). SanarFlix tratado como link
  manual comum, sem scraping nem automação — exatamente como pedido.
  Outro bug de checkbox controlado sem `useOptimistic` (mesma classe do
  bug já visto em Tarefas) foi pego pelo teste e2e e corrigido.

- **Fases 19/20 — Motor de planejamento + Recomendações**: a peça
  central da missão do produto. `src/server/services/planning.ts`
  isola toda a lógica de priorização (nunca espalhada no frontend,
  como pede o brief) num score aditivo combinando sinais reais:
  proximidade de prova vinculada (`ExamTopic`), domínio manual do
  tópico, revisão FSRS atrasada ou retenção estimada baixa, e
  prioridade da matéria. Testado replicando o próprio exemplo do brief
  (`e2e/planning.spec.ts`): prova em 5 dias, um tópico dominado e um
  nunca estudado — o motor corretamente prioriza o não estudado. Score
  é deliberadamente **não** calibrado como uma "porcentagem de
  prontidão" (seria precisão falsa) — só precisa produzir a ordem
  certa. Dashboard agora tem o card "Seu foco agora" (matéria + tópico
  + motivos + botão "Começar sessão" que já pré-seleciona
  matéria/tópico na tela de sessão via query params), lista "Depois
  disso" com as próximas recomendações, e um alerta de "matérias
  negligenciadas" (sem `StudyEvent` nos últimos 7 dias).

- **Fase 16 — Anki**: `Configurações` (nova página, acessível pelo menu
  do usuário) tem geração de chave de API (`sk_live_<id>_<secret>`,
  mostrada uma única vez, só o hash bcrypt do segredo é armazenado) e
  gestão de `AnkiDeckLink` (nome do deck → matéria/tópico, com fallback
  hierárquico por "::" — vínculo num deck "pai" cobre os subdecks).
  `POST /api/anki/sync` autentica pela chave (nunca cookie de sessão,
  já que quem chama é um processo local, não o navegador) e faz
  replace-for-day dos `StudyEvent` de origem ANKI daquele dia, tornando
  ressincronizar idempotente. Lado servidor 100% real e testado
  (`e2e/anki-sync.spec.ts`, inclusive rejeição de chave inválida e
  resolução de subdeck). `connector/sync.mjs` é o processo local que o
  usuário roda na própria máquina — código real contra a API
  documentada do AnkiConnect, mas **nunca rodado contra um Anki Desktop
  de verdade** neste ambiente (não há Anki instalado aqui). Ver aviso
  em `connector/README.md`.
- **Fase 21 — Arquitetura de IA**: deliberadamente sem IA implementada
  (sem chave de provedor fornecida, e o brief é explícito que IA
  falsa é pior que nenhuma). O que existe é a base de dados que uma
  IA precisaria: `StudyEvent`/`ReviewLog` são histórico completo, não
  agregados. Duas das funcionalidades de IA propostas no brief já têm
  versão determinística (não-IA) funcionando: "identificar matérias
  negligenciadas" e "sugerir prioridades", ambas em `planning.ts`.
  Documentado em `CLAUDE.md` onde uma integração de IA real deveria
  entrar (`src/server/services/ai/`, lendo pelos serviços existentes,
  credenciais só no servidor, aumentando o motor determinístico em vez
  de substituí-lo).

## Em andamento / próximos passos (ordem planejada)

1. Fases 22–26 — migração Supabase (fica pro final, por pedido do
   usuário), offline/sync, testes completos, auditoria de segurança,
   polimento visual, auditoria final

## Limitações conhecidas / decisões pendentes do usuário

- **Migração para Supabase fica deliberadamente para o final** (decisão
  explícita do usuário, reconfirmada em 2026-09-14). Banco é SQLite local
  em `prisma/dev.db` (não versionado) até lá. A migração (Fase 22 —
  offline/sync — é o ponto natural pra isso) exige que o usuário crie um
  projeto Supabase e forneça URL + anon key + service role key; a
  arquitetura já está pronta para o swap.
- **Sem Docker/Postgres disponíveis** no ambiente de desenvolvimento atual.
- **`connector/sync.mjs` (Fase 16) nunca rodou contra um Anki Desktop
  real** — sem Anki instalado neste ambiente. Escrito contra a API
  documentada do AnkiConnect; o lado servidor que ele fala com
  (`/api/anki/sync`) é real e testado. Precisa de validação manual do
  usuário na primeira vez que rodar.
- **IA (Fase 21)**: arquitetura documentada, nada implementado — sem
  chave de provedor de LLM fornecida, e por instrução explícita contra
  IA falsa.

## Bugs conhecidos

Nenhum no momento. `npx tsc --noEmit`, `npm run build` e `npm run
test:e2e` passam limpos no último commit.
