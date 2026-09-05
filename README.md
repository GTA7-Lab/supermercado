# Supermercado — Entidade GTA7 Lab

Ponto de compra da cidade digital GTA7 Lab: alimentos, bebidas, limpeza e bazar,
com padaria, açougue e peixaria. Expõe consulta de produtos e estoque por página
web, API REST e **MCP** (para o Core Orchestrator da GTA7 Lab).

## Stack

TypeScript · Next.js 15 (App Router) · [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) · Zod
Sem banco de dados: os dados vêm de `data/supermarket.json`.

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # build de produção
```

## Endpoints

| Rota | Descrição |
|------|-----------|
| `/` | Página de consulta (busca por texto, departamento, preço, estoque) |
| `GET /api/products?query=&department=&max_price=&in_stock_only=` | Consulta REST de produtos |
| `GET /api/manifest` | Manifesto da entidade para o Core Orchestrator |
| `POST /api/mcp` | Servidor MCP remoto (Streamable HTTP) |

## MCP tools

| Tool | Parâmetros | Retorno |
|------|-----------|---------|
| `search_products` | `query?`, `department?`, `max_price?`, `in_stock_only?` | `{ count, filters, products[] }` |
| `check_stock` | `product` (id, nome ou código de barras) | `{ found, product?, message }` |
| `get_store_info` | — | dados da loja + espaços de serviço |

### Testar o MCP local

```bash
npx @modelcontextprotocol/inspector
# conecte em http://localhost:3000/api/mcp (transport: Streamable HTTP)
```

## Dados — `data/supermarket.json`

- `store` — dados da loja e estrutura (estacionamento, banheiros, caixas, carrinhos) + `service_spaces`
- `products` — catálogo com preço, estoque, corredor, departamento
- `customers` — base de clientes / fidelidade
- `purchases` — histórico de compras

## Deploy

Publicado na Vercel. O framework é detectado automaticamente (Next.js).
Em monorepo, configure o **Root Directory** do projeto Vercel para a pasta desta entidade.
