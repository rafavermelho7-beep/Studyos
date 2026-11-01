# LIFE ENGINE — CHANGELOG

## 0.4.0 — 01/11/2026 · Fase 3: Radar de oportunidades, finanças e espaços guiados
- DEC-039/040 (respostas do usuário): radar para **cursos e eventos** e **experiências**; problemas declarados: carreira sem rumo,
  dinheiro sem controle, falta de propósito.
- **Radar**: pesquisa real na web (ferramenta web_search da Anthropic, máx. 5 buscas), automática semanal ao abrir o app e manual
  (máx. 2/dia); oportunidades só são aceitas se o link apareceu nos resultados da busca; custo das buscas (US$0,01 cada) entra no
  orçamento; bloqueado em orçamento crítico. Salvar, dispensar, pôr na Google Agenda com um clique.
- **Finanças leves**: gasto rápido (valor + categoria), meta mensal, projeção do mês, aviso de ritmo/meta estourada; só totais por
  categoria vão para a IA.
- **Espaços guiados**: Rumo de carreira, Dinheiro sob controle, Propósito e sentido.
- Revisão semanal passa a considerar dinheiro e propósito.
- Testes: 73 unitários, 23 de banco, 29 E2E.

## 0.3.0 — 01/11/2026 · Fase 2 (parte 1): acompanhamento e memória
- **UC-03**: sessões de estudo (disciplina, minutos, foco) e regra de energia × disciplina, × carga (≥3h vs <1h30) e × sono
  da noite anterior (<6h vs ≥7h); n mínimo 4 por grupo, diferença ≥0,7, n exibido.
- Carga de estudo dos últimos 7 dias no contexto do JARVIS.
- **Resumo automático de espaços** ("Onde paramos") a cada 10 mensagens novas, com modelo leve.
- **Substituição de memória**: declaração explícita que contradiz memória existente marca a antiga como desatualizada
  (reversível, auditada); inferências nunca substituem; memórias fixadas nunca são substituídas automaticamente.
- **Segundo fator (TOTP)** via Supabase Auth MFA: ativar/desativar em Ajustes; com fator ativo, páginas e APIs exigem AAL2.
- **PWA**: manifesto para instalar na tela inicial.
- Testes: 60 unitários, 22 de banco, 26 E2E.

## 0.2.0 — 01/11/2026 · Fase 1.1: Google Agenda
- DEC-038: agenda = Google. OAuth 2.0 (escopo `calendar.events`), tokens cifrados AES-256-GCM, `state` anti-CSRF.
- Sincronização ao abrir (no máximo a cada 30 min) e manual; cópia mínima (título + horário); renovação automática do acesso.
- Agenda dos próximos 7 dias no contexto do JARVIS; "Agenda de hoje" e provas detectadas no Ambiente; provas da agenda nas regras.
- Nova proposta "Evento na agenda": criado no Google somente após "Aceitar"; auditado.
- Desconectar revoga no Google e apaga a cópia local.
- Testes: 51 unitários, 21 de banco, 22 E2E (com dublê de Google OAuth/Calendar).

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
