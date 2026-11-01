# LIFE ENGINE — 01 · Documento Mestre de Produto (Prompt 1)

> **Status: RASCUNHO v0.1 — aguardando revisão e aprovação do usuário.**
> Base: `docs/00-contexto.md` (aprovado). Este documento **não cria requisitos
> novos**: organiza as decisões existentes. Onde falta decisão, está marcado
> **PENDENTE** com o motivo. Rótulos usados: **DEC** (decisão confirmada),
> **PROPOSTA**, **PENDENTE**, **RISCO**.
> Sem arquitetura técnica e sem implementação.

---

## Visão em uma página

**O que é.** O LIFE ENGINE é um sistema de inteligência pessoal, privado e de
usuário único (DEC-027). Um agente com papel de conselheiro estratégico
(DEC-007), de personalidade racional, crítica e direta (DEC-008), acompanha
onze domínios da sua vida (DEC-001) e procura proativamente problemas e
oportunidades (DEC-009, DEC-010).

**Para quê.** O sucesso é medido por **equilíbrio entre domínios** (DEC-003)
num horizonte de **1 a 3 anos** (DEC-004) — não por produtividade (DEC-006).
Experiências significativas têm prioridade (DEC-005).

**Como ele sabe das coisas.** Por três vias: (1) **saúde** lida do Apple Watch /
Apple Saúde, só leitura (DEC-023, DEC-024); (2) **agenda**, leitura e escrita
(DEC-024); (3) **o que você registra** no próprio sistema. E-mail e banco ficam
fora (DEC-024). Pode pesquisar na web por conta própria, só leitura (DEC-017,
DEC-030).

**Como ele fala com você.** Somente dentro do app (DEC-026): avisos, síntese
diária e revisão semanal (DEC-014) esperam até você abrir.

**O que ele pode fazer sozinho.** Ações internas e reversíveis (DEC-015).
Qualquer coisa externa, irreversível ou de alto impacto exige sua autorização
(DEC-016) — a única ação externa permitida é escrever na agenda (DEC-019), e
ainda está PENDENTE se isso exige confirmação (PEN-01).

**Primeira prova de valor (casos já decididos).** UC-01 sono × semanas de
prova · UC-02 aviso quando parar de treinar · UC-03 energia × o que está
estudando (DEC-025). Todos cruzam **saúde com estudos**.

**Maiores incertezas.** Como medir equilíbrio (PEN-05); onde fica a fronteira
dos dados sensíveis (PEN-06); escopo da primeira versão (PEN-09); e o fato de
Apple Saúde não ter API web (R-18), que pesa na arquitetura.

---

## 1. Visão e propósito

Ser um ambiente inteligente, privado, adaptativo e expansível que entende e
conecta as dimensões da sua vida (DEC-002) e transforma seus dados em
aconselhamento estratégico, visando equilíbrio entre domínios (DEC-003) em
médio prazo (DEC-004), sem transformar a vida numa máquina de produtividade
(DEC-006).

Não é: app de hábitos, ferramenta de produtividade ou chatbot (DEC-002).

## 2. Problemas que o produto pretende resolver

| ID | Problema | Origem | Status |
|---|---|---|---|
| PB-01 | Não perceber como a carga de estudos (provas) afeta o sono | DEC-025 / UC-01 | Confirmado |
| PB-02 | Parar de treinar sem perceber | DEC-025 / UC-02 | Confirmado |
| PB-03 | Não saber como a energia se relaciona com o que está estudando | DEC-025 / UC-03 | Confirmado |
| PB-04 | Perder o equilíbrio entre domínios sem notar (negligenciar algum) | DEC-003, DEC-009 | Confirmado em princípio — falta definir "equilíbrio" (PEN-05) |
| PB-05 | Problemas concretos nos demais domínios (carreira, finanças, relacionamentos, espiritualidade etc.) | — | **PENDENTE (PEN-12)**: hoje só saúde × estudos tem casos concretos. Sem eles, esses domínios entram na v1 sem propósito claro. |

## 3. Princípios inegociáveis

Todos derivados de decisões confirmadas:

1. **Privado e de usuário único** (DEC-027, DEC-002).
2. **Equilíbrio acima de produtividade** (DEC-003, DEC-006).
3. **Conselheiro, não executor**: aconselha; age sozinho só no interno e reversível (DEC-007, DEC-015).
4. **Nada externo, irreversível ou de alto impacto sem autorização** (DEC-016, DEC-019).
5. **Questiona com razões, nunca manipula** (DEC-011).
6. **Dados sensíveis com proteção especial** (DEC-013).
7. **Silencioso fora do app**: sem notificações externas (DEC-026).
8. **Honestidade sobre incerteza**: *PROPOSTA P-03* — toda correlação é hipótese com a quantidade de dados que a sustenta. **Ainda não aprovada como princípio.**

## 4. Perfil e contexto de uso

- **Usuário:** uma pessoa (você), sem outros usuários (DEC-027).
- **Idioma:** português (DEC-028).
- **Dispositivos:** possui iPhone e Apple Watch (DEC-023). Interface deve ser consistente entre desktop e celular (diretriz do roteiro, Prompt 3). Qual dispositivo é o principal no dia a dia: **PENDENTE (PEN-16)** — muda prioridades de interface.
- **Momento de uso:** o sistema só se comunica quando você abre o app (DEC-026); portanto a **abertura do app é o momento central** da experiência. Frequência esperada de abertura: **PENDENTE (PEN-17)** — determina se "síntese diária" faz sentido como diária.
- **Perfil acadêmico:** há provas e estudos (DEC-025). Detalhes (curso, fase) não foram fornecidos para este projeto — **não presumidos**.

## 5. Domínios da vida abrangidos

Os onze domínios estão confirmados (DEC-001). A tabela abaixo mostra **de onde
viria a informação de cada um**, com base no que já foi decidido — não é uma
proposta de escopo.

| Domínio | Fonte automática | Caso de uso confirmado |
|---|---|---|
| Saúde | Apple Saúde (só leitura) | UC-01, UC-02, UC-03 |
| Estudos | Agenda (se as provas estiverem lá) — **PENDENTE (PEN-03)** | UC-01, UC-03 |
| Identidade | — (registro / conversa) | — |
| Espiritualidade | — | — |
| Carreira | — | — |
| Finanças | — (banco sem acesso, DEC-024) | — |
| Relacionamentos | — | — |
| Ambiente | — | — |
| Projetos | — (agenda, em parte) | — |
| Conhecimento | — | — |
| Experiências | — (agenda, em parte) | — |

**RISCO R-23:** nove de onze domínios não têm fonte automática nem caso de uso
concreto. Ou dependem de registro manual (PEN-11), ou ficam rasos na v1.

## 6. Papel, personalidade e limites do JARVIS

- **Papel:** advisor / conselheiro estratégico (DEC-007).
- **Personalidade:** racional, crítico, estratégico, direto (DEC-008).
- **Iniciativa:** alta — aponta problemas e oportunidades sem ser solicitado (DEC-009, DEC-010).
- **Questionamento:** pode questionar crenças e objetivos, com razões, sem manipulação (DEC-011). Limites (temas protegidos, tom, frequência): **PENDENTE (PEN-08)** — sem isso, "crítico e direto" pode cruzar a linha em espiritualidade, relacionamentos ou saúde (R-07).
- **Limite em saúde:** *PROPOSTA P-04* — o agente não faz diagnóstico nem recomendação médica; aponta padrões e sugere procurar profissional quando apropriado. **Não aprovada.**

### Funcionalidade F-06 · Questionamento de crenças e objetivos

| Campo | Conteúdo |
|---|---|
| Finalidade | Evitar que objetivos ou crenças não examinados conduzam suas decisões (DEC-011) |
| Usuário beneficiado | Você |
| Gatilho | PENDENTE — sob demanda, nas revisões, ou quando detectar contradição? |
| Entradas | Objetivos e crenças registrados; contradições observadas |
| Comportamento esperado | Apresenta o questionamento com as razões e os dados que o motivam; aceita sua resposta e a registra |
| Saída | Pergunta/argumento dentro do app |
| Riscos | R-07 (passar do limite), R-08 (basear-se em inferência errada) |

## 7. Modelo de acompanhamento e iniciativa

Acompanhamento adaptativo e integral, com análise contínua, síntese diária e
revisão semanal (DEC-014), comunicadas só dentro do app (DEC-026).

### F-01 · Síntese diária

| Campo | Conteúdo |
|---|---|
| Finalidade | Dar a visão do dia: o que mudou e o que merece atenção (DEC-014) |
| Usuário beneficiado | Você |
| Gatilho | PENDENTE (PEN-13): gerada ao abrir o app, ou em horário fixo e guardada até a abertura? |
| Entradas | Saúde do dia anterior, agenda do dia, registros recentes |
| Comportamento esperado | PENDENTE (PEN-13) — conteúdo exato não definido |
| Saída | Resumo dentro do app |
| Riscos | R-05 (custo de IA se gerada sem ninguém ler), R-22 (dias sem abrir) |

### F-02 · Revisão semanal

| Campo | Conteúdo |
|---|---|
| Finalidade | Avaliar a semana em relação aos objetivos e ao equilíbrio entre domínios (DEC-014, DEC-003) |
| Usuário beneficiado | Você |
| Gatilho | PENDENTE (PEN-13): dia fixo? iniciada por você? |
| Entradas | Dados da semana (saúde, agenda, registros) |
| Comportamento esperado | PENDENTE (PEN-13, PEN-05 — depende de como se mede equilíbrio) |
| Saída | Revisão dentro do app |
| Riscos | R-21 (conclusões com poucos dados) |

### F-03 · Detecção proativa de problemas e oportunidades

| Campo | Conteúdo |
|---|---|
| Finalidade | Apontar algo relevante que você não pediu (DEC-009, DEC-010) |
| Usuário beneficiado | Você |
| Gatilho | Análise contínua dos dados recebidos (DEC-014); frequência PENDENTE |
| Entradas | Todos os dados disponíveis |
| Comportamento esperado | Registra o achado como aviso; o aviso aguarda a abertura do app (DEC-026) |
| Saída | Aviso dentro do app, com razão e dados de suporte |
| Riscos | R-06 (excesso de avisos), R-21 (falsos padrões), R-05 (custo) |

### F-07 · Avisos dentro do app

| Campo | Conteúdo |
|---|---|
| Finalidade | Único canal do agente até você (DEC-026) |
| Usuário beneficiado | Você |
| Gatilho | Gerado por F-01, F-02, F-03, UC-02 |
| Entradas | Achados do agente |
| Comportamento esperado | Ficam pendentes até você abrir; nada sai do app |
| Saída | Lista/apresentação de avisos ao abrir |
| Riscos | R-22 (aviso relevante visto tarde) |

## 8. Memória e identidade

Descoberta pessoal contínua e memória abrangente (DEC-012), com proteção
especial para dados sensíveis (DEC-013). O modelo detalhado é tarefa do
Prompt 4. Para este documento:

### F-04 · Memória pessoal

| Campo | Conteúdo |
|---|---|
| Finalidade | Permitir que o agente aconselhe com base no seu histórico, não só no momento (DEC-012) |
| Usuário beneficiado | Você |
| Gatilho | Novos dados e conversas |
| Entradas | Registros, saúde, agenda, conversas |
| Comportamento esperado | PENDENTE (Prompt 4): o que é guardado, por quanto tempo, como corrigir/excluir |
| Saída | Contexto usado nas respostas e análises |
| Riscos | R-02/R-04 (sensíveis × nuvem), R-08 (inferências erradas viram "memória") |

**PENDENTE (PEN-14):** política de retenção e exclusão — importa porque
"memória abrangente" sem prazo acumula dados sensíveis indefinidamente.

## 9. Autonomia e permissões

| Categoria | Decisão |
|---|---|
| Ações internas reversíveis | Autônomas, respeitando permissões (DEC-015). Lista concreta: **PENDENTE (PEN-07)** |
| Ações externas / irreversíveis / alto impacto | Exigem autorização específica (DEC-016) |
| Operar serviços externos | Proibido, exceto escrever na agenda (DEC-019) |
| Ler saúde | Permitido, só leitura (DEC-024) |
| Ler/escrever agenda | Permitido (DEC-024); sozinho ou com confirmação: **PENDENTE (PEN-01)** |
| E-mail, banco | Sem acesso (DEC-024) |
| Pesquisar na web (só leitura) | Permitido, autônomo (DEC-017, DEC-030) |

Matriz completa de permissões: Prompt 5.

### F-08 · Integração com agenda

| Campo | Conteúdo |
|---|---|
| Finalidade | Saber seus compromissos (incl. provas, se lá estiverem) e poder registrar eventos (DEC-024) |
| Usuário beneficiado | Você |
| Gatilho | Leitura: contínua/periódica. Escrita: PENDENTE (PEN-01) |
| Entradas | Eventos da sua agenda — provedor **PENDENTE (PEN-02)** |
| Comportamento esperado | Lê eventos; cria/altera eventos conforme regra de PEN-01 |
| Saída | Contexto para análises; eventos na agenda |
| Riscos | Escrita visível a convidados; R-13 residual (texto malicioso em convites); R-17 (dados de terceiros) |

## 10. Interface e experiência

Ambient Intelligence: adaptativa, espaços persistentes, presença dinâmica do
agente (DEC-020); multimodalidade desejada (DEC-021). Detalhamento: Prompt 3.

Restrições já conhecidas que a interface precisa respeitar:
- A abertura do app é o momento central, porque é o único canal (DEC-026, R-22).
- Registrar dados manualmente não pode virar fardo (PEN-11).
- Multimodalidade completa na v1: *PROPOSTA P-02* (pode ficar para depois) — **PENDENTE (PEN-15)**.

### F-09 · Registro manual

| Campo | Conteúdo |
|---|---|
| Finalidade | Alimentar os domínios sem fonte automática (ver seção 5) |
| Usuário beneficiado | Você |
| Gatilho | Iniciativa sua; possivelmente perguntas do agente (PENDENTE) |
| Entradas | Texto (e futuramente voz/imagem — PEN-15) |
| Comportamento esperado | **PENDENTE (PEN-11)** — formato e esforço aceitável não definidos |
| Saída | Dados disponíveis para memória e análise |
| Riscos | R-23 (domínios rasos se registro for trabalhoso) |

## 11. Pesquisa e descoberta de oportunidades

Pesquisa externa autônoma quando relevante, priorizando fontes oficiais
(DEC-017), só leitura (DEC-030); descoberta de oportunidades ativa (DEC-010).

### F-05 · Pesquisa externa

| Campo | Conteúdo |
|---|---|
| Finalidade | Trazer informação externa confiável para aconselhamento e oportunidades |
| Usuário beneficiado | Você |
| Gatilho | Quando "relevante" — critério **PENDENTE (PEN-18)** |
| Entradas | Pergunta ou contexto gerado pelo agente |
| Comportamento esperado | Pesquisa priorizando fontes oficiais; cita a fonte |
| Saída | Resultado com fontes dentro do app |
| Riscos | Prompt injection via páginas web (Prompt 5); custo (R-05) |

**PENDENTE (PEN-18):** o que conta como "oportunidade" e em quais domínios o
agente deve procurar — sem isso, "descoberta ativa" não tem alvo.

## 12. Inteligência artificial e orçamento

- IA na nuvem com seleção automática de modelo (DEC-018).
- Teto inicial de **R$50/mês só para APIs de IA**; hospedagem/banco à parte, de preferência gratuitos (DEC-029).
- **RISCO R-05:** análise contínua + síntese diária + pesquisa autônoma competem pelo mesmo teto. A frequência real dessas tarefas (PEN-13, PEN-18) decide se cabe.
- Fornecedores e estratégia de custo: Prompt 6.

## 13. Segurança e privacidade

- Sistema privado, usuário único (DEC-027); dados sensíveis com proteção especial (DEC-013).
- Saúde é o dado mais sensível em uso e também a fonte prioritária (DEC-023).
- Fronteira do que pode ir para a IA na nuvem: **PENDENTE (PEN-06)**.
- Dados de terceiros (relacionamentos, convidados da agenda): R-03/R-17.
- Análise completa (ameaças, matriz de permissões): Prompt 5.

## 14. Escopo inicial e limites

**Decidido para a fase inicial:**
- Usuário único, português.
- Fontes: Apple Saúde (leitura), agenda (leitura/escrita), registro manual.
- Fora: e-mail, banco, notificações externas, operação de outros serviços.
- Casos de uso confirmados: UC-01, UC-02, UC-03.

**PENDENTE (PEN-09):** quais funcionalidades (F-01 a F-09) e quais domínios
entram na primeira versão. Os únicos casos concretos hoje (UC-01..03) exigem
apenas saúde + estudos + memória mínima + abertura do app — isso é uma
**observação**, não uma proposta de escopo.

## 15. Decisões confirmadas

Ver **Registro de decisões** ao final (DEC-001 a DEC-031).

## 16. Propostas ainda não aprovadas

| ID | Proposta | Origem |
|---|---|---|
| P-01 | Stack Next.js + TypeScript + Vercel + Supabase + GitHub (reavaliar no Prompt 6; R-18) | Diretriz preliminar do usuário |
| P-02 | Multimodalidade completa pode ficar fora da v1 | Claude, Prompt 0 |
| P-03 | Correlações sempre como hipótese com volume de dados de suporte | Claude, Prompt 0 |
| P-04 | Agente não diagnostica nem recomenda tratamento em saúde | Claude, Prompt 0 (citado) / Prompt 1 |

## 17. Pendências e perguntas abertas

| ID | Pendência | Por que importa | Resolve em |
|---|---|---|---|
| PEN-01 | Escrita na agenda: autônoma ou com confirmação? | Ação externa visível a terceiros | Prompt 5 |
| PEN-02 | Agenda iCloud ou Google? | Caminho técnico diferente | Prompt 1/6 |
| PEN-03 | Origem dos dados de estudo | UC-01 e UC-03 dependem disso | Prompt 1/2 |
| PEN-04 | Definição de "energia" | UC-03 depende disso; relógio não mede diretamente | Prompt 4 |
| PEN-05 | Como medir equilíbrio, e quem define | É a medida de sucesso do produto | Prompt 1 |
| PEN-06 | Fronteira dos dados sensíveis × IA na nuvem | Privacidade de saúde | Prompt 4/5 |
| PEN-07 | Lista de ações internas reversíveis | Limite da autonomia | Prompt 5 |
| PEN-08 | Limites do questionamento | Evitar R-07 | Prompt 1/4 |
| PEN-09 | Escopo da v1 | Evitar R-10 | Prompt 1 → 8 |
| PEN-10 | Tempo disponível para desenvolver | Roadmap realista | Prompt 8 |
| PEN-11 | Formato do registro manual e esforço aceitável | Nove domínios dependem disso | Prompt 2/3 |
| PEN-12 | Problemas concretos nos demais domínios | Sem eles, domínios sem propósito na v1 | Prompt 1 |
| PEN-13 | Gatilho e conteúdo da síntese diária e da revisão semanal | Definem a experiência e o custo | Prompt 2/3 |
| PEN-14 | Retenção e exclusão de dados | Memória abrangente acumula sensíveis | Prompt 4 |
| PEN-15 | Multimodalidade na v1 (ligada a P-02) | Escopo e custo | Prompt 3/8 |
| PEN-16 | Dispositivo principal (celular ou desktop) | Prioridade de interface | Prompt 3 |
| PEN-17 | Frequência esperada de abertura do app | Único canal de comunicação | Prompt 3 |
| PEN-18 | O que é "oportunidade" e onde pesquisar | Dá alvo à descoberta ativa | Prompt 2 |

---

## Lista priorizada das 15 decisões mais importantes ainda abertas

1. **PEN-09** — Escopo da primeira versão.
2. **PEN-05** — Como medir equilíbrio (é a medida de sucesso).
3. **PEN-06** — Fronteira dos dados sensíveis × IA na nuvem.
4. **PEN-03** — Origem dos dados de estudo (bloqueia UC-01 e UC-03).
5. **PEN-12** — Problemas concretos nos demais domínios.
6. **PEN-11** — Formato e esforço do registro manual.
7. **PEN-13** — Gatilho e conteúdo da síntese diária e revisão semanal.
8. **PEN-07** — Lista de ações internas reversíveis.
9. **PEN-01** — Agenda: escrita autônoma ou com confirmação.
10. **PEN-08** — Limites do questionamento de crenças.
11. **PEN-04** — Definição de "energia".
12. **PEN-14** — Retenção e exclusão de dados.
13. **PEN-17** — Frequência esperada de abertura do app.
14. **PEN-02** — Agenda iCloud ou Google.
15. **PEN-18** — O que é "oportunidade" e onde pesquisar.

(Fora do top 15: PEN-10, PEN-15, PEN-16.)

---

## Glossário

| Termo | Significado neste projeto |
|---|---|
| **LIFE ENGINE** | O sistema como um todo |
| **JARVIS / agente** | A inteligência conselheira dentro do LIFE ENGINE |
| **Domínio** | Uma das onze áreas da vida (DEC-001) |
| **Equilíbrio** | Medida de sucesso do produto (DEC-003); definição operacional PENDENTE (PEN-05) |
| **Síntese diária** | Resumo do dia gerado pelo agente (DEC-014) |
| **Revisão semanal** | Avaliação da semana (DEC-014) |
| **Aviso** | Mensagem do agente que espera dentro do app (DEC-026) |
| **Ação interna reversível** | Ação do agente dentro do sistema que pode ser desfeita; autônoma (DEC-015); lista PENDENTE (PEN-07) |
| **Ação externa** | Ação que afeta algo fora do LIFE ENGINE; hoje só escrita na agenda (DEC-019) |
| **Fonte automática** | Dado que entra sem você digitar: Apple Saúde, agenda |
| **Registro manual** | Dado que você insere no sistema |
| **Memória** | Conjunto do que o agente sabe sobre você ao longo do tempo (DEC-012) |
| **Dado sensível** | Dado com proteção especial (DEC-013); fronteira PENDENTE (PEN-06) |
| **Ambient Intelligence** | Filosofia de interface escolhida (DEC-020): adaptativa, discreta, com espaços persistentes |
| **Espaço persistente** | Ambiente de trabalho que preserva contexto e histórico (DEC-020) |
| **UC** | Caso de uso confirmado (UC-01..03) |
| **F-xx** | Funcionalidade descrita neste documento |
| **DEC / P / PEN / R** | Decisão confirmada / Proposta / Pendência / Risco |

---

## Registro de decisões

Origem "P0" = diretrizes do usuário no Prompt 0; "Conv." = respostas do
usuário na conversa de 01/11/2026.

| ID | Decisão | Origem | Status |
|---|---|---|---|
| DEC-001 | Onze domínios: identidade, espiritualidade, saúde, estudos, carreira, finanças, relacionamentos, ambiente, projetos, conhecimento, experiências | P0 | Confirmada |
| DEC-002 | Não é app de hábitos/produtividade/chatbot; ambiente inteligente, privado, adaptativo, expansível | P0 | Confirmada |
| DEC-003 | Sucesso = equilíbrio entre domínios | P0 | Confirmada |
| DEC-004 | Horizonte de 1–3 anos | P0 | Confirmada |
| DEC-005 | Experiências significativas são prioridade | P0 | Confirmada |
| DEC-006 | Ambição alta sem máquina de produtividade | P0 | Confirmada |
| DEC-007 | Papel: advisor / conselheiro estratégico | P0 | Confirmada |
| DEC-008 | Personalidade: racional, crítico, estratégico, direto | P0 | Confirmada |
| DEC-009 | Iniciativa alta | P0 | Confirmada |
| DEC-010 | Descoberta de oportunidades ativa | P0 | Confirmada |
| DEC-011 | Pode questionar crenças/objetivos, com razões, sem manipulação | P0 | Confirmada |
| DEC-012 | Descoberta pessoal contínua; memória abrangente | P0 | Confirmada |
| DEC-013 | Sensíveis com tratamento controlado e proteção especial | P0 | Confirmada |
| DEC-014 | Acompanhamento adaptativo: análise contínua, síntese diária, revisão semanal | P0 | Confirmada |
| DEC-015 | Autonomia interna alta só para ações reversíveis | P0 | Confirmada |
| DEC-016 | Externas/irreversíveis/alto impacto exigem autorização específica | P0 | Confirmada |
| DEC-017 | Pesquisa externa autônoma; fontes oficiais como prioridade | P0 | Confirmada |
| DEC-018 | IA na nuvem com seleção automática de modelos | P0 | Confirmada |
| DEC-019 | Não opera serviços externos em seu nome, exceto escrever na agenda | P0 + Conv. | Revisada |
| DEC-020 | Interface Ambient Intelligence, espaços persistentes, presença dinâmica | P0 | Confirmada |
| DEC-021 | Multimodalidade desejada | P0 | Confirmada (como desejo; v1 em PEN-15) |
| DEC-022 | Acesso a e-mail, agenda, banco e saúde | Conv. | **Substituída por DEC-024** |
| DEC-023 | Saúde é a fonte prioritária (Apple Watch / Apple Saúde) | Conv. | Confirmada |
| DEC-024 | Saúde só leitura; agenda leitura e escrita; e-mail e banco sem acesso | Conv. | Confirmada |
| DEC-025 | Casos de uso UC-01, UC-02, UC-03 | Conv. | Confirmada |
| DEC-026 | Agente só se comunica dentro do app | Conv. | Confirmada |
| DEC-027 | Usuário único | Conv. (H-01) | Confirmada |
| DEC-028 | Português | Conv. (H-02) | Confirmada |
| DEC-029 | R$50/mês só para APIs de IA; hospedagem/banco à parte, de preferência gratuitos | P0 + Conv. (H-03) | Confirmada |
| DEC-030 | Pesquisa web só leitura não é "ação externa" | Conv. (H-05) | Confirmada |
| DEC-031 | Desenvolvimento pelo usuário com ajuda do Claude, sem equipe | Conv. (H-06) | Confirmada |
