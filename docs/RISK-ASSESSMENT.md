# LIFE ENGINE — RISK ASSESSMENT (revisão crítica / red team)

> Prompt 7. G = gravidade, P = probabilidade (A/M/B). Inclui riscos herdados (R-xx de `00-contexto.md`) e novos.

| ID | Problema | G | P | Como detectar | Mitigação aplicada | Decisão |
|---|---|---|---|---|---|---|
| R-10 | Escopo grande demais para uma pessoa | A | A | Fases atrasando | Fase 1 cortada ao núcleo; módulos depois | Manter cortes |
| R-18 | Apple Saúde sem API web | A | — | — | Atalho iOS + endpoint com token (DEC-T04) | Resolvido p/ leitura diária; testar com iPhone real |
| R-02/04 | Sensíveis × IA na nuvem | A | M | Revisar memórias "sensível" | Níveis normal/sensível/restrito; restrito nunca sai (E2E) | Resolvido v1 |
| R-21 | Correlações espúrias | A | A | Avisos contestados | n mínimo, n exibido, linguagem de hipótese | Manter |
| R-05 | Estourar orçamento de IA | A | B | Painel de orçamento | Teto rígido, diário, pior caso, rebaixamento (unit+E2E) | Resolvido |
| R-08 | Inferência errada vira identidade | M | M | Aba "A revisar" | Hipótese ≤0,6; valores inferidos exigem confirmação | Resolvido v1 |
| R-22 | Valor depende de abrir o app | M | A | Dias sem abertura | Ambiente útil em 10 s; síntese pronta; Atalho mantém dados | Aceito (DEC-026) |
| R-07 | Questionamento passa do limite | M | M | Feedback do usuário | Temas protegidos no prompt (DEC-T17) | Ajustar prompt com uso real |
| R-30 | **Supabase Free pausa após ~7 dias** sem atividade | M | M | App não carrega | Uso diário/Atalho; documentado; restauração manual | Aceito; Pro só com autorização |
| R-31 | Preços OpenAI não confirmados no painel | M | M | Divergência de custo | Marcados "confirmar"; Anthropic é o padrão; overrides | Usuário confirmar (PEN-19) |
| R-32 | Mudanças de API dos provedores (modelos/params) | M | M | `ai_usage.ok=false` | Fallback entre provedores; IDs centralizados no catálogo | Monitorar |
| R-33 | Estimativa de tokens (chars/3,5) imprecisa | B | M | Custos reais vs. estimados | Custo real registrado com tokens do provedor; margem no pior caso | Aceito |
| R-34 | Sem backups automáticos no Free | A | B | — | Exportação JSON; pg_dump manual | Usuário exportar semanalmente |
| R-35 | Senha única sem MFA | M | B | Logins estranhos | Senha forte; MFA na Fase 2 | Planejado |
| R-36 | Falha de auditoria/uso silenciosa (insert falha) | M | B | Logs `[ai_usage]` | Log de erro; gasto subestimado só nesse caso | Monitorar |
| R-37 | Painel virar "dashboard que exige manutenção" | M | M | Seções vazias | Ambiente mostra só sinais e 3 toques; nada obrigatório | Manter minimalismo |
| R-38 | Extração grava memórias de baixa qualidade | M | M | Aba Memória | Máx. 5/turno, deduplicação, revisão fácil | Ajustar prompt com uso real |
| R-39 | App OAuth do Google em modo "Teste": **refresh token expira em 7 dias** | M | A | Agenda com status "erro" | Publicar o app como "Em produção" (uso pessoal; aviso de app não verificado aparece uma vez) | Usuário publicar |
| R-40 | `TOKEN_ENCRYPTION_KEY` perdida/trocada | M | B | Erro ao sincronizar | Reconectar a agenda | Guardar a chave no gerenciador de senhas |
| R-12 | Manutenção em 1–3 anos | B | M | Dependências desatualizadas | Stack mainstream, testes automatizados, docs | Manter |

## Cortes de escopo que preservam a essência
Sem agenda, web, voz/imagem, embeddings e cron na Fase 1 — o JARVIS já aconselha com memória, objetivos, saúde e equilíbrio.

## Avaliação objetiva
- **Pronto**: núcleo funcional com testes reais de RLS, autenticação, memória, roteador, orçamento, ingestão e interface.
- **Fraco**: nenhuma chamada a provedor real foi feita nesta sessão (sem chaves) — integração validada só com dublê fiel ao formato SSE;
  UC-01/02 com dados reais de iPhone não testados; prompt da persona sem calibração com uso real.
- **Impede uso real hoje**: criar projeto Supabase, aplicar migration, configurar variáveis na Vercel e uma chave de API (ações do usuário).
