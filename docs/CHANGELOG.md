# LIFE ENGINE — CHANGELOG

## 0.1.0 — 01/11/2026 · Fase 1: fundação

### Concepção
- Prompts 0–8 consolidados: MASTER VISION, PRODUCT SPECIFICATION, SYSTEM ARCHITECTURE, AI & MEMORY DESIGN, SECURITY & GOVERNANCE,
  DEVELOPMENT ROADMAP, DECISION REGISTER (DEC-032–037, DEC-T01–T24), RISK ASSESSMENT.
- Pendências resolvidas por decisão técnica: PEN-01, 03, 04, 05, 06, 07, 08, 09, 11, 13, 14, 17.

### Construído
- Next.js 16 + TypeScript + Tailwind v4; proxy de sessão; cabeçalhos de segurança; `noindex`.
- Supabase: 16 tabelas com RLS, auditoria append-only, FTS em português, funções `match_memories`, `ai_spend`, `ingest_health_daily`.
- Autenticação de usuário único (`OWNER_EMAIL`) em login, proxy e DAL.
- AI Engine + Router (Anthropic Haiku/Sonnet/Opus 5.5, OpenAI GPT-5.4 nano/mini) com fallback e orçamento rígido de R$50/mês.
- Inteligência central: persona do JARVIS, contexto pessoal com orçamento de tokens, conversa em streaming (SSE).
- Memória: extração pós-conversa, política (declarado/hipótese/sensível/restrito), revisão, exportação.
- Objetivos, projetos, decisões; propostas do agente com confirmação.
- Regras: treino parado (UC-02), sono × provas (UC-01), conflitos de prazo, projetos parados, domínio baixo.
- Interface Ambient Intelligence: presença com 6 estados, ambiente, Workspace State, Intelligence Spaces, contexto, ajustes.
- Ingestão de saúde por Atalho do iOS com token revogável.

### Testes
- 40 unitários (Vitest), 19 de banco (Postgres 16), 21 E2E (Playwright + GoTrue + PostgREST + dublê da Anthropic).

### Corrigido durante os testes
- Formulários perdiam dados após erro (reset automático do React 19).
- Conta não autorizada ficava com sessão ativa após login.
- Conversa expandida transparente sobre o ambiente; rótulos da constelação cortados; slider de equilíbrio não registrava o valor inicial;
  divergência de hidratação em Ajustes; pré-renderização tentando acessar o Supabase no build.
