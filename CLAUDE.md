# CLAUDE.md — Entidade Supermercado (GTA7 Lab)

## Entidade

- **id:** `supermercado` (no registro do Core e no `manifest.json`)
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
| `search_products` | `query?`, `department?`, `max_price?`, `in_stock_only?` | `{ count, filters, products[], items[] }` |
| `check_stock` | `product` (id \| nome \| barcode) | `{ found, product?, message }` |
| `get_store_info` | — | dados da loja + `service_spaces` |

`search_products`: `query` casa por token (aceita frase inteira do Core) e o retorno traz
`items` com alias `preco` — o formato que o Core Orchestrator lê.

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

v0.1 **no ar e integrada**.

- **Repo:** monorepo `github.com/ericmgomes/gta7-lab`, esta entidade em `entities/supermercado/`.
- **Vercel:** projeto `gta7-lab-supermercado`, produção pública (SSO desligado):
  `https://gta7-lab-supermercado-b-on-d.vercel.app`. Deploy via MCP da Vercel
  (Root Directory = `entities/supermercado`). Git-link GitHub↔Vercel: opcional/pendente.
- **Core:** registrada em `core/data/entities.json` (`transport: http`, tag `grocery`,
  endpoint acima); tag `grocery` adicionada em `core/src/lexicon.ts`.
  `cd core && npm run build && npm run smoke` passa com as 3 entidades.
- Endpoints públicos validados: `/`, `/api/products`, `/api/manifest`, `/api/mcp`
  (initialize + tools/list + tools/call). Orquestração grocery ponta a ponta OK.

## Próxima tarefa

- (Opcional) ligar o repo GitHub ao projeto Vercel para auto-deploy on push.
- Se o endpoint de produção mudar, atualizar `core/data/entities.json`.
