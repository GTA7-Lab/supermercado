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

- **Repo próprio:** `github.com/GTA7-Lab/supermercado` (código na raiz). O Core da cidade
  fica em `github.com/GTA7-Lab/gta7-lab` (checkout local em `../gta7-lab-monorepo`).
- **Vercel:** projeto `gta7-lab-supermercado`, produção pública (SSO desligado):
  `https://gta7-lab-supermercado-b-on-d.vercel.app`. **Git-linkado a `GTA7-Lab/supermercado`
  (branch `main`, Root Directory na raiz) — push = auto-deploy** (confirmado).
- **Core:** registrada no repo `GTA7-Lab/gta7-lab` em `core/data/entities.json`
  (`transport: http`, tag `grocery`, endpoint acima); tag `grocery` em `core/src/lexicon.ts`.
  `cd ../gta7-lab-monorepo/core && npm run build && npm run smoke` passa com as 3 entidades.
- Endpoints públicos validados: `/`, `/api/products`, `/api/manifest`, `/api/mcp`
  (initialize + tools/list + tools/call). Orquestração grocery ponta a ponta OK.

## Próxima tarefa

- Push na `main` de `GTA7-Lab/supermercado` já publica sozinho na Vercel.
- Se o domínio de produção mudar, atualizar o `endpoint` em `core/data/entities.json` (repo do Core).
- (Opcional) remover a pasta `entities/supermercado/` do monorepo `gta7-lab` via PR.
