# LIFE ENGINE — SYSTEM ARCHITECTURE

> Prompt 6. Versão 1.0 · 01/11/2026. Fontes verificadas nesta data; ver "Verificação".

## 1. Componentes

```
 Navegador (desktop/celular)            iPhone (Atalhos)
   │  HTML/RSC + SSE                      │ POST /api/ingest/health (Bearer token)
   ▼                                      ▼
 ┌──────────────────────── Vercel (Next.js 16, Node) ─────────────────────────┐
 │ proxy.ts ── renova sessão Supabase, checagem otimista de dono              │
 │ Páginas (RSC) ── requireOwner() (DAL) ── leitura com RLS                   │
 │ Server Actions ── zod + requireOwner + auditoria                           │
 │ /api/chat (SSE) ─┐                                                         │
 │ /api/synthesis ──┼─► Inteligência central: context-loader → persona+contexto│
 │                  │      → AI Engine: orçamento → Router → Provedor (fallback)│
 │                  │      → extração → política de memória + permissões       │
 │ Motor de regras (determinístico) ── avisos                                 │
 └───────────────┬──────────────────────────────────┬─────────────────────────┘
                 │ supabase-js (JWT do usuário)     │ HTTPS (chaves só no servidor)
                 ▼                                  ▼
       Supabase: Postgres + Auth + RLS        Anthropic API · OpenAI API
```

## 2. Responsabilidades

| Componente | Arquivo(s) | Responsabilidade |
|---|---|---|
| Proxy | `src/proxy.ts` | Sessão, redirecionamentos, 401 em APIs |
| DAL | `src/lib/auth.ts` | `getUser()` validado + `OWNER_EMAIL` |
| AI Engine | `src/lib/ai/engine.ts` | Único caminho para provedores; registra uso |
| Router | `src/lib/ai/router.ts` | Nível, provedor, fallback, pior caso de custo |
| Orçamento | `src/lib/ai/budget.ts` | Modos, teto diário, teto rígido R$50 |
| Catálogo | `src/lib/ai/pricing.ts` | Modelos, preços, overrides, câmbio |
| Provedores | `src/lib/ai/providers/*` | Streaming, uso de tokens, erros tipados |
| Contexto | `src/lib/intelligence/context.ts` | Persona + contexto pessoal com orçamento de tokens |
| Extração | `src/lib/intelligence/extraction.ts` | Schema JSON + validação zod |
| Política de memória | `src/lib/memory/policy.ts` | Status, proveniência, duplicatas |
| Permissões | `src/lib/governance/permissions.ts` | Matriz auto/confirm/forbidden (negação por padrão) |
| Regras | `src/lib/insights/rules.ts` | UC-01, UC-02, conflitos, projetos parados, equilíbrio |
| Banco | `supabase/migrations/*.sql` | Esquema, RLS, funções `match_memories`, `ai_spend`, `ingest_health_daily` |

## 3. Fluxo de dados (conversa)
1. `POST /api/chat` → valida sessão e corpo → grava mensagem do usuário.
2. Carrega contexto (RLS): memórias por FTS + núcleo de identidade, objetivos, projetos, check-ins 7d, provas 30d, equilíbrio, avisos.
3. `runAI(task=chat)`: lê gasto (`ai_spend`) → `computeBudget` → `route` → provedor em streaming → SSE `route/delta/done`.
4. Grava resposta com modelo/custo; registra `ai_usage`.
5. `runAI(task=extract)` com saída JSON estruturada → `parseExtraction` → `decideMemory` + matriz → grava memórias/propostas → SSE `memory`.

## 4. Modelo de dados
`profiles` · `memories` (tipo, conteúdo, domínio, sensibilidade, status, confiança, origem, `source_ref`, validade, `fts`) · `goals` ·
`projects` · `life_decisions` · `spaces` (1 `ambient` por usuário) · `messages` · `checkins` · `domain_ratings` · `study_events` ·
`health_daily` (agregados) · `insights` (dedupe) · `syntheses` · `proposals` · `ai_usage` · `audit_log` (append-only) · `ingest_tokens` (hash).
Todas com `user_id = auth.uid()` em RLS.

## 5. Autenticação e autorização
Supabase Auth (e-mail+senha), **cadastro desativado no painel**, `OWNER_EMAIL` verificado em três camadas (login, proxy, DAL), RLS
como barreira final. Ingestão de saúde: token aleatório de 256 bits, armazenado como SHA-256, validado em função `security definer`
(a chave pública não basta; sem service role key no app).

## 6. Memória e busca
FTS `portuguese` com termos em OR, ranqueado por `ts_rank × confiança`; exclui restritas, obsoletas, rejeitadas e vencidas. Embeddings
(pgvector) previstos na Fase 2 quando o volume justificar — custo estimado desprezível com modelos de embedding baratos.

## 7. AI Router e custos

| Nível | Anthropic (padrão) | OpenAI (fallback) | Uso |
|---|---|---|---|
| leve | Claude Haiku 5.5 — US$0,10/0,50 por MTok | GPT-5.4 nano — US$0,20/1,25 | extração, títulos, conversa trivial, modo crítico |
| padrão | Claude Sonnet 5.5 — US$2/10 | GPT-5.4 mini — US$0,75/4,50 | conversa estratégica, síntese, revisão |
| profundo | Claude Opus 5.5 — US$4/20 | — | só com `/profundo`, fora do modo economia |

**Estimativa mensal** (câmbio 5,60; uso pessoal intenso: 15 conversas/dia, contexto ~6k tokens, resposta ~700 + raciocínio):
conversa padrão ≈ US$0,02 → ~US$9/mês se todas fossem Sonnet; o roteador manda as triviais para Haiku (~US$0,001). Extração Haiku
≈ US$0,0005/turno. Síntese diária ≈ US$0,015/dia. **Total típico: R$15–35/mês**, com teto rígido em R$50 e teto diário de ~R$5.
- Fixos: R$0 (Vercel Hobby, Supabase Free). Variáveis: só IA. Futuros: Supabase Pro (US$25/mês) se a pausa por inatividade incomodar
  ou o banco passar de 500 MB — **não contratado** (DEC-036).

## 8. Hospedagem e tarefas
Vercel Hobby (uso pessoal, não comercial). Funções com `maxDuration = 60` s. Sem cron na Fase 1: tudo é disparado pela abertura do app
(DEC-T13), o que também evita custo de IA sem leitura.

## 9. Limitações conhecidas
- **Supabase Free pausa o projeto após ~7 dias sem atividade** (fontes de 2026; confirmar no painel). Uso diário evita; o Atalho diário
  de saúde também gera atividade. Restaurar é manual no painel.
- Supabase Free: 500 MB de banco, 2 projetos; backups diários automáticos não incluídos no Free → usar **exportação JSON** periódica.
- Vercel Hobby: limites de duração/invocações suficientes para um usuário; uso comercial proibido.
- Preços OpenAI não confirmados no painel oficial (marcados "confirmar"); corrigíveis via `AI_PRICING_OVERRIDES`.

## 10. Logs, backups, observabilidade
`ai_usage` (custo e falhas), `audit_log`, logs da Vercel (`console.error` com prefixos `[chat]`, `[memory]`, `[insights]`).
Backup: exportação JSON (Memória → Exportar) + `pg_dump` pelo painel do Supabase quando desejado.

## 11. Testes e ambientes
Unitários (Vitest, 40), banco (Postgres 16 descartável, 19), E2E (Playwright contra stack local GoTrue+PostgREST+dublê da Anthropic, 21).
Ambientes: local (`.env.local`) e produção (Vercel). Preview da Vercel deve usar o mesmo `OWNER_EMAIL`.

## 12. Dependência de fornecedores
Provedores de IA intercambiáveis pelo roteador; dados exportáveis em JSON; Postgres padrão (migrations SQL puras) — sair do Supabase
exige trocar Auth e o cliente de dados, não o modelo de dados.

## 13. Alternativas consideradas
| Alternativa | Por que não agora |
|---|---|
| Vercel AI SDK | Abstração extra; precisamos de controle fino de custo/uso por chamada |
| Drizzle/Prisma + conexão direta | Perderia RLS por requisição; pooling em serverless |
| Embeddings desde o início | Custo/complexidade sem volume que justifique |
| Cron para síntese | Gasta IA mesmo sem leitura; abertura do app basta |
| App iOS nativo para HealthKit | Fora do alcance de uma pessoa agora; Atalhos resolvem leitura diária |

## 14. O que NÃO foi construído de propósito
Agenda, e-mail, banco, notificações externas, pesquisa web, voz/imagem, multiusuário, cron, módulos autogerados.

## Verificação (01/11/2026)
Preços Anthropic: tabela oficial (via skill claude-api). OpenAI: anúncio oficial GPT-5.4 mini/nano (painel inacessível desta sessão).
Supabase Free: fontes secundárias de 2026 (supabase.com inacessível desta sessão). Next.js 16.4.3 e @supabase/ssr 0.12: documentação
embarcada nos pacotes instalados.
