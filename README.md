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

## Acesso aos dados

**Exclusivamente pelas MCP tools em `POST /api/mcp`.** Não há endpoint REST de dados e a
página `/` não lista nada — é só uma landing que aponta para o MCP.

| Rota | Descrição |
|------|-----------|
| `POST /api/mcp` | Servidor MCP (Streamable HTTP) — **único acesso aos dados** |
| `GET /api/manifest` | Manifesto: nome da entidade + lista de tools (sem dados), para o Core |
| `/` | Landing estática (sem dados) |

## MCP tools

Leitura: `search_products`, `check_stock`, `get_store_info`, `list_service_spaces`,
`list_customers`, `get_customer`, `list_purchases`.
Compra (baixa estoque, sem palavra mágica): `register_purchase`.
Escrita de admin (exige `magic_word`): `create/update/delete_product`,
`create/update/delete_service_space`, `create/update/delete_customer`.

`search_products` casa `query` por token (aceita a frase inteira vinda do Core) e devolve
o texto amigável + `structuredContent` com `items`/`preco` para o Core Orchestrator.

### Testar o MCP local

```bash
npx @modelcontextprotocol/inspector
# conecte em http://localhost:3000/api/mcp (transport: Streamable HTTP)
```

## Dados e persistência — `data/supermarket.json`

Esse arquivo é o datastore. `store`, `products`, `customers`, `purchases`.
Toda escrita (cadastro de produto/serviço/cliente e `register_purchase`) grava de volta nele:

- **Local** (`npm run dev`/`start`): grava no arquivo — persiste e aparece na página `/`.
- **Vercel** (disco somente leitura): se houver `GITHUB_TOKEN`, faz um **commit do arquivo
  no repositório**; o deploy automático republica com os dados novos em ~1 min.
  Sem token, a alteração vale só durante a sessão da instância.

⚠️ Na Vercel, cada escrita vira um commit + rebuild (~1 min) — inclusive cada compra.

## Deploy na Vercel

Importar `GTA7-Lab/supermercado` (Root Directory na raiz). Projeto atual: `gta7-lab-supermercado`.
O MCP fica em `https://<domínio>/api/mcp`.

### Variáveis de ambiente (para persistência na Vercel)

| Var | Para quê |
|-----|----------|
| `GITHUB_TOKEN` | PAT fine-grained no repo `GTA7-Lab/supermercado` com **Contents: Read and write**. Sem ela, escritas não persistem em produção. |
| `GTA7_MAGIC_WORD` | Sobrescreve a palavra mágica das escritas de admin (padrão no código: `ericgomes`). |
| `GITHUB_REPO` / `GITHUB_BRANCH` / `GITHUB_DATA_PATH` | Opcionais. Padrões: `GTA7-Lab/supermercado` / `main` / `data/supermarket.json`. |
| `FORCE_GITHUB_PERSIST=1` | Opcional. Força o commit no GitHub mesmo com disco gravável (teste). |

Criar o token em GitHub → Settings → Developer settings → Fine-grained tokens →
resource owner `GTA7-Lab`, repo `supermercado`, permissão **Contents: Read and write**.

## Registro no Core

Registrada no repo do Core (`GTA7-Lab/gta7-lab`) em `core/data/entities.json` com
`transport: "http"`, tag `grocery` e o endpoint de produção acima. A tag `grocery`
foi adicionada em `core/src/lexicon.ts`.
