// Endpoint MCP remoto da entidade Supermercado (Streamable HTTP).
// URL: /api/mcp  -> use no Core Orchestrator da GTA7 Lab ou em clientes MCP.
//
// Regra desta entidade: as respostas das tools sao sempre em linguagem natural,
// amigavel e sem jargao tecnico. Só `search_products` tambem devolve dados
// estruturados (structuredContent) para o Core Orchestrator conseguir combinar.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { checkStock, searchProducts } from "@/lib/queries";
import { store } from "@/lib/data";
import {
  createCustomer,
  deleteCustomer,
  findCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/customers";

export const maxDuration = 60;

const brl = (n: number) => "R$ " + n.toFixed(2).replace(".", ",");
const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const NAO_PERSISTE =
  "Obs.: nesta versao publicada os cadastros valem so durante a sessao — nao ficam salvos para sempre.";

function descreveCliente(c: {
  id: string;
  name: string;
  loyalty_id: string;
  since: string;
  points: number;
}): string {
  return `${c.name} (cliente ${c.id}, cartao fidelidade ${c.loyalty_id}, ${c.points} ponto(s), cliente desde ${c.since})`;
}

const handler = createMcpHandler((server) => {
  // ---------------------------------------------------------------- produtos
  server.registerTool(
    "search_products",
    {
      title: "Buscar produtos",
      description:
        "Busca produtos do supermercado por texto, departamento, preco maximo e disponibilidade em estoque.",
      inputSchema: {
        query: z.string().optional().describe("Texto livre: nome, marca ou categoria."),
        department: z
          .string()
          .optional()
          .describe("Departamento: hortifruti, mercearia, bebidas, limpeza, padaria, acougue, peixaria, bazar."),
        max_price: z.number().positive().optional().describe("Preco maximo em reais."),
        in_stock_only: z.boolean().optional().describe("Se true, mostra so o que tem em estoque."),
      },
      outputSchema: {
        resumo: z.string(),
        quantidade: z.number(),
        items: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            preco: z.number(),
            unidade: z.string(),
            departamento: z.string(),
            corredor: z.string(),
            estoque: z.number(),
          }),
        ),
      },
    },
    async (args) => {
      const { products } = searchProducts(args);
      const items = products.map((p) => ({
        id: p.id,
        name: p.name,
        preco: p.price,
        unidade: p.unit,
        departamento: p.department,
        corredor: p.aisle,
        estoque: p.stock,
      }));

      let resumo: string;
      if (items.length === 0) {
        resumo = "Nao encontrei nenhum produto com esses filtros. Tente outro nome ou departamento.";
      } else {
        const linhas = items
          .slice(0, 20)
          .map(
            (p) =>
              `- ${p.name}: ${brl(p.preco)} a ${p.unidade}, no corredor ${p.corredor} (${p.departamento}), ${p.estoque} em estoque`,
          );
        const extra = items.length > 20 ? `\n...e mais ${items.length - 20} produto(s).` : "";
        resumo = `Encontrei ${items.length} produto(s):\n${linhas.join("\n")}${extra}`;
      }

      return { ...text(resumo), structuredContent: { resumo, quantidade: items.length, items } };
    },
  );

  server.registerTool(
    "check_stock",
    {
      title: "Consultar estoque de um produto",
      description: "Diz se um produto esta disponivel, quanto custa e em qual corredor esta.",
      inputSchema: {
        product: z.string().describe("Nome do produto, o codigo (ex.: p-001) ou o codigo de barras."),
      },
    },
    async ({ product }) => {
      const r = checkStock(product);
      if (!r.found || !r.product) return text(r.message);
      const p = r.product;
      if (!p.available) {
        return text(`${p.name} esta em falta no momento. Assim que repuser, volta para o corredor ${p.aisle}.`);
      }
      return text(
        `${p.name} esta disponivel: ${p.stock} em estoque, no corredor ${p.aisle}, a ${brl(p.price)} por ${p.unit}.`,
      );
    },
  );

  server.registerTool(
    "get_store_info",
    {
      title: "Informacoes da loja",
      description: "Endereco, horario, estrutura (estacionamento, caixas, carrinhos) e espacos de servico.",
      inputSchema: {},
    },
    async () => {
      const f = store.facilities;
      const livres = store.service_spaces.filter((s) => s.status === "disponivel").length;
      const ocupados = store.service_spaces
        .filter((s) => s.status === "ocupado")
        .map((s) => s.tenant)
        .filter(Boolean);
      const partes = [
        `${store.name} fica na ${store.address}.`,
        `Funciona ${store.hours}.`,
        `Tem ${f.parking_spaces} vagas de estacionamento, banheiros, ${f.shopping_carts} carrinhos e ${
          f.checkouts + f.self_checkouts
        } caixas (${f.checkouts} comuns e ${f.self_checkouts} de autoatendimento).`,
        `Departamentos: ${f.departments.join(", ")}.`,
        ocupados.length
          ? `Servicos parceiros em funcionamento: ${ocupados.join(" e ")}.`
          : "Nenhum servico parceiro no momento.",
        livres
          ? `Ha ${livres} espaco(s) livre(s) para novos servicos (lavanderia, cafeteria, lanchonete...).`
          : "Todos os espacos de servico estao ocupados.",
      ];
      return text(partes.join(" "));
    },
  );

  // ---------------------------------------------------------------- clientes
  server.registerTool(
    "list_customers",
    {
      title: "Listar clientes",
      description: "Lista os clientes cadastrados, com filtro opcional por nome, codigo ou cartao fidelidade.",
      inputSchema: {
        query: z.string().optional().describe("Texto para filtrar (nome, codigo ou cartao fidelidade)."),
      },
    },
    async ({ query }) => {
      const found = listCustomers(query);
      if (found.length === 0) {
        return text(
          query ? `Nenhum cliente encontrado para "${query}".` : "Ainda nao ha clientes cadastrados.",
        );
      }
      const linhas = found.map((c) => `- ${descreveCliente(c)}`);
      return text(`${found.length} cliente(s):\n${linhas.join("\n")}`);
    },
  );

  server.registerTool(
    "get_customer",
    {
      title: "Ver um cliente",
      description: "Mostra os dados de um cliente pelo nome, codigo ou cartao fidelidade.",
      inputSchema: {
        customer: z.string().describe("Nome, codigo (ex.: c-001) ou cartao fidelidade (ex.: GTA7-1001)."),
      },
    },
    async ({ customer }) => {
      const c = findCustomer(customer);
      return c
        ? text(`Encontrei: ${descreveCliente(c)}.`)
        : text(`Nao encontrei nenhum cliente para "${customer}". Confira o nome ou o codigo.`);
    },
  );

  server.registerTool(
    "create_customer",
    {
      title: "Cadastrar cliente",
      description: "Cadastra um novo cliente. So o nome e obrigatorio.",
      inputSchema: {
        name: z.string().min(1).describe("Nome do cliente."),
        loyalty_id: z.string().optional().describe("Cartao fidelidade. Se nao informar, e gerado um."),
        points: z.number().min(0).optional().describe("Pontos iniciais (padrao 0)."),
      },
    },
    async ({ name, loyalty_id, points }) => {
      const c = createCustomer({ name, loyalty_id, points });
      return text(`Pronto! Cadastrei ${descreveCliente(c)}. ${NAO_PERSISTE}`);
    },
  );

  server.registerTool(
    "update_customer",
    {
      title: "Atualizar cliente",
      description: "Atualiza nome, cartao fidelidade ou pontos de um cliente existente.",
      inputSchema: {
        customer: z.string().describe("Nome, codigo ou cartao fidelidade do cliente a atualizar."),
        name: z.string().optional().describe("Novo nome."),
        loyalty_id: z.string().optional().describe("Novo cartao fidelidade."),
        points: z.number().min(0).optional().describe("Novo total de pontos."),
      },
    },
    async ({ customer, name, loyalty_id, points }) => {
      if (name === undefined && loyalty_id === undefined && points === undefined) {
        return text("Diga o que voce quer mudar: nome, cartao fidelidade ou pontos.");
      }
      const c = updateCustomer(customer, { name, loyalty_id, points });
      return c
        ? text(`Atualizei: agora ${descreveCliente(c)}. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum cliente para "${customer}", entao nada foi alterado.`);
    },
  );

  server.registerTool(
    "delete_customer",
    {
      title: "Remover cliente",
      description: "Remove um cliente do cadastro pelo nome, codigo ou cartao fidelidade.",
      inputSchema: {
        customer: z.string().describe("Nome, codigo ou cartao fidelidade do cliente a remover."),
      },
    },
    async ({ customer }) => {
      const c = deleteCustomer(customer);
      return c
        ? text(`Removi ${c.name} (cliente ${c.id}) do cadastro. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum cliente para "${customer}", entao nada foi removido.`);
    },
  );
}, {
  serverInfo: { name: "gta7-lab-supermarket", version: "0.1.0" },
}, { basePath: "/api" });

export { handler as GET, handler as POST, handler as DELETE };
