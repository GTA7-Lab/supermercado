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

**Regras:**
1. Toda resposta MCP é texto em linguagem natural, amigável, sem jargão/JSON cru.
2. Toda **escrita** (produtos, serviços, clientes) exige a **palavra mágica** no
   parâmetro `magic_word`. Fonte: env `GTA7_MAGIC_WORD` (padrão `ericgomes`).
   `magic_word` é `optional` no schema (pra recusa sair amigável, não erro Zod).

Leitura: `search_products`, `check_stock`, `get_store_info`, `list_service_spaces`,
`list_customers`, `get_customer`, `list_purchases`.
Compra (SEM `magic_word`, mas baixa estoque): `register_purchase` — valida estoque de
forma atômica, grava o pedido e soma pontos de fidelidade (1 ponto/R$) se `customer` for informado.
Escrita de admin (com `magic_word`): `create_product`, `update_product`, `delete_product`,
`create_service_space`, `update_service_space`, `delete_service_space`,
`create_customer`, `update_customer`, `delete_customer`.

- `search_products`: `query` casa por token (aceita a frase inteira do Core); os dados
  estruturados vão em `structuredContent` (via `outputSchema` no `registerTool`) com `items`+`preco`.
- **Persistência:** `src/lib/repository.ts` é o dono único dos dados. Lê `data/supermarket.json`
  do disco (fallback: seed embutido no bundle) e `save()` grava de volta no arquivo.
  Toda escrita chama `save()` e a resposta diz o resultado via `savedNote()`:
  - **Local (`npm run dev`/`start`)**: grava no `data/supermarket.json` — persiste de verdade,
    aparece na página `/` e sobrevive a restart.
  - **Vercel**: disco somente leitura → `save()` falha de forma controlada, a mudança vale
    só enquanto a instância está quente e a resposta avisa "não consegui salvar".
- `catalog.ts` / `customers.ts` / `sales.ts` operam sobre `repository.getData()` (mesma instância).

## Arquivos principais

- `data/supermarket.json` — dados da entidade (datastore real, lido/escrito por repository.ts)
- `src/lib/data.ts` — tipos + `SEED` (import do JSON, fallback de leitura)
- `src/lib/repository.ts` — dono único dos dados: `getData()`, `save()`, `savedNote()`, `store`
- `src/lib/queries.ts` — `searchProducts`, `checkStock`, `listDepartments` (lógica compartilhada)
- `src/lib/catalog.ts` — CRUD de produtos e espaços de serviço (via repository)
- `src/lib/customers.ts` — CRUD de clientes + `addPoints` (via repository)
- `src/lib/sales.ts` — `registerPurchase` (baixa estoque + grava pedido + pontos), `listPurchases`
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
