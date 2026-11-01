# LIFE ENGINE

Sistema de inteligência pessoal, privado e de usuário único. O **JARVIS** é um conselheiro estratégico — racional, crítico e direto — que
conecta os onze domínios da sua vida com o objetivo de **equilíbrio em 1–3 anos**, não de produtividade máxima.

- Next.js 16 (App Router) + TypeScript + Tailwind v4 · Supabase (Postgres + Auth + RLS) · Vercel
- IA na nuvem (Anthropic e OpenAI) via **AI Router** com teto rígido de **R$50/mês**
- **Radar de oportunidades** (cursos, eventos, experiências) com pesquisa real na web e links verificados
- **Finanças leves** (gasto rápido, meta, ritmo do mês) e **espaços guiados** (carreira, dinheiro, propósito)
- Integração com **Google Agenda** (leitura; criação de eventos só com sua confirmação)
- Interface **Ambient Intelligence**: presença dinâmica do JARVIS, Intelligence Spaces, sinais, equilíbrio

## Começar

```bash
npm install
cp .env.example .env.local     # preencha as variáveis
npm run dev
```

Implantação, Supabase e checklist: **[docs/IMPLEMENTATION-HANDOFF.md](docs/IMPLEMENTATION-HANDOFF.md)**.

## Testes

```bash
npm test                 # unitários (roteador, orçamento, memória, regras, contexto)
npm run test:db          # migrations + RLS num Postgres 16 descartável
bash scripts/e2e/start-stack.sh && bash scripts/e2e/restart-app.sh && node scripts/e2e/run-e2e.mjs   # E2E (Docker)
```

## Documentos

| Documento | Conteúdo |
|---|---|
| [MASTER-VISION](docs/MASTER-VISION.md) | Visão consolidada |
| [PRODUCT-SPECIFICATION](docs/PRODUCT-SPECIFICATION.md) | Requisitos e comportamento |
| [SYSTEM-ARCHITECTURE](docs/SYSTEM-ARCHITECTURE.md) | Arquitetura, custos, limites |
| [AI-MEMORY-DESIGN](docs/AI-MEMORY-DESIGN.md) | Inteligência central, identidade, memória, roteador |
| [SECURITY-GOVERNANCE](docs/SECURITY-GOVERNANCE.md) | Ameaças, permissões, autonomia |
| [DEVELOPMENT-ROADMAP](docs/DEVELOPMENT-ROADMAP.md) | Fases e critérios de aceite |
| [DECISION-REGISTER](docs/DECISION-REGISTER.md) | Decisões (DEC-xxx) |
| [RISK-ASSESSMENT](docs/RISK-ASSESSMENT.md) | Revisão crítica e riscos |
| [CHANGELOG](docs/CHANGELOG.md) | Histórico |
| [IMPLEMENTATION-HANDOFF](docs/IMPLEMENTATION-HANDOFF.md) | Estado atual e como continuar |
