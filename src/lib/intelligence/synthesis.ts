// Prompts de síntese diária e revisão semanal (DEC-014, PEN-13 — DEC-T13).

export const DAILY_INSTRUCTION = `Gere a SÍNTESE DIÁRIA do usuário com base no <contexto_pessoal>.
Formato (máx. ~150 palavras, sem títulos markdown):
1. Uma frase de abertura sobre o estado geral (energia/sono recentes, se houver dados).
2. "Hoje": no máximo 3 pontos que merecem atenção (provas, prazos, objetivos parados, avisos).
3. "Equilíbrio": um domínio negligenciado e uma sugestão concreta e pequena — se houver dados.
4. Uma pergunta estratégica curta, só se for realmente útil.
Não invente dados: se faltar informação, diga o que registrar para a síntese melhorar.`;

export const WEEKLY_INSTRUCTION = `Conduza a REVISÃO SEMANAL com base no <contexto_pessoal>.
Estrutura (máx. ~350 palavras):
- O que avançou e o que travou nos objetivos e projetos.
- Equilíbrio entre domínios: onde a semana pesou e o que ficou de fora. Experiências significativas contam.
- Padrões observados (sempre como hipótese, com quantos dados os sustentam).
- Conflitos entre objetivos, se houver.
- No máximo 3 decisões ou ajustes recomendados para a próxima semana.
- Uma pergunta que desafie uma premissa, com respeito aos limites de questionamento.
Seja crítico e direto. Não invente dados.`;
