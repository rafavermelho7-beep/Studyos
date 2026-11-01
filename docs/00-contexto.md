# LIFE ENGINE — 00 · Contexto consolidado (Prompt 0)

> **Status: APROVADO pelo usuário em 01/11/2026.**
> Fonte de verdade da etapa de preparação. IDs estáveis; no Documento Mestre
> (Prompt 1) cada `C-xx` é registrado como `DEC-0xx`.

## 1. Visão

Sistema de inteligência pessoal, privado e de usuário único, em que um agente
conselheiro **racional, crítico e direto** entende e conecta os domínios da sua
vida a partir dos seus dados, procurando ativamente problemas e oportunidades —
com o objetivo de **equilíbrio entre domínios num horizonte de 1–3 anos**, não de
produtividade máxima.

## 2. Decisões confirmadas

### Propósito e postura

| ID | Decisão |
|---|---|
| C-01 | Domínios: identidade, espiritualidade, saúde, estudos, carreira, finanças, relacionamentos, ambiente, projetos, conhecimento, experiências |
| C-02 | Não é app de hábitos, produtividade nem chatbot; é ambiente inteligente, privado, adaptativo e expansível |
| C-03 | Medida de sucesso: equilíbrio entre domínios |
| C-04 | Horizonte de 1 a 3 anos |
| C-05 | Experiências significativas são prioridade |
| C-06 | Ambição alta, vários objetivos, sem virar máquina de produtividade |
| C-07 | Papel: conselheiro estratégico (advisor) |
| C-08 | Personalidade: racional, crítica, estratégica, direta |
| C-09 | Iniciativa alta: identifica problemas e oportunidades proativamente |
| C-10 | Descoberta de oportunidades ativa |
| C-11 | Pode questionar crenças e objetivos, com razões, sem manipulação |
| C-12 | Descoberta pessoal contínua; memória abrangente |
| C-13 | Informações sensíveis: tratamento controlado e proteção especial |
| C-14 | Acompanhamento adaptativo: análise contínua, síntese diária, revisão semanal |

### Autonomia e limites

| ID | Decisão |
|---|---|
| C-15 | Autonomia interna alta só para ações reversíveis, respeitando permissões |
| C-16 | Ações externas, irreversíveis ou de alto impacto exigem autorização específica |
| C-17 | Pesquisa externa autônoma quando relevante; fontes oficiais como prioridade |
| C-19 *(revisada)* | Não opera contas/serviços externos em seu nome — **exceto escrever na agenda** |
| C-30 | Pesquisa web só leitura não conta como "ação externa" |

### Fontes de dados e contato

| ID | Decisão |
|---|---|
| C-22 | *(substituída por C-24)* Acesso a e-mail, agenda, banco e saúde |
| C-23 | Saúde é a fonte externa prioritária — Apple Watch / iPhone / Apple Saúde |
| C-24 | Saúde: **só leitura** · Agenda: **leitura e escrita** · E-mail e banco: **sem acesso** |
| C-25 | Primeiros casos de uso: **UC-01** sono × semanas de prova · **UC-02** avisar quando parar de treinar · **UC-03** energia × o que está estudando |
| C-26 | O agente só fala com você **dentro do app** — sem notificações externas |

### Contexto

| ID | Decisão |
|---|---|
| C-18 | IA na nuvem, com seleção automática de modelo |
| C-20 | Interface Ambient Intelligence: adaptativa, espaços persistentes, presença dinâmica do agente |
| C-21 | Multimodalidade desejada: texto, voz, imagens, documentos, comandos, espaços visuais |
| C-27 | Usuário único |
| C-28 | Idioma: português |
| C-29 | R$50/mês é teto só para APIs de IA; hospedagem/banco à parte, de preferência gratuitos |
| C-31 | Desenvolvimento: o usuário com ajuda do Claude, sem equipe |

## 3. Propostas (não aprovadas)

- **P-01** — Stack Next.js + TypeScript + Vercel + Supabase + GitHub. Preliminar; reavaliar no Prompt 6, pois saúde provavelmente exige algo além de app web (R-18).
- **P-02** — Multimodalidade completa pode não entrar na primeira versão.
- **P-03** — Toda correlação é apresentada como **hipótese com quantidade de dados que a sustenta**, nunca como fato.

## 4. Pendências

| ID | Pendência | Resolve em |
|---|---|---|
| PEN-01 | Agente escreve na agenda sozinho ou com confirmação? | Prompt 5 |
| PEN-02 | Qual agenda: iCloud ou Google? | Prompt 1/6 |
| PEN-03 | De onde vêm os dados de estudo (agenda / manual / importar do StudyOS)? | Prompt 1/2 |
| PEN-04 | Como definir "energia" (indicador do relógio, nota subjetiva, ambos)? | Prompt 4 |
| PEN-05 | Como medir "equilíbrio" entre domínios — e quem define? | Prompt 1 |
| PEN-06 | Fronteira dos dados sensíveis: o que vai à IA na nuvem, o que nunca entra | Prompt 4/5 |
| PEN-07 | Lista operacional de "ação interna reversível" | Prompt 5 |
| PEN-08 | Limites do questionamento: temas protegidos, tom, frequência | Prompt 1/4 |
| PEN-09 | Escopo mínimo da primeira versão | Prompt 1 → 8 |
| PEN-10 | Seu tempo disponível para desenvolver | Prompt 8 |
| PEN-11 | Como registrar domínios sem fonte automática sem virar fardo | Prompt 2/3 |

## 5. Riscos ativos

| ID | Risco | Gravidade |
|---|---|---|
| R-18 | Apple Saúde não tem API web — exige app iOS próprio, app intermediário ou Atalhos | **Alta (arquitetura)** |
| R-02 / R-04 | Memória abrangente × dados sensíveis (saúde) × envio à IA na nuvem | **Alta** |
| R-21 | Correlações espúrias com poucos dados | Alta |
| R-10 | Escopo grande demais para uma pessoa desenvolver (Ambient + multimodal) | Alta |
| R-22 | Valor depende do hábito de abrir o app (sem notificações) | Média |
| R-05 | Orçamento de IA × análise contínua | Média |
| R-08 | Inferências erradas sobre sua personalidade | Média |
| R-07 | Questionamento de crenças passar do limite | Média |
| R-09 | Autonomia interna indefinida (incl. agente alterar a própria estrutura) | Média |
| R-20 | "Energia" não é medida diretamente pelo relógio | Média |
| R-19 | Finanças sem fonte automática | Média |
| R-03 / R-17 | Dados de terceiros (relacionamentos, convidados da agenda) | Baixa–média |
| R-13 *(residual)* | Texto malicioso em convites de agenda | Baixa |
| R-12 | Manutenção e evolução ao longo de 1–3 anos | Baixa–média |

**Encerrados:** R-11 (canal de contato — resolvido por C-26), R-15 (volume de
e-mail) e agregador bancário pago (fora de escopo por C-24).
