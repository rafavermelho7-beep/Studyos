# LIFE ENGINE — MASTER VISION

> Consolida os Prompts 0–1 (`00-contexto.md`, `01-documento-mestre.md`) e as decisões de 01/11/2026.
> Versão 1.0 · 01/11/2026.

## Em uma frase

Um ambiente inteligente, privado e de usuário único em que o JARVIS — conselheiro estratégico racional, crítico e direto — entende os
onze domínios da sua vida a partir dos seus dados e aponta problemas, conflitos e oportunidades, buscando **equilíbrio entre domínios
num horizonte de 1 a 3 anos**.

## O que é / o que não é

| É | Não é |
|---|---|
| Ambiente de inteligência pessoal que conecta domínios | App de hábitos, to-do ou "produtividade" |
| Conselheiro que questiona com razões | Chatbot bajulador ou executor autônomo |
| Memória com proveniência, revisável pelo usuário | Arquivo indiscriminado de tudo |
| Privado, um único usuário | Produto multiusuário ou social |

## Princípios inegociáveis

1. **Privado e de usuário único** — acesso só do `OWNER_EMAIL`; RLS em todas as tabelas.
2. **Equilíbrio acima de produtividade** — a medida de sucesso é o equilíbrio entre domínios.
3. **Conselheiro, não executor** — o modelo só produz texto/JSON; o servidor decide o que aplicar.
4. **Nada externo, irreversível ou de alto impacto sem autorização** — matriz de permissões no código.
5. **Questiona com razões, nunca manipula.**
6. **Honestidade epistêmica** — fato ≠ hipótese ≠ dado desatualizado; toda correlação traz o tamanho da amostra (P-03, adotada — DEC-T09 e regras com n mínimo).
7. **Silencioso fora do app** — o JARVIS só fala dentro do LIFE ENGINE.
8. **Custo controlado** — teto rígido de R$50/mês em APIs de IA, aplicado em código.

## Os onze domínios

Identidade · Espiritualidade · Saúde · Estudos · Carreira · Finanças · Relacionamentos · Ambiente · Projetos · Conhecimento · Experiências.

## Como o JARVIS sabe das coisas

1. **Conversas** (ambiente contínuo e Intelligence Spaces) → memória extraída com política.
2. **Registros leves** — check-in diário em três toques, autoavaliação semanal de equilíbrio, provas/prazos.
3. **Objetivos, projetos e decisões** registrados.
4. **Saúde** (Apple Saúde, só leitura) via Atalho do iPhone → agregados diários.
5. *(Futuro)* agenda, pesquisa externa, importação do StudyOS.

## Como ele age

- **Ambiente**: ao abrir o app, síntese do dia, sinais (avisos + propostas), equilíbrio, foco e registro rápido.
- **Conversa**: streaming; o JARVIS responde com contexto pessoal relevante.
- **Depois de cada conversa**: memórias registradas conforme a política; objetivos/projetos/decisões viram **propostas** que você aceita.
- **Regras determinísticas** (custo zero): treino parado (UC-02), sono × provas (UC-01), conflitos de prazo, projetos parados, domínio baixo.
- **Revisão semanal** sob demanda.

## Primeira prova de valor (Fase 1 — entregue)

Núcleo pequeno e confiável: identidade e memória iniciais, inteligência central com AI Router e orçamento, objetivos/projetos/decisões,
interface Ambient Intelligence coerente, e os casos UC-01/UC-02 por regras sobre dados reais de saúde.

## Horizonte

Fase 2: revisões e acompanhamento mais ricos, UC-03 (energia × estudo), resumo automático de espaços, busca semântica.
Fase 3: pesquisa externa e Opportunity Radar. Fase 4: agenda (com confirmação), multimodalidade (voz, imagens, documentos).
Fase 5: autonomia estrutural controlada (o JARVIS propõe novos módulos). Detalhes em `DEVELOPMENT-ROADMAP.md`.
