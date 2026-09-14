# StudyOS

**Personal Study Operating System.** Não é uma lista de tarefas, um
calendário ou um clone do Anki — é uma camada de orquestração que
transforma seus dados de estudo em decisões: o que estudar agora, o que
você está prestes a esquecer, se você está pronto para a próxima prova.

## Rodando localmente

O banco é Postgres hospedado no Supabase (plano gratuito). Crie um projeto
em [supabase.com](https://supabase.com), copie a variável `DATABASE_URL`
de acordo com `.env.example`, e:

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL com a connection string do seu projeto Supabase
npx prisma migrate deploy  # aplica o schema no seu banco Supabase
npm run dev                 # http://localhost:3000
```

Veja `CLAUDE.md` para a arquitetura completa.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npx tsc --noEmit` | checagem de tipos |
| `npm run lint` | eslint |
| `npm run test:e2e` | testes end-to-end (Playwright) |
| `npm run test:unit` | testes de serviço (Vitest) |

## Documentação

- `CLAUDE.md` — arquitetura, convenções e decisões técnicas
- `PROJECT_STATUS.md` — fase atual, o que está pronto, o que falta
