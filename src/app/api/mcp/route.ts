// Endpoint MCP remoto da entidade Supermercado (Streamable HTTP).
// URL: /api/mcp  -> use no Core Orchestrator da GTA7 Lab ou em clientes MCP.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { checkStock, searchProducts } from "@/lib/queries";
import { store } from "@/lib/data";

export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_products",
      "Busca produtos do supermercado por texto, departamento, preco maximo e disponibilidade em estoque.",
      {
        query: z.string().optional().describe("Texto livre: nome, marca ou categoria."),
        department: z
          .string()
          .optional()
          .describe("Departamento: hortifruti, mercearia, bebidas, limpeza, padaria, acougue, peixaria, bazar."),
        max_price: z.number().positive().optional().describe("Preco maximo em reais."),
        in_stock_only: z.boolean().optional().describe("Se true, retorna apenas itens com estoque > 0."),
      },
      async (args) => {
        const result = searchProducts(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      "check_stock",
      "Consulta o estoque, o preco e o corredor de um produto pelo id, nome ou codigo de barras.",
      {
        product: z.string().describe("id (ex.: p-001), nome (ex.: arroz) ou codigo de barras."),
      },
      async ({ product }) => {
        const result = checkStock(product);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      "get_store_info",
      "Retorna dados gerais da loja: endereco, horario, estrutura (estacionamento, caixas, carrinhos) e espacos de servico disponiveis.",
      {},
      async () => {
        const info = {
          id: store.id,
          name: store.name,
          address: store.address,
          hours: store.hours,
          facilities: store.facilities,
          service_spaces: store.service_spaces,
          service_spaces_available: store.service_spaces.filter((s) => s.status === "disponivel").length,
        };
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      },
    );
  },
  { serverInfo: { name: "gta7-lab-supermarket", version: "0.1.0" } },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
