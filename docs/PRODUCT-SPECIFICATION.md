# LIFE ENGINE — PRODUCT SPECIFICATION

> Consolida o Prompt 2 (requisitos funcionais) e o Prompt 3 (experiência). Prioridade: **E** essencial · **I** importante · **F** futuro.
> Estado: ✅ implementado e testado · 🟡 implementado, não testado com serviço real · 🟠 parcial · ⬜ planejado · ⛔ bloqueado.

## 1. Capacidades centrais e requisitos

### Acesso e privacidade
| ID | Requisito | Pri. | Critério de aceite | Estado |
|---|---|---|---|---|
| RF-01 | Só o `OWNER_EMAIL` acessa | E | Conta válida não autorizada é barrada e deslogada; anônimo vai a /login; APIs respondem 401 | ✅ E2E |
| RF-02 | Dados isolados por RLS | E | Usuário B não lê/escreve dados de A | ✅ test:db |
| RF-03 | Exportar todos os dados | E | JSON com todas as tabelas, sem hashes de token | ✅ E2E |
| RF-04 | Auditoria append-only | E | Ações de usuário e agente registradas; update/delete impossíveis | ✅ test:db |

### Inteligência central
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-10 | Conversa com streaming em português | E | Texto aparece incrementalmente; pode ser interrompido | ✅ E2E (dublê) · 🟡 provedor real |
| RF-11 | Contexto pessoal relevante em cada turno | E | Prompt inclui objetivos, projetos, registros, provas, equilíbrio e memórias relevantes; restritas nunca | ✅ E2E |
| RF-12 | Roteamento automático de modelo | E | Tarefa/complexidade → nível; orçamento rebaixa; fallback entre provedores | ✅ unit |
| RF-13 | Teto rígido de R$50/mês | E | Bloqueado ≥100%: nenhuma chamada; mensagem clara; funções locais seguem | ✅ unit + E2E |
| RF-14 | Custo de cada chamada registrado | E | `ai_usage` com tokens, US$, R$, sucesso/falha | ✅ E2E |
| RF-15 | Síntese diária | E | Gerada na 1ª abertura do dia, guardada, não recobrada ao recarregar | ✅ E2E |
| RF-16 | Revisão semanal | E | Sob demanda; uma por semana (regenerável) | ✅ E2E |

### Identidade e memória
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-20 | Extração automática pós-conversa | E | Declarado → ativo; inferido → hipótese ≤60%; sensível → aguarda; restrito → descartado | ✅ unit + E2E |
| RF-21 | Revisar memória | E | Confirmar, rejeitar, corrigir, fixar, marcar obsoleta, restaurar, excluir | ✅ (confirmar no E2E) |
| RF-22 | Registro manual com sensibilidade e validade | E | Tipo, domínio, sensível/restrito, válido até | ✅ E2E |
| RF-23 | Proveniência visível | E | Origem, confiança, data, "usado em conversas" | ✅ |
| RF-24 | Sem duplicatas | I | Similaridade ≥0,75 não grava | ✅ unit |
| RF-25 | Busca semântica (embeddings) | F | — | ⬜ Fase 2 |

### Objetivos, projetos, decisões
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-30 | CRUD de objetivos por horizonte, progresso e status | E | Persistência e auditoria | ✅ E2E (progresso) |
| RF-31 | Projetos com próxima ação, vínculo a objetivo | E | idem | ✅ build · 🟠 E2E parcial |
| RF-32 | Registro de decisões (contexto, opções, razão, revisão) | I | idem | ✅ build |
| RF-33 | Propostas do agente exigem confirmação | E | Nada é criado antes de "Aceitar" | ✅ E2E |
| RF-34 | Detecção de conflitos entre objetivos | E | Sobrecarga (>6), prazos ≤14 dias em domínios diferentes, prazo perto de prova | ✅ unit |

### Acompanhamento e contexto
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-40 | Check-in diário (energia, humor, sono, nota) | E | 3 toques; upsert por dia | ✅ E2E |
| RF-41 | Autoavaliação semanal de equilíbrio | E | 0–10 por domínio; índice com ≥5 | ✅ E2E |
| RF-42 | Provas/prazos | E | Cadastro e exclusão | ✅ E2E |
| RF-43 | Ingestão de saúde (Atalho iOS) | E | Token Bearer; até 400 dias; inválido/revogado → 401 | ✅ E2E · 🟡 iPhone real |
| RF-44 | UC-02 treino parado | E | Aviso quando pausa ≥ max(5, 2,5× intervalo típico), com ≥14 dias de dados | ✅ unit + E2E |
| RF-45 | UC-01 sono × semanas de prova | E | Diferença ≥30 min com ≥4 noites de prova e ≥7 normais; mostra n | ✅ unit |
| RF-46 | UC-03 energia × estudo | I | Sessões de estudo + energia; padrão por disciplina, carga e sono com n | ✅ unit + E2E |
| RF-47 | Painel de orçamento e uso | E | Gasto mês/dia, teto diário, últimas chamadas | ✅ E2E |

### Agenda (Google)
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-60 | Conectar/desconectar Google Agenda (OAuth) | E | Tokens cifrados; desconectar revoga e apaga cópia | ✅ E2E (dublê) · 🟡 Google real |
| RF-61 | Ler eventos (−30/+60 dias), só título e horário | E | Cancelados ignorados; títulos sanitizados; fuso local | ✅ unit + E2E |
| RF-62 | Agenda no contexto do JARVIS e no Ambiente | E | Próximos 7 dias no contexto; "Agenda de hoje" no Foco | ✅ E2E |
| RF-63 | Provas detectadas na agenda | I | Alimentam "Próximas provas", UC-01 e conflitos | ✅ unit + E2E |
| RF-64 | Criar evento só com confirmação | E | Nada é criado até "Aceitar"; auditado | ✅ E2E |
| RF-65 | Renovação automática do acesso | E | Token expirado renovado com refresh token | ✅ E2E |

### Radar, finanças e guias (Fase 3)
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-70 | Radar semanal automático e manual | E | Automático ≤ 1x/semana; manual ≤ 2/dia; bloqueado em orçamento crítico | ✅ E2E (dublê) · 🟡 busca real |
| RF-71 | Só oportunidades com link vindo da busca | E | Item com URL inventada é rejeitado | ✅ unit + E2E |
| RF-72 | Salvar, dispensar, pôr na agenda | I | Agenda só com clique; requer Google conectado | ✅ E2E |
| RF-73 | Preferências do radar (categorias, cidade, interesses) | I | Usadas na busca (localização aproximada) | ✅ E2E |
| RF-74 | Gasto rápido, meta e ritmo do mês | E | Aviso de ritmo (após dia 5) e de meta estourada | ✅ unit + E2E |
| RF-75 | Espaços guiados (carreira, dinheiro, propósito) | I | Um clique cria o espaço com propósito definido | ✅ E2E |

### Intelligence Spaces
| ID | Requisito | Pri. | Critério | Estado |
|---|---|---|---|---|
| RF-50 | Criar, fixar, arquivar, reativar espaços | E | — | ✅ (criar no E2E) |
| RF-51 | Histórico persistente; retomar investigação | E | Recarregar mostra conversa | ✅ E2E |
| RF-52 | Título automático na 1ª troca | I | — | ✅ E2E |
| RF-53 | Resumo automático do espaço | I | A cada 10 mensagens novas; "Onde paramos" | ✅ E2E |
| RF-54 | Segundo fator (TOTP) | I | Com fator ativo, login exige código; APIs 401 sem AAL2 | ✅ E2E |
| RF-55 | Memória substituída em mudança de opinião | I | Antiga desatualizada, nova aponta a anterior, auditado | ✅ unit + E2E |

## 2. Fluxos principais
1. **Abrir o app** → regras rodam → ambiente mostra síntese (gerada se faltar), sinais, equilíbrio, foco, registro.
2. **Conversar** → `/` foca → envio → presença "pensando" → streaming "respondendo" → "registrando" memória → aviso de memórias/propostas.
3. **Decidir proposta** → Aceitar cria o objeto e audita; Descartar registra rejeição.
4. **Revisar memória** → aba "A revisar" → confirmar/rejeitar/corrigir.
5. **Investigar** → novo espaço → conversa com contexto do espaço → sair e retomar.
6. **Semana** → autoavaliar equilíbrio → revisão semanal.

## 3. Fluxos excepcionais
| Situação | Comportamento |
|---|---|
| Sem chave de IA | Conversa responde "Nenhuma chave de API de IA configurada"; síntese mostra IA indisponível; resto funciona |
| Orçamento crítico/bloqueado | Rebaixa para modelo leve / pausa IA com mensagem; regras e registros seguem |
| Provedor falha antes de responder | Tenta próximo candidato (outro provedor/nível mais barato); falha registrada em `ai_usage` |
| Falha no meio do streaming | Não repete em outro modelo (evita resposta duplicada); mensagem do usuário já está salva |
| Extração falha ou JSON inválido | Ignorada silenciosamente (log); resposta não é afetada |
| Usuário interrompe | Texto parcial marcado "[interrompido]" |
| Sessão expira | APIs → 401 → cliente redireciona ao login |
| Supabase não configurado | Proxy redireciona a /setup listando variáveis ausentes (sem valores) |

## 4. Experiência (Ambient Intelligence)

**Princípios**: a cor vem da presença do JARVIS, não de cromo; silêncio por padrão; um foco por vez; tudo reversível visível.

**Estados de presença** (cor do ambiente inteiro muda): Em espera (respira devagar, verde-água) · Ouvindo (usuário digitando) ·
Pensando (arcos girando, azul) · Respondendo (pulso de fala) · Registrando (violeta, memória/propostas) · Falha (vermelho, volta sozinho).

**Estados de interface**: *Ambient State* (visão contextual discreta) → *Workspace State* (conversa se expande em primeiro plano sobre um
véu desfocado; `Esc` recolhe) → *Intelligence Spaces* (investigações persistentes em páginas próprias).

**Navegação**: dock flutuante inferior (Ambiente, Espaços, Objetivos, Memória, Contexto, Ajustes), igual no celular e desktop; `/` foca o comando.

**Excesso de estímulos**: sem notificações externas; sinais limitados a 6 + propostas; regras deduplicadas; dispensar é definitivo.

**Incerteza e erro**: hipóteses com selo e %; confiança em cada aviso; modelo e custo visíveis por resposta; erros em linguagem simples.

**Acessibilidade**: `prefers-reduced-motion` respeitado; rótulos ARIA em presença, sliders e botões; contraste alto sobre fundo escuro;
navegação por teclado; layout verificado em 390 px sem rolagem horizontal.

**Alternativas descartadas**: dashboard com sidebar e tabelas (contraria DEC-020); chatbot em tela cheia (JARVIS seria "uma página");
réplica de HUD de ficção (pedido explícito de identidade própria).
