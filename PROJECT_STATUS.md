# StudyOS — Project Status

Last updated: 2026-09-14

## Fase atual

Fase 5 concluída (Matérias + Tópicos), avançando para Fase 6 (Tarefas).

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
- **Testes**: Playwright configurado (`e2e/core-flow.spec.ts`) cobrindo o
  fluxo completo registro → criar matéria → criar tópico → mudar status →
  logout → login → persistência. Passando.

## Em andamento / próximos passos (ordem planejada)

1. Fase 6 — Tarefas (CRUD, status, filtros/ordenação)
2. Fase 7 — Cronograma/calendário (dia/semana/mês)
3. Fase 8 — Sessões de estudo + modo foco + Pomodoro (alimentando
   `StudyEvent`)
4. Fase 9 — Provas/deadlines (`Exam` + `ExamTopic`, contagem regressiva,
   % de preparação)
5. Fase 10 — Estatísticas (derivadas de `StudyEvent`, sem números
   inventados)
6. Fase 11 — Revisão espaçada com `ts-fsrs` (já instalado, ainda não
   usado) sobre `ReviewState`/`ReviewLog`
7. Fase 12 — Curva do esquecimento (sempre rotulada como estimativa)
8. Fase 13 — Mapa de conhecimento
9. Fase 14 — PWA (manifest, ícones, service worker, offline básico)
10. Fases 15–21 — Study Events já existe como modelo central; Anki
    (arquitetura de conector local), hub de fontes, SanarFlix (links
    manuais), motor de planejamento, recomendações, arquitetura de IA
11. Fases 22–26 — offline/sync, testes completos, auditoria de
    segurança, polimento visual, auditoria final

## Limitações conhecidas / decisões pendentes do usuário

- **Sem Supabase por enquanto** (escolha explícita do usuário). Banco é
  SQLite local em `prisma/dev.db` (não versionado). Quando o usuário
  quiser sincronização real entre dispositivos, será necessário criar um
  projeto Supabase (ou Postgres próprio) e migrar — a arquitetura já está
  preparada para isso.
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
