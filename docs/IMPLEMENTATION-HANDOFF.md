# LIFE ENGINE — IMPLEMENTATION HANDOFF

> Documento de continuidade. Leia primeiro ao retomar (pessoa ou nova sessão do Claude).
> Atualizado: 01/11/2026 · Branch: `claude/life-engine-foundation`.

## 1. Estado atual

| Área | Estado |
|---|---|
| Fase 1 (fundação) | Fases 1, 1.1 e 2 (parte 1) completas; testes: 60 unitários, 22 de banco, 26 E2E |
| Integração com IA real | 🟡 Implementada; testada com dublê da Anthropic (formato SSE oficial). **Nenhuma chamada real feita** (sem chave) |
| Ingestão Apple Saúde | 🟡 Endpoint e Atalho documentados; testado via HTTP; não testado com iPhone real |
| Google Agenda | 🟡 Implementada; testada com dublê fiel aos endpoints oficiais; não testada com sua conta Google |
| Implantação | ⛔ Depende de você (Supabase + Vercel + chave de IA; Google opcional) |

## 2. O que você precisa fazer (só o necessário)

1. **Supabase** (plano Free, sem custo): criar projeto (região São Paulo, se disponível).
   - SQL Editor → executar, em ordem, os arquivos de `supabase/migrations/` (`20261101…_init.sql`, `20261102…_google_calendar.sql`, `20261103…_phase2.sql`); depois, em Authentication, deixe MFA/TOTP habilitado (padrão).
   - Authentication → Sign In / Providers: manter **Email** ativo e **desativar "Allow new users to sign up"**.
   - Authentication → Users → **Add user** (seu e-mail + senha forte, marcar como confirmado).
   - Project Settings → API: copiar URL e chave *publishable* (ou *anon*).
2. **Chave de IA** (créditos de API são cobrados à parte de Claude Pro/ChatGPT Plus):
   - Anthropic Console → criar chave; **definir limite de gasto mensal no painel** (ex.: US$9 ≈ R$50) como segunda barreira.
   - OpenAI é opcional; se usar, confirme os preços de GPT-5.4 mini/nano no painel (PEN-19).
3. **Vercel** (Hobby, sem custo): importar o repositório, branch desejada, e definir variáveis (ver `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OWNER_EMAIL`, `ANTHROPIC_API_KEY`
   (opcionais: `OPENAI_API_KEY`, `AI_MONTHLY_BUDGET_BRL`, `USD_BRL_RATE`, `AI_PRICING_OVERRIDES`). Deploy.
   O app nasce protegido: sem login do `OWNER_EMAIL`, nada é acessível.
4. **Google Agenda** (opcional, sem custo) — Google Cloud Console:
   - Criar projeto → *APIs e serviços* → ativar **Google Calendar API**.
   - *Tela de consentimento OAuth*: tipo **Externo**, escopo `.../auth/calendar.events`, seu e-mail como usuário de teste e depois
     **Publicar o app ("Em produção")** — em modo Teste o acesso expira a cada 7 dias (R-39). Uso pessoal não exige verificação;
     o Google mostra uma vez o aviso de "app não verificado".
   - *Credenciais* → ID do cliente OAuth → **Aplicativo da Web** → URI de redirecionamento
     `https://SEU-DOMINIO/api/integrations/google/callback`.
   - Na Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` (ex.: `https://SEU-DOMINIO`) e `TOKEN_ENCRYPTION_KEY`
     (gerar com o comando do `.env.example`; guarde-a no gerenciador de senhas).
   - No app: Ajustes → **Conectar Google Agenda**.
5. **iPhone** (opcional): Ajustes do app → gerar token → montar Atalho (instruções na própria página) → automação diária.
6. **Me diga**: problemas concretos de outros domínios (PEN-12).

## 3. Como rodar localmente
```bash
npm install && cp .env.example .env.local && npm run dev
npm test && npm run test:db
# E2E (Docker + Postgres 16 locais):
bash scripts/e2e/start-stack.sh && bash scripts/e2e/restart-app.sh && node scripts/e2e/run-e2e.mjs
```
Atenção ao editar scripts: não use `pkill -f` com padrões que aparecem no próprio comando (mata o shell).

## 4. Mapa do código
```
src/proxy.ts                     sessão + proteção de rotas
src/lib/auth.ts                  requireOwner / ownerOrNull (DAL)
src/lib/ai/                      pricing, budget, router, engine, providers/
src/lib/intelligence/            persona+contexto, extração, prompts de síntese
src/lib/memory/policy.ts         política de memória
src/lib/governance/              matriz de permissões, auditoria
src/lib/insights/rules.ts        regras determinísticas (UC-01, UC-02, conflitos…)
src/lib/google/calendar.ts       cliente OAuth/Calendar (fetch) + lógica pura
src/lib/crypto.ts                cifragem de tokens
src/lib/services/                agenda (calendar.ts), carregamento de contexto, gravação de memória, espaços, motor de avisos
src/app/actions.ts               todas as mutações (zod + auditoria)
src/app/api/                     chat (SSE), synthesis, ingest/health, export
src/app/(app)/                   páginas: ambiente, spaces, goals, memory, context, settings
src/components/                  presença, shell, conversa, síntese, sinais, constelação
supabase/migrations/             esquema + RLS + funções
scripts/                         test-db, e2e/ (stack local, dublê, Playwright)
```

## 5. Convenções
- Toda chamada de IA passa por `runAI` (orçamento, roteamento, registro). Nunca chamar SDKs direto.
- Toda mutação: Server Action com `requireOwner()` + zod + `audit()`.
- Nova ação do agente: adicionar à matriz em `permissions.ts` (padrão = proibida) e testar.
- Nova tabela: `user_id default auth.uid()`, RLS `owner_all`, teste em `scripts/test-db.mjs`, incluir em `/api/export`.
- Documentar decisões em `DECISION-REGISTER.md` e mudanças em `CHANGELOG.md`.

## 6. Próximo ciclo sugerido
1. Primeira validação com IA real: ajustar persona e prompt de extração a partir de conversas reais; medir custo/turno.
2. Ativar MFA em Ajustes e instalar como app (Compartilhar → Adicionar à Tela de Início).
3. Fase 3: pesquisa externa com citações e Opportunity Radar (precisa de PEN-12/PEN-18: onde procurar oportunidades).

## 7. Prompt de continuidade (nova sessão)
> Estamos desenvolvendo o LIFE ENGINE. Leia `docs/IMPLEMENTATION-HANDOFF.md`, `docs/DECISION-REGISTER.md` e `docs/DEVELOPMENT-ROADMAP.md`
> antes de responder. Trate decisões confirmadas como fonte de verdade, rode `npm test && npm run test:db` e continue o próximo ciclo.
