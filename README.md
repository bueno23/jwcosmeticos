# JW Cosméticos — Sistema de Gestão

Estoque, vendas e financeiro da JW Cosméticos Multimarcas. Interface escura com a identidade da marca (preto e dourado do brasão), pensada para a dona acompanhar a loja no computador e operar a venda no balcão.

## Stack

- **Next.js 16** (App Router, Server Components) + **TypeScript**
- **Tailwind CSS 4** e **Lucide** para a interface, **Recharts** para os gráficos
- **PostgreSQL** com **Prisma 7** (adapter `@prisma/adapter-pg`)
- **Zod** + **React Hook Form** nos formulários

## Arquitetura

```
src/
  app/                 rotas e páginas (Server Components por padrão)
  components/
    layout/            sidebar, topbar e o shell do sistema
    ui/                peças reutilizáveis (StatCard, Card, StockBadge…)
    dashboard/         gráficos (Client Components, só onde precisa)
  lib/
    services/          regra de negócio e acesso ao banco
    prisma.ts          conexão única com o Postgres
    format.ts          dinheiro, datas e percentuais em pt-BR
prisma/
  schema.prisma        modelo de dados
  seed.ts              dados realistas para desenvolvimento
```

Regra: **componente não fala com o banco**. Toda consulta vive em `src/lib/services`, e a página monta o que o serviço devolve.

O modelo já nasce **multiempresa**: tudo pendura em `Company`. Hoje existe uma loja só, mas virar SaaS não exige refazer o esquema.

## Rodar localmente

Precisa de Docker (para o Postgres) e Node 22+.

```bash
docker run -d --name jw-estoque-db -e POSTGRES_PASSWORD=jw -e POSTGRES_DB=jw_estoque -p 55433:5432 postgres:16-alpine
```

Crie o arquivo `.env`:

```
DATABASE_URL="postgresql://postgres:jw@localhost:55433/jw_estoque?schema=public"
```

Depois:

```bash
npm install
npm run db:migrate    # cria as tabelas
npm run db:seed       # popula com dados de demonstração
npm run dev
```

Abre em http://localhost:3000.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | sobe o sistema em desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` / `npm run typecheck` | qualidade do código |
| `npm run db:migrate` | aplica alterações do schema |
| `npm run db:seed` | recria os dados de demonstração |
| `npm run db:studio` | abre o Prisma Studio para olhar o banco |
| `npm run db:reset` | zera o banco e roda tudo de novo |

## Dados de demonstração

O seed cria a JW Cosméticos com 8 categorias, 20 produtos, 3 fornecedores, 5 clientes, cerca de 450 vendas espalhadas pelos últimos 30 dias, despesas, contas a pagar, fiado em aberto e um caixa aberto. Todo estoque nasce de uma movimentação — nunca de um número solto —, então o histórico bate com o saldo.

## Estado do projeto

Fase 1 concluída: identidade visual, layout com sidebar e a dashboard completa lendo do banco.

A seguir: cadastros (produtos, categorias, fornecedores, clientes), PDV e caixa, financeiro, relatórios e, por último, multiempresa com login.

## Dados de demonstração e acesso

O seed cria a loja com categorias de cosméticos, 20 produtos, 3 fornecedores, 5 clientes, cerca de 450 vendas e um caixa aberto. Os usuários de demonstração e a senha ficam em `prisma/seed.ts`. Para a loja real, crie o dono com `prisma/criar-dono.ts` e não rode o seed.

## Versão anterior

O app em Python + SQLite está em `legado/`, só como referência.
