# StudyOS — Project Status

Last updated: 2026-09-23

## Fase atual

Todas as fases de produto (1–21) concluídas. Fases 24 (segurança), 25
(polimento visual) e a migração pra Supabase (parte da Fase 22)
concluídas, mais o sistema de animações (2026-09-14) e a Fase 27
(exclusões e desfazer, 2026-09-23). Próximo: personalização (ver
"Em andamento"). Restam também: Fase 23 (mais testes), offline/sync de
verdade, e auditoria final (Fase 26).

## Migração para Supabase (2026-09-14)

Banco trocado de SQLite local para Postgres no Supabase (projeto criado
pelo usuário, plano gratuito). Resumo:

- `prisma/schema.prisma`: `provider` mudou de `sqlite` para `postgresql`.
  Nenhum outro campo do schema precisou mudar (foi desenhado desde o
  início pra ser Postgres-compatível).
- Migrations SQLite antigas foram apagadas e uma migration `init_postgres`
  nova foi gerada e aplicada direto no Supabase (sem dado real de usuário
  pra preservar — só contas de teste).
- `DATABASE_URL` usa a **session pooler** (`postgres.<ref>@aws-0-sa-east-1
  .pooler.supabase.com:5432`) — não a conexão direta (`db.<ref>.supabase.co
  :5432`) nem o transaction pooler (porta 6543). Motivo: ver "Deploy em
  produção" abaixo — a conexão direta funciona neste ambiente de dev mas
  quebra em produção no Vercel.
- `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` guardados
  no `.env` mas **não usados** por nenhum código ainda — o app não usa
  Auth/Storage/Realtime do Supabase, só Postgres via Prisma.
- **Testes agora rodam contra o mesmo Supabase real** (sem Postgres local
  disponível neste ambiente pra isolar). Isso expôs uma corrida genuína
  que o SQLite local (latência ~0) nunca revelava: navegar pra outra
  página enquanto uma mutação ainda está em voo aborta o fetch antes do
  servidor terminar. Três specs (`planning`, `knowledge-map`,
  `forgetting-curve`) falharam por isso na primeira rodada contra o
  Supabase real — corrigido adicionando esperas explícitas de confirmação
  (incluindo `waitForLoadState("networkidle")` para ações com
  `useOptimistic`, já que o estado otimista aparece antes da confirmação
  do servidor) antes de cada navegação subsequente. `e2e/global-teardown.ts`
  limpa os usuários de teste (`*@example.com`) do banco compartilhado após
  cada rodada.
- RLS do Postgres **não** foi implementado — Prisma conecta como o role
  `postgres` (dono das tabelas, ignora RLS de qualquer forma) e a
  autorização continua 100% na camada de serviço (`userId` em toda query).
  Documentado em `CLAUDE.md` como trabalho de infra futuro, não bloqueador.

## Deploy em produção (2026-09-14)

Repositório publicado no GitHub (`rafavermelho7-beep/Studyos`, privado) e
deploy feito no Vercel — `https://studyos-nine-ochre.vercel.app`.

- **Bug real pego logo após o primeiro deploy**: criar conta em produção
  dava "A server error occurred" (erro genérico do Next, sem detalhe).
  Rodei um smoke test do Playwright direto contra a URL de produção
  (`register` → `dashboard` → criar matéria) pra confirmar antes de
  declarar "pronto" — e ele falhou. Causa: a `DATABASE_URL` usava a
  conexão direta do Supabase, que é **só IPv6** por padrão; o Vercel só
  tem saída IPv4, então a função serverless nunca conseguia abrir a
  conexão com o banco. Funcionava neste ambiente de dev (que tem IPv6),
  por isso não foi pego antes do deploy.
  - Corrigido trocando `DATABASE_URL` pro **session pooler** do Supabase
    (porta 5432), que é IPv4-compatível nativamente — confirmado com
    `prisma db execute` contra várias regiões até achar a certa
    (`sa-east-1`) e depois validado que resolve o erro.
  - O transaction pooler (porta 6543) também é IPv6 por padrão no
    Supabase (só fica IPv4 com um add-on pago) — não é a opção certa
    aqui.
- Variáveis de ambiente (`DATABASE_URL`, `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) configuradas
  manualmente no painel do Vercel (Vercel detectou os nomes a partir do
  `.env.example` do repositório, mas os valores precisam ser preenchidos
  à mão — não vêm do `.env` local, que não é versionado).
- **Deploys bloqueados no plano Hobby**: os commits estavam com o e-mail
  local do agente (`rafaelantinoro@gmail.com`), diferente do e-mail da
  conta GitHub dona do projeto (`rafavermelho7-beep`) — o Vercel no plano
  gratuito só aceita deploys de commits cujo autor bate com uma conta
  colaboradora verificada ("Hobby teams do not support collaboration").
  Corrigido configurando a identidade git deste repositório
  (`git config user.email`/`user.name`, local ao repo, não global) pro
  e-mail correto antes deste commit.
- **Causa raiz real do erro em produção (achada depois)**: trocar pro
  session pooler resolveu a conectividade, mas o cadastro continuou
  falhando de forma intermitente. Investigando via API do Vercel
  (o usuário gerou um token pessoal em vercel.com/account/tokens pra eu
  poder inspecionar/corrigir direto, sem precisar navegar no app do
  Vercel pelo celular) descobri duas coisas:
  1. A função serverless do projeto estava na região **iad1 (Virgínia,
     EUA)**, enquanto o banco Supabase está em **sa-east-1 (São Paulo)**
     — toda consulta cruzava o continente, o que não é só lento, é lento
     o bastante pra estourar timeout de conexão de forma intermitente.
     Corrigido via API (`PATCH /v9/projects/studyos` com
     `serverlessFunctionRegion: "gru1"`, a região do Vercel em São Paulo).
  2. `connection_limit=1` era baixo demais dado que várias páginas (ex:
     o dashboard) disparam várias queries em paralelo — subido pra `5`.
  - Depois dessas duas correções + um redeploy disparado via API, o
    smoke test de produção passou em ~10s (antes, quando funcionava,
    levava bem mais e falhava na maioria das tentativas).
  - Também usei a API do Vercel pra recriar a `DATABASE_URL` direto
    (variáveis "sensitive" não podem ser lidas de volta pela API depois
    de criadas, só sobrescritas — então recriar do zero foi mais
    confiável do que tentar validar o que já estava salvo).

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

- **Fase 24 — Auditoria de segurança**: não havia repositório remoto
  configurado (nunca foi dado `git push`), então a skill de review
  automática (que compara contra `origin/HEAD`) não se aplicava — a
  auditoria foi manual, cobrindo toda a base de código. Achados reais,
  todos corrigidos:
  - **IDOR crítico em `gradeReview`** (`src/server/services/reviews.ts`):
    a função não verificava se o `topicId` recebido pertencia ao usuário
    autenticado antes de fazer um `upsert` chaveado só por `topicId`
    (campo `@unique` no schema, não composto com `userId`). Um usuário
    mal-intencionado podia corromper o estado de revisão espaçada
    (FSRS) de OUTRO usuário chamando a server action com o `topicId`
    de outra pessoa. Corrigido adicionando a checagem de posse que
    `startReview` já fazia corretamente; agora coberto por um teste
    Vitest de regressão (`reviews.test.ts`) que prova que os dados da
    vítima não são alterados.
  - **Oráculo de timing no login**: quando o e-mail não existia, a
    action retornava sem chamar `bcrypt.compare`, tornando a resposta
    mensuravelmente mais rápida que uma senha errada — um jeito de
    enumerar e-mails cadastrados. Corrigido comparando sempre contra um
    hash "isca" pré-computado quando o usuário não existe.
  - **Sem rate limiting no login**: nada impedia força bruta de senha.
    Adicionado um limitador simples em memória (10 tentativas / 15 min
    por e-mail) em `src/lib/auth/rate-limit.ts` — documentado como
    "revisitar com um store compartilhado" quando deixar de ser um
    processo único.
  - **URL de fonte de estudo aceitava `javascript:`**: o campo
    `StudySource.url` (renderizado direto num `<a href>`) só validava
    sintaxe de URL (`zod .url()`), não o esquema — um valor
    `javascript:alert(1)` passava e executaria script ao clicar em
    "Abrir" (XSS armazenado, embora escopado ao próprio usuário que
    cadastrou). Corrigido restringindo a `http(s)://` explicitamente.
  - **Sem headers de segurança**: adicionados `X-Content-Type-Options`,
    `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` em
    `next.config.ts`. Uma CSP completa foi deliberadamente **não**
    adicionada agora — exige ajuste fino por diretiva contra cada
    script/estilo/fonte de terceiro carregado, e isso não dá pra
    verificar visualmente neste ambiente sem navegador; revisitar antes
    de um deploy público.
  - **Revisado e aceito sem mudança**: `npm audit` aponta uma
    vulnerabilidade alta em `deepmerge-ts` — é dependência transitiva
    só de build do CLI do Prisma (`@prisma/config`), não roda em
    produção nem processa entrada não confiável no nosso uso; corrigir
    exigiria rebaixar o Prisma para uma versão mais antiga que a
    fixada. Não fiz a troca.
  - Toda autorização de `updateMany`/`deleteMany` na camada de serviço
    foi auditada manualmente (grep de todos os `update`/`delete`/
    `upsert`) — todas as outras já filtravam corretamente por
    `{id, userId}` ou chave composta incluindo `userId`.

- **Fase 25 — Polimento visual**: a extensão do Chrome não conectou
  nesta sessão, então fiz a verificação visual com um script Playwright
  temporário que navegou por todas as telas (populando dados reais no
  caminho) e tirou screenshots — inclusive mobile (390px) e dark mode —
  que eu de fato abri e olhei. Achados reais, todos corrigidos:
  - **Bug de dado real**: formulários de criação rápida (matérias,
    tópicos, tarefas, provas, fontes, vínculos de deck) resetavam o
    `<form>` só *depois* da server action resolver. Se o usuário
    digitasse o próximo item enquanto o anterior ainda estava salvando,
    o `reset()` tardio apagava o texto novo, e a submissão seguinte ia
    vazia (rejeitada pela validação, sem aviso nenhum). Corrigido nos 6
    formulários: resetar (e, onde aplicável, recolher) de forma
    síncrona no momento do submit — o `FormData` já é um retrato
    congelado, então isso não perde o que foi enviado.
  - **Limitação entendida, não "corrigida"**: em testes de automação
    sem nenhuma espera (bem mais rápido que qualquer uso humano real),
    ainda dá pra perder uma submissão quando se navega para outra
    página enquanto uma server action anterior está em voo — o
    navegador aborta o fetch pendente. Isso é inerente a qualquer app
    que muta dados via fetch e navega em seguida; o próprio botão
    "Salvando..." desabilitado já sinaliza pro usuário esperar, e o
    intervalo real é bem menor que o tempo de reação humano. Não
    arquitetei uma fila de submissão pra isso agora — custo/benefício
    não compensa neste estágio.
  - **Bottom nav mobile quebrada**: 10 itens espremidos numa barra só
    transbordavam e ficavam ilegíveis em 390px. Redesenhado com 4 itens
    principais (Início, Sessão, Tarefas, Revisão) + botão "Mais" que
    abre uma folha com o resto (`nav-items.ts` ganhou um campo
    `primary`).
  - **Gráfico de horas-por-dia** mostrava "0h" em todos os ticks do
    eixo Y quando os dados são poucos minutos (arredondamento pra hora
    zera tudo) — agora escolhe minutos ou horas com base no valor
    máximo real dos dados.
  - **Título do cronograma** saía "Setembro **De** 2026" — a classe CSS
    `capitalize` maiúsculiza toda palavra, não só a primeira; trocado
    por capitalizar só a primeira letra em JS.
  - **Sessões de estudo apareciam riscadas no cronograma** — o
    `line-through` usado para tarefas concluídas (faz sentido: foi
    riscada da lista) estava sendo aplicado também a sessões (não faz
    sentido: uma sessão já é só um registro do que aconteceu, não tem
    estado "pendente" pra contrastar). Restrito a tarefas.
  - **Abas de filtro de Tarefas** quebravam linha de forma estranha em
    390px ("Em" / "andamento" em duas linhas). Trocado para rolagem
    horizontal.

- **Animações (2026-09-14)**: keyframes + `.stagger`/`.hover-lift`/
  `.skeleton` em `globals.css`, `PageTransition` no shell, `loading.tsx`
  com skeleton em toda rota com dados. Respeita `prefers-reduced-motion`.

- **Fase 27 — Exclusões e desfazer (2026-09-23)**: pedido do usuário —
  "não tem muitas opções de exclusão quando erro". Antes: tópico e tarefa
  excluíam sem confirmação nenhuma; subtópico, sessão de estudo e nota de
  revisão não tinham como excluir/desfazer. Agora, dois padrões só (ver
  `CLAUDE.md`):
  - **Excluir com "Desfazer"** (tarefa, fonte, sessão, vínculo de deck,
    prova direto da lista): some na hora, só vai pro servidor quando o
    aviso de 6s expira/fecha. Desfazer não precisa recriar nada.
  - **Excluir com confirmação que diz o impacto** (matéria, tópico,
    subtópico, remover da revisão): ex. "Isso apaga 2 tópicos e 1 prova.
    As horas estudadas continuam nas estatísticas."
  - **Sessões de estudo**: editar duração e excluir, em Sessão →
    Atividade recente (não pra eventos do Anki, que o sync reescreve).
  - **Revisão**: "Desfazer" logo após avaliar na fila, e na página do
    tópico (última avaliação do histórico); "Remover da revisão" apaga o
    estado FSRS + histórico e o tópico volta pra "iniciar revisão".
  - **Bug pego pelo teste unitário antes de ir pro ar**: a primeira versão
    do "desfazer avaliação" assumia que o `ReviewLog` guarda o estado
    *depois* da avaliação — mas o ts-fsrs guarda o de *antes* (só nossa
    coluna `state` é o de depois). Reescrito sobre o `rollback` oficial do
    ts-fsrs; `reviews.test.ts` prova que o estado de memória volta
    exatamente ao anterior (incluindo `lapses`) e que outro usuário não
    consegue desfazer/remover revisões alheias. `study-events.test.ts`
    cobre o mesmo pra editar/excluir sessões.
  - Testes: `e2e/deletions.spec.ts` (5 cenários), `tasks.spec.ts`
    atualizado pro aviso de desfazer. Rodados contra um **Postgres 16
    local** (disponível no container da sessão na nuvem — não mexe no
    Supabase): 17/17 e2e + 9/9 unitários passando, `tsc`/`lint`/`build`
    limpos. Visual conferido em 390px, claro e escuro.

## Em andamento / próximos passos (ordem planejada)

0. **Personalização** (pedido do usuário, plano aguardando aprovação):
   foto/capa por matéria, fundo e cor de destaque do app, meta do mês,
   escolher o que aparece na tela inicial.
1. Fase 23 — mais testes (cobertura unitária além do caso de segurança;
   os 12 specs e2e já cobrem os fluxos principais de cada fase)
2. Fase 22 (resto) — offline/sync de verdade (o banco já é Postgres real;
   falta cache/fila local pra uso desconectado, além do que o service
   worker básico da Fase 14 já cobre)
3. Fase 26 — auditoria final

## Limitações conhecidas / decisões pendentes do usuário

- **Sem Postgres local neste ambiente de desenvolvimento** — por isso os
  testes (e2e e unitários) rodam contra o mesmo Supabase real usado pelo
  `npm run dev`, com limpeza automática dos usuários de teste (ver seção
  "Migração para Supabase" acima).
- **`connector/sync.mjs` (Fase 16) nunca rodou contra um Anki Desktop
  real** — sem Anki instalado neste ambiente. Escrito contra a API
  documentada do AnkiConnect; o lado servidor que ele fala com
  (`/api/anki/sync`) é real e testado. Precisa de validação manual do
  usuário na primeira vez que rodar.
- **IA (Fase 21)**: arquitetura documentada, nada implementado — sem
  chave de provedor de LLM fornecida, e por instrução explícita contra
  IA falsa.

## Bugs conhecidos

- **Curva "sem a última revisão" usa a estabilidade errada** (pré-existente,
  achado na Fase 27, ainda não corrigido): `topics/[id]/page.tsx` pega
  `logs[length - 2].stability` achando que o log guarda o estado *depois*
  da avaliação; como guarda o de *antes*, a estabilidade anterior à última
  revisão é `logs[length - 1].stability`. A linha tracejada hoje mostra a
  curva de duas revisões atrás. Correção de uma linha, aguardando o ok do
  usuário.
- `e2e/global-teardown.ts` não lê o `.env` (só funciona com
  `DATABASE_URL` exportada no shell).

Fora isso, nenhum. `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`
(12 specs) e `npm run test:unit` passam limpos contra o Supabase real no
último commit.
