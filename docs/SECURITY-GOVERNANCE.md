# LIFE ENGINE — SECURITY & GOVERNANCE

> Prompt 5. Versão 1.0. Não presumimos segurança por usar fornecedores conhecidos: abaixo, controles concretos e riscos residuais.

## 1. Modelo de ameaças
| Ameaça | Vetor | Controles | Residual |
|---|---|---|---|
| Acesso não autorizado | Descoberta da URL, credencial vazada | Cadastro desativado; `OWNER_EMAIL` em login/proxy/DAL; senha forte; `noindex` | Senha fraca/reutilizada (usar gerenciador; MFA na Fase 2) |
| Vazamento entre contas | Bug de código | RLS em todas as tabelas; sem service role key no app; testes de RLS | Erro em migration futura (testes obrigatórios) |
| Prompt injection | Texto do usuário, futuro conteúdo web/agenda | Modelo **sem ferramentas**; saída validada (zod) e filtrada pela matriz; contexto marcado como dado | Resposta enganosa em texto (o usuário decide) |
| XSS via saída do modelo | Markdown/HTML gerado | Renderizador próprio sem HTML | — |
| Abuso de custo | Loop, prompt enorme, chave roubada | Teto rígido R$50, teto diário, pior caso pré-checado, `max_tokens`, limite de 8.000 caracteres/mensagem | Chave roubada fora do app (definir limite de gasto também no painel do provedor) |
| Vazamento de chaves | Commit, cliente | Chaves só no servidor (sem `NEXT_PUBLIC_`), `.env*` no `.gitignore`, nunca exibidas | Logs de terceiros |
| Acesso à agenda roubado | Vazamento do banco, CSRF no OAuth | Tokens cifrados (AES-256-GCM, chave fora do banco); `state` aleatório comparado em tempo constante; escopo mínimo; revogação ao desconectar | Chave de cifragem vazada junto com o banco |
| Injeção via títulos de eventos | Convites de terceiros | Títulos sanitizados e truncados; contexto marcado como dado; modelo sem ferramentas; criação só com clique | Texto enganoso no contexto |
| Token de saúde roubado | iPhone/Atalho | Escopo só-escrita de saúde; hash no banco; revogável; payload limitado | Inserção de dados de saúde falsos até revogar |
| Inferência errada vira "verdade" | Modelo | Hipóteses rotuladas, teto 0,6, confirmação | — |
| Perda de dados | Erro humano, pausa do Supabase | Exclusão sempre com confirmação; exportação JSON; auditoria | Free sem backups automáticos garantidos |
| Clickjacking/sniffing | Navegador | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` | — |

## 2. Classificação de dados
Público (nenhum) · Pessoal (objetivos, conversas, registros) · Sensível (saúde, finanças, relacionamentos, crenças) · Restrito
(diagnósticos, terceiros identificáveis, itens "não guarde") · Segredos (chaves de API, tokens) — só em variáveis de ambiente/hash.

## 3. Autenticação e sessões
Supabase Auth, cookies httpOnly via `@supabase/ssr`, renovação no proxy, validação com `getUser()` no servidor (não confia só no cookie).
Logout encerra a sessão. Conta não autorizada é deslogada no ato do login.

## 4. Matriz de permissões do agente (fonte: `src/lib/governance/permissions.ts`)

| Permitido automaticamente (interno, reversível, auditado) | Com confirmação do usuário | Proibido |
|---|---|---|
| Criar avisos | Guardar dado sensível | Guardar dado restrito |
| Guardar o que o usuário declarou | Criar objetivo / projeto | Apagar dados do usuário |
| Registrar hipótese (revisável) | Registrar decisão | Enviar mensagens externas |
| Nomear/resumir espaços | Mudar status de objetivo | Operar contas externas |
| Gerar síntese/revisão | Promover hipótese a fato | Pagamentos |
| | Criar evento na Google Agenda | Alterar permissões ou orçamento |
| | | Ler segredos · Alterar auditoria · Navegar na web *(Fase 1)* |

Ação não listada = **proibida** (negação por padrão, testado).

## 5. Como o agente não altera os próprios limites
A matriz, o teto e o roteador estão em código versionado; o modelo não tem ferramentas, não escreve arquivos nem configurações; o
teto de R$50 é limitado no código mesmo que a variável de ambiente peça mais. Mudar limites exige commit humano.

## 6. Propostas de mudança no sistema
Na Fase 5, o JARVIS poderá **propor** novos módulos/regras como documento; implementação passa por revisão humana e testes.

## 7. Auditoria
`audit_log` append-only (sem políticas de update/delete), com ator (`user`/`agent`/`system`), ação, entidade, detalhe. Visível em Ajustes.

## 8. Recuperação e backups
- Exportação JSON completa (recomendado: semanal, guardar fora do Supabase).
- Supabase: `pg_dump` pelo painel; restauração aplicando migrations + dados.
- Projeto pausado por inatividade: restaurar no painel do Supabase.

## 9. Segredos
Vercel Environment Variables (criptografadas), escopo Production/Preview. Nunca em código ou cliente. Recomenda-se definir também
**limite de gasto mensal no painel da Anthropic/OpenAI** como segunda barreira.

## 10. Plano de resposta a incidentes
1. Suspeita de acesso indevido → trocar senha no Supabase, revogar sessões (Auth → Users), revisar `audit_log`.
2. Chave de IA exposta → revogar no painel do provedor, criar nova, atualizar na Vercel, redeploy.
3. Token de saúde exposto → Ajustes → Revogar; gerar novo.
4. Gasto anômalo → ver `ai_usage`; reduzir `AI_MONTHLY_BUDGET_BRL`; remover chave temporariamente.
5. Dados corrompidos → exportação mais recente + `pg_dump`.

## 11. Falhas humanas, de modelo e custos inesperados
Exclusões confirmadas; propostas nunca automáticas; hipóteses rotuladas; custos registrados por chamada e visíveis; teto diário evita
drenar o mês num dia.
