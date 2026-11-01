# LIFE ENGINE — DEVELOPMENT ROADMAP

> Prompt 8. Complexidade relativa (P/M/G), sem prazos de calendário (PEN-10 em aberto).
> "Pronto" = implementado + testes da fase passando + documentação atualizada + implantado com acesso protegido.

## Fase 1 — Fundação e primeira prova de valor · **CONCLUÍDA (código)** · G
**Objetivo**: núcleo pequeno e confiável.
**Inclui**: núcleo + auth privada; esquema com RLS; inteligência central; Anthropic+OpenAI; AI Router + orçamento; identidade e memória;
objetivos/projetos/decisões; interface Ambient Intelligence; Intelligence Spaces; painel de contexto; módulos Saúde (ingestão + UC-02 +
UC-01) e Estudos (provas).
**Exclui**: agenda, pesquisa web, voz/imagem, embeddings, cron, multiusuário.
**Aceite**: 40 testes unitários, 19 de banco, 21 E2E passando (✅). Falta: implantação real (⛔ depende de contas/chaves do usuário).
**Avançar quando**: o usuário usar por ~2 semanas com IA real e os custos ficarem dentro do esperado.

## Fase 1.1 — Google Agenda · **CONCLUÍDA (código)** · M
Antecipada da Fase 4 após DEC-038: leitura, detecção de provas, criação com confirmação. Aceite: 51 unitários, 21 de banco, 22 E2E (✅).
Falta: credenciais OAuth do Google (⛔ usuário).

## Fase 2 — Acompanhamento e memória mais inteligentes · M · **parte 1 CONCLUÍDA (código)**
Entregue: UC-03, resumo de espaços, substituição de memória, MFA, PWA (60 unit, 22 banco, 26 E2E ✅).
Pendente: embeddings (DEC-T36), tema claro, importação do StudyOS, calibração com IA real.

- UC-03 energia × estudo: sessões de estudo por disciplina (manual rápido) + correlação com n.
- Resumo automático de espaços (modelo leve a cada ~10 mensagens) e retomada com "onde paramos".
- Embeddings (pgvector) para busca semântica, com custo medido.
- `supersedes` automático: detectar contradição com memória existente e propor substituição.
- MFA (TOTP) no login; tema claro opcional; PWA instalável.
- Importação do StudyOS (se o usuário quiser).
**Aceite**: UC-03 mostra hipótese com n; busca semântica supera FTS em casos de teste; custo extra < R$3/mês.

## Fase 3 — Pesquisa e Opportunity Radar · M
- Pesquisa externa só-leitura (web search do provedor), fontes oficiais priorizadas, conteúdo externo tratado como dado e citado.
- Opportunity Radar por domínio (requer PEN-18/PEN-12: o que é oportunidade e onde procurar).
- Grafo de conhecimento pessoal explícito.
**Aceite**: toda pesquisa citada; teste de injeção em página maliciosa não altera comportamento; custo por pesquisa registrado.

## Fase 4 — Agenda e multimodalidade · G
- Agenda: ✅ entregue na Fase 1.1.
- Voz (entrada), imagens e documentos na conversa, com custo controlado.
**Aceite**: nenhuma escrita na agenda sem clique de confirmação; anexos não ultrapassam limites de custo.

## Fase 5 — Autonomia estrutural controlada · M
- JARVIS propõe novos módulos/regras como especificação; humano revisa e implementa.
- Revisões trimestrais de objetivos e identidade.
**Aceite**: nenhuma mudança estrutural sem commit humano.

## Marcos
| Marco | Fase | Estado |
|---|---|---|
| Núcleo e autenticação | 1 | ✅ |
| Memória e identidade | 1 | ✅ |
| Inteligência e AI Router | 1 | ✅ (provedor real 🟡) |
| Interface adaptativa | 1 | ✅ |
| Gestão de objetivos e projetos | 1 | ✅ |
| Revisões e acompanhamento | 1→2 | 🟠 |
| Módulos especializados (Saúde, Estudos) | 1→2 | 🟠 |
| Pesquisa e Opportunity Radar | 3 | ⬜ |
| Multimodalidade | 4 | ⬜ |
| Autonomia estrutural controlada | 5 | ⬜ |
