# Supermercado GTA7 Central — GTA7 Lab

Entidade **supermercado** da cidade digital GTA7 Lab: alimentos, bebidas, limpeza e bazar,
com padaria, açougue e peixaria. Expõe consulta de produtos, estoque e informações da loja
por página web, API REST e **MCP** (para o Core Orchestrator).

Repositório próprio: [`GTA7-Lab/supermercado`](https://github.com/GTA7-Lab/supermercado).
O Core Orchestrator da cidade fica em [`GTA7-Lab/gta7-lab`](https://github.com/GTA7-Lab/gta7-lab).

- **Produção:** https://gta7-lab-supermercado-b-on-d.vercel.app
- **MCP (HTTP):** https://gta7-lab-supermercado-b-on-d.vercel.app/api/mcp
- **Manifesto:** https://gta7-lab-supermercado-b-on-d.vercel.app/api/manifest

## Stack

TypeScript · Next.js 15 (App Router) · [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) · Zod.
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
| `search_products` | `query?`, `department?`, `max_price?`, `in_stock_only?` | `{ count, filters, products[], items[] }` |
| `check_stock` | `product` (id, nome ou código de barras) | `{ found, product?, message }` |
| `get_store_info` | — | dados da loja + `service_spaces` |

`search_products` casa `query` por token (aceita a frase inteira vinda do Core) e devolve
`items` com o alias `preco` — os campos que o Core Orchestrator reconhece.

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

## Deploy na Vercel

Projeto Next.js padrão — importar `GTA7-Lab/supermercado` na Vercel (Root Directory na raiz,
sem variáveis de ambiente). Projeto Vercel atual: `gta7-lab-supermercado`.
O MCP fica em `https://<domínio>/api/mcp`.

## Registro no Core

Registrada no repo do Core (`GTA7-Lab/gta7-lab`) em `core/data/entities.json` com
`transport: "http"`, tag `grocery` e o endpoint de produção acima. A tag `grocery`
foi adicionada em `core/src/lexicon.ts`.
