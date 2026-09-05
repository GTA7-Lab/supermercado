# CLAUDE.md — Entidade Supermercado (GTA7 Lab)

## Entidade

- **id:** `supermarket`
- **Nome:** Supermercado GTA7 Central
- **Objetivo:** ponto de compra da cidade (alimentos, bebidas, limpeza, bazar) com
  padaria, açougue e peixaria. Expõe consulta de produtos/estoque via web, REST e MCP.

## Stack

TypeScript + Next.js 15 (App Router) + `mcp-handler` + `zod`. Sem banco: dados em JSON local.
Deploy alvo: Vercel. Versionamento: GitHub.

## Estrutura do JSON — `data/supermarket.json`

```
store: { id, name, description, address, hours,
         facilities: { parking_spaces, restrooms, shopping_carts, checkouts,
                       self_checkouts, departments[] },
         service_spaces: [{ id, status: disponivel|ocupado, tenant, type }] }
products:  [{ id, name, category, department, brand, price, unit, barcode, stock, aisle, perishable }]
customers: [{ id, name, loyalty_id, since, points }]
purchases: [{ id, customer_id, datetime, checkout, payment_method,
              items: [{ product_id, qty, unit_price }], total }]
```

## MCP tools — `src/app/api/mcp/route.ts` (endpoint `/api/mcp`, streamable-http)

| tool | params | retorno |
|------|--------|---------|
| `search_products` | `query?`, `department?`, `max_price?`, `in_stock_only?` | `{ count, filters, products[] }` |
| `check_stock` | `product` (id \| nome \| barcode) | `{ found, product?, message }` |
| `get_store_info` | — | dados da loja + `service_spaces` |

## Arquivos principais

- `data/supermarket.json` — dados da entidade
- `src/lib/data.ts` — carrega o JSON + tipos
- `src/lib/queries.ts` — `searchProducts`, `checkStock`, `listDepartments` (lógica compartilhada)
- `src/app/page.tsx` — página de consulta (form + tabela)
- `src/app/api/products/route.ts` — REST: `GET /api/products?query=&department=&max_price=&in_stock_only=`
- `src/app/api/mcp/route.ts` — servidor MCP remoto
- `src/app/api/manifest/route.ts` — `GET /api/manifest` para o Core
- `manifest.json` — manifesto estático da entidade (para o Core Orchestrator)

## Decisões

- JSON importado via `import` (bundled) — mais simples e funciona em serverless na Vercel.
- Lógica de busca única em `queries.ts`, reusada por web + REST + MCP.
- `basePath: "/api"` no `createMcpHandler` para o endpoint ficar em `/api/mcp`.
- Sem auth, sem pagamentos, sem escrita nos dados nesta versão.

## Status atual

v0.1 pronta e testada localmente (`npm run build` OK; `/api/mcp`, `/api/products`,
`/api/manifest` validados via curl).

- **Repo:** monorepo `github.com/ericmgomes/gta7-lab` (uma pasta por entidade).
  Esta entidade em `supermercado/`. Checkout local sobre `origin/main`; commit da
  entidade feito localmente, falta `git push` (precisa `gh auth login`).
- **Vercel:** projeto `gta7-lab-supermercado` (deploy production feito via MCP da Vercel).
  Produção com Vercel Authentication (SSO) ligada — desativar em
  Settings > Deployment Protection para o Core acessar `/api/mcp`.
  Root Directory do projeto Vercel = `supermercado`.

## Próxima tarefa

1. `gh auth login`, depois `git push` (main direto ou branch + PR).
2. Desativar Deployment Protection na Vercel e confirmar `/api/manifest` público.
3. Ligar o repo GitHub ao projeto Vercel (auto-deploy) com Root Directory `supermercado`.
4. Registrar a entidade no Core Orchestrator usando `/api/manifest`.
