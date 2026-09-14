# StudyOS

**Personal Study Operating System.** Não é uma lista de tarefas, um
calendário ou um clone do Anki — é uma camada de orquestração que
transforma seus dados de estudo em decisões: o que estudar agora, o que
você está prestes a esquecer, se você está pronto para a próxima prova.

## Rodando localmente

```bash
npm install
npx prisma migrate dev   # cria/atualiza o banco SQLite local (prisma/dev.db)
npm run dev               # http://localhost:3000
```

Não é necessária nenhuma conta externa para desenvolver localmente — o
banco é SQLite local. Veja `CLAUDE.md` para a arquitetura completa e o
caminho de migração para Postgres/Supabase.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npx tsc --noEmit` | checagem de tipos |
| `npm run lint` | eslint |
| `npm run test:e2e` | testes end-to-end (Playwright) |

## Documentação

- `CLAUDE.md` — arquitetura, convenções e decisões técnicas
- `PROJECT_STATUS.md` — fase atual, o que está pronto, o que falta
