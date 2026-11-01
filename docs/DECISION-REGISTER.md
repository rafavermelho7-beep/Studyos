# LIFE ENGINE — DECISION REGISTER

Status: **Confirmada** (decisão do usuário) · **Técnica** (decisão do Claude sob a autorização de 01/11/2026 — reversível, pode ser
revista pelo usuário a qualquer momento) · **Substituída**.

## Decisões do usuário (DEC-001 a DEC-031)

Registradas em `01-documento-mestre.md` (Prompt 0 + conversa de 01/11/2026). Resumo: onze domínios (001); não é app de produtividade (002);
sucesso = equilíbrio (003); horizonte 1–3 anos (004); experiências significativas (005); ambição sem máquina de produtividade (006);
advisor (007); racional, crítico, estratégico, direto (008); iniciativa alta (009); descoberta de oportunidades (010); questiona com razões
(011); memória abrangente (012); sensíveis com proteção (013); síntese diária + revisão semanal (014); autonomia interna só reversível (015);
externo/irreversível exige autorização (016); pesquisa externa autônoma, fontes oficiais (017); IA na nuvem com seleção automática (018);
não opera serviços externos exceto escrever na agenda (019); Ambient Intelligence (020); multimodalidade desejada (021); ~~022~~ substituída
por 024; saúde é fonte prioritária (023); saúde só leitura, agenda leitura/escrita, sem e-mail/banco (024); UC-01/02/03 (025); só fala
dentro do app (026); usuário único (027); português (028); R$50/mês só para IA (029); pesquisa web leitura não é ação externa (030);
desenvolvimento pelo usuário com o Claude (031).

## Decisões do usuário em 01/11/2026 (missão de construção)

| ID | Decisão | Status |
|---|---|---|
| DEC-032 | Claude autorizado a conceber, arquitetar e construir com autonomia em decisões técnicas reversíveis | Confirmada |
| DEC-033 | Stack: aplicação web privada, Next.js + TypeScript, Vercel, Supabase, GitHub (P-01 promovida) | Confirmada |
| DEC-034 | Suporte a Anthropic **e** OpenAI com AI Router de seleção automática | Confirmada |
| DEC-035 | Teto de R$50/mês em APIs de IA é **limite rígido**, não meta | Confirmada |
| DEC-036 | Proibido: pagamentos, assinaturas, expor chaves, deploy público sem proteção, apagar dados sem backup, mensagens externas | Confirmada |
| DEC-037 | Computador pessoal não é servidor; assinaturas Pro/Plus não contam como crédito de API | Confirmada |
| DEC-038 | Agenda = **Google Agenda** (resolve PEN-02) | Confirmada (01/11/2026) |

## Decisões técnicas (Claude) — resolvem pendências

| ID | Decisão | Resolve | Justificativa |
|---|---|---|---|
| DEC-T01 | Fase 1 = núcleo (auth, memória, inteligência, roteador, objetivos, ambiente, espaços, contexto, saúde por Atalho) | PEN-09 | Prova de valor pedida no roteiro, sem multimodal/agenda/pesquisa |
| DEC-T02 | Supabase Auth com e-mail+senha, cadastro desativado, `OWNER_EMAIL` checado no proxy, na DAL e no login | — | Sem dependência de SMTP; defesa em profundidade |
| DEC-T03 | Acesso a dados via supabase-js com a sessão do usuário (RLS sempre ativa); **sem service role key no app** | — | Um bug de código não vaza dados entre usuários |
| DEC-T04 | Ingestão de saúde por função `security definer` com token próprio (hash SHA-256) | R-18 | Apple Saúde não tem API web; evita service role key |
| DEC-T05 | Saúde armazenada só como agregados diários | PEN-06 parcial | Minimização |
| DEC-T06 | Busca de memória por Full-Text Search em português (OR de lexemas), sem embeddings na Fase 1 | — | Custo zero, sem nova dependência; embeddings na Fase 2 |
| DEC-T07 | Cache Components do Next 16 desativado | — | App 100% dinâmico e privado |
| DEC-T08 | O modelo nunca executa ações: só texto + JSON validado por zod e pela matriz de permissões | PEN-07 | Elimina classe de ataques por prompt injection |
| DEC-T09 | Memória: declarado → ativo; inferido → `hypothesis` (confiança ≤ 0,6); sensível → aguarda confirmação; restrito → agente nunca grava e nunca vai à IA | PEN-06, R-08 | Inferência nunca vira fato sem o usuário |
| DEC-T10 | Roteador: chat leve/padrão por heurística; `/profundo` → profundo; extração em modelo leve; fallback só para modelos iguais ou mais baratos | — | Custo previsível |
| DEC-T11 | Orçamento: normal <70%, economia 70–90% (sem profundo), crítico ≥90% ou teto diário (só leve), bloqueado ≥100%; pior caso estimado precisa caber no restante; teto diário = 3× média | R-05 | Nunca ultrapassar R$50 |
| DEC-T12 | Equilíbrio = autoavaliação semanal 0–10 por domínio; índice = (média − 0,8 × desvio) × 10, com ≥5 domínios | PEN-05 | Usuário define o que é equilíbrio; transparente |
| DEC-T13 | Síntese diária gerada na primeira abertura do dia e guardada; revisão semanal sob demanda | PEN-13, PEN-17 | Não gastar com sínteses não lidas; sem cron |
| DEC-T14 | Energia (v1) = nota subjetiva 1–5 no check-in | PEN-04 | Relógio não mede energia; combinar com HRV na Fase 2 |
| DEC-T15 | Estudos (v1) = provas/prazos registrados manualmente | PEN-03 | Agenda e StudyOS ficam para depois |
| DEC-T16 | Registro manual em três toques + uma linha opcional | PEN-11 | Evitar fardo |
| DEC-T17 | Limites de questionamento no prompt: espiritualidade, relacionamentos e saúde só quando o usuário abrir o tema; respeitar recusa | PEN-08 | R-07 |
| DEC-T18 | Saúde: sem diagnóstico/prescrição (P-04 adotada) | P-04 | Segurança |
| DEC-T19 | Pesquisa externa desativada na Fase 1 | PEN-18 adiada | Custo + injeção; Fase 3 |
| DEC-T20 | Escrita na agenda (quando existir) exigirá confirmação | PEN-01 | Ação externa visível a terceiros |
| DEC-T21 | Retenção: memórias têm `valid_until`, podem ser marcadas obsoletas, excluídas; exportação JSON completa | PEN-14 | Portabilidade e controle |
| DEC-T22 | Câmbio conservador padrão R$5,60/US$ (configurável) | — | Cotações/projeções 2026 ≈ 5,00–5,20 |
| DEC-T23 | Interface em modo escuro único na Fase 1 | — | Identidade "ambient"; tema claro futuro |
| DEC-T24 | Texto do modelo renderizado sem HTML (parser próprio de parágrafos/listas/negrito) | — | Sem XSS por saída do modelo |
| DEC-T25 | Google Agenda via OAuth 2.0 com escopo único `calendar.events`, fetch puro (sem SDK do Google) | DEC-038 | Escopo mínimo que permite ler e criar; menos dependências |
| DEC-T26 | Tokens do Google cifrados em repouso (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`); `state` anti-CSRF em cookie httpOnly | — | Vazamento do banco não expõe acesso à agenda |
| DEC-T27 | Cópia local mínima: só título (sanitizado, ≤120 caracteres) e horário, janela −30/+60 dias; sem participantes/descrição/local | R-17, R-13 | Minimização; títulos tratados como dado no contexto |
| DEC-T28 | Sincronização ao abrir o Ambiente (no máximo a cada 30 min) e por botão; sem cron | DEC-T13 | Sem infraestrutura extra |
| DEC-T29 | Provas detectadas por título (prova, P1–P4, exame, avaliação, simulado…) alimentam UC-01 e conflitos | PEN-03 parcial | Aproveita a agenda sem registro manual |
| DEC-T30 | Criação de evento só por proposta aceita ou formulário do usuário; auditada como ação do usuário; nunca no passado; 5–600 min | DEC-T20 | Ação externa sempre confirmada |
| DEC-T31 | Desconectar revoga o token no Google e apaga a cópia local | PEN-14 | Controle total do usuário |

## Pendências que dependem do usuário

| ID | Pendência | Impacto |
|---|---|---|
| PEN-10 | Tempo disponível para evoluir o sistema | Ritmo do roadmap |
| PEN-12 | Problemas concretos nos demais domínios | Novas regras/módulos além de saúde × estudos |
| PEN-16 | Dispositivo principal | Prioridade mobile vs desktop (hoje: ambos responsivos) |
| PEN-19 | Confirmar preços da OpenAI no painel oficial | OpenAI marcada "confirmar" no catálogo |
