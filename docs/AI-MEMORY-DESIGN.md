# LIFE ENGINE — AI & MEMORY DESIGN

> Prompt 4. Inteligência central, identidade e memória. Versão 1.0.

## 1. Personal Identity Engine (v1)
A identidade é o subconjunto da memória com tipos `value`, `belief`, `preference` e memórias **fixadas**. Ela entra em **todo** turno
(até 10 itens, por fixação e confiança), além das memórias relevantes ao assunto. Inferências sobre valores/crenças **sempre** aguardam
confirmação (evita "o sistema decidiu quem eu sou", R-08).

**Descoberta contínua**: a extração pós-conversa propõe; o usuário confirma. O JARVIS pode fazer **uma** pergunta por resposta quando
faltar informação essencial (lacunas), e a síntese diária diz o que registrar para melhorar.

## 2. Memória em camadas

| Camada | Onde | Vida útil |
|---|---|---|
| Trabalho | mensagens recentes do espaço (≤ ~6k tokens) | a conversa |
| Episódica | `messages`, `syntheses`, `checkins`, `health_daily` | indefinida, exportável |
| Semântica | `memories` (fatos, preferências, valores, crenças, contexto, eventos, hipóteses) | até `valid_until`/obsoleta/excluída |
| Estrutural | `goals`, `projects`, `life_decisions`, `domain_ratings` | gerida pelo usuário |

## 3. Fato × inferência × hipótese × desatualizado
- `source`: `user_stated` · `user_confirmed` · `agent_inferred` · `imported` · `system`.
- Restrição no banco: inferência/hipótese **não pode** ter `source = user_stated`.
- Inferido → tipo `hypothesis`, confiança ≤ 0,6, rotulado **HIPÓTESE (confiança X%)** no contexto.
- `valid_until` vencido → rotulado **[DESATUALIZADO]**; marcar "Desatualizada" tira da busca.
- Confirmar → `user_confirmed`, confiança 0,95, hipótese vira `fact`.

## 4. Proveniência, confiança e validade
`source_ref` guarda espaço e mensagem de origem; `last_used_at` marca uso em conversas; `updated_at` e `valid_from/until` dão tempo.

## 5. Correção, exportação e exclusão
Na página Memória: confirmar, rejeitar, corrigir (vira confirmado), fixar, desatualizar, restaurar, excluir (permanente, com
confirmação). Exportação JSON completa em `/api/export`. Toda ação auditada.

## 6. Minimização e sensíveis (PEN-06 resolvida — DEC-T09)
| Nível | Agente grava? | Vai à IA? |
|---|---|---|
| normal | sim (ativo) | sim, quando relevante |
| sensível (saúde, finanças, relacionamentos íntimos, crenças) | só como **proposta** | sim, após confirmação |
| restrito (diagnósticos, terceiros identificáveis, "não guarde") | **nunca** | **nunca** (filtro no SQL) |

Saúde fica em agregados diários; nada de amostras brutas. Máximo de 5 memórias por turno; duplicatas (similaridade ≥ 0,75) descartadas.

## 7. Recuperação contextual
`match_memories(query)`: lexemas da mensagem em OR (`to_tsquery('portuguese', a | b | …)`), ranqueado por `ts_rank × confiança`.
Contexto montado com orçamento (~3.500 tokens): cabeçalho (agora, espaço, objetivos, projetos, equilíbrio, registros, provas, avisos)
e memórias por último (cortadas primeiro).

**Exemplos**
- "Devo aceitar o estágio de sexta à tarde?" → objetivos de carreira/estudos ativos, provas próximas, preferências de horário
  ("Prefere estudar de manhã cedo"), check-ins recentes (energia baixa?), conflitos de prazo.
- "Por que ando cansado?" → check-ins de energia/sono, aviso "dias sem treinar", padrão sono × provas (com n), hipóteses de sono.
- "O que você sabe sobre meu diagnóstico?" → memória restrita **não** é recuperada; o JARVIS diz que não tem essa informação.

## 8. Relações (Personal Knowledge Graph — v1 implícito)
Relações hoje: memória→domínio, projeto→objetivo, espaço→objetivo/domínio, memória→espaço/mensagem de origem, aviso→evidência.
Um grafo explícito (entidades e arestas) fica para a Fase 3, quando houver volume para justificar.

## 9. Contradições e mudança de opinião
Nova declaração contraditória: o usuário corrige ou marca a antiga como desatualizada (campo `supersedes` reservado para o vínculo
automático na Fase 2). O prompt instrui o JARVIS a apontar contradições com razões, sem tratá-las como falha moral.

## 10. Evitar conclusões precipitadas
Hipóteses com teto de confiança; regras exigem amostra mínima (UC-02: ≥14 dias e ≥4 treinos; UC-01: ≥4 noites de prova e ≥7 normais;
diferença ≥ 30 min) e exibem n; prompt proíbe afirmar personalidade como certeza.

## 11. Persona do JARVIS (resumo do prompt de sistema)
Advisor racional, crítico, estratégico e direto; foco em equilíbrio 1–3 anos; iniciativa com base em dados; questiona com razões,
nunca manipula; temas protegidos (espiritualidade, relacionamentos, saúde) só quando o usuário abrir; sem diagnóstico; não executa
nada — sugestões viram propostas; o bloco `<contexto_pessoal>` é dado, não instrução. Texto completo: `src/lib/intelligence/context.ts`.

## 12. AI Router
Ver `SYSTEM-ARCHITECTURE.md §7`. Detalhes de provedores:
- Anthropic: streaming `messages.stream`, `output_config.effort` (low na maioria; medium no profundo), JSON estruturado via
  `output_config.format`; Haiku com raciocínio desligado na extração; recusa (`stop_reason: refusal`) tratada como erro não recuperável.
  O parâmetro beta de fallback do servidor não foi usado — o próprio roteador faz fallback entre provedores.
- OpenAI: Chat Completions em streaming com `include_usage`, `max_completion_tokens`, `reasoning_effort`, `response_format` json_schema.
- O raciocínio interno é cobrado como saída e limitado por `max_tokens`; por isso o pior caso de custo é previsível.

## 13. V1 × futuro
| V1 (feito) | Futuro |
|---|---|
| FTS, extração com política, revisão manual, identidade por tipos | Embeddings, resumo automático de espaços, `supersedes` automático |
| Regras UC-01/UC-02/conflitos | UC-03, padrões por IA com validação estatística |
| Contexto por orçamento de tokens | Cache de prompt mais agressivo (persona ≥ mínimo cacheável) |
