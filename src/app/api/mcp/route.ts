// Endpoint MCP remoto da entidade Supermercado (Streamable HTTP).
// URL: /api/mcp  -> use no Core Orchestrator da GTA7 Lab ou em clientes MCP.
//
// Regras desta entidade:
//  1. As respostas das tools sao sempre em linguagem natural, amigavel, sem jargao.
//  2. Toda ESCRITA DE ADMIN (cadastro de produtos, servicos e clientes) exige a
//     "palavra magica" (env GTA7_MAGIC_WORD; padrao "ericgomes").
//  3. Comprar (`register_purchase`) e acao de cliente: NAO exige a palavra magica,
//     mas baixa o estoque dos produtos vendidos.
//  4. So `search_products` tambem devolve structuredContent para o Core Orchestrator.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { checkStock, searchProducts } from "@/lib/queries";
import { store } from "@/lib/data";
import {
  createProduct,
  createServiceSpace,
  deleteProduct,
  deleteServiceSpace,
  findProduct,
  listServiceSpaces,
  updateProduct,
  updateServiceSpace,
} from "@/lib/catalog";
import { listPurchases, registerPurchase } from "@/lib/sales";
import {
  createCustomer,
  deleteCustomer,
  findCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/customers";

export const maxDuration = 60;

const MAGIC = (process.env.GTA7_MAGIC_WORD ?? "ericgomes").trim();
const brl = (n: number) => "R$ " + n.toFixed(2).replace(".", ",");
const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const NAO_PERSISTE =
  "Obs.: nesta versao publicada a mudanca vale so durante a sessao — nao fica salva para sempre.";

/** Devolve uma resposta de recusa (texto) se a palavra magica estiver errada; senao null. */
function semPalavraMagica(word: string | undefined) {
  if ((word ?? "").trim() === MAGIC) return null;
  return text(
    "Essa operacao e protegida. Refaca o pedido informando a palavra magica correta em `magic_word`.",
  );
}

function descreveProduto(p: {
  id: string;
  name: string;
  price: number;
  unit: string;
  department: string;
  aisle: string;
  stock: number;
}): string {
  return `${p.name} (${p.id}): ${brl(p.price)} por ${p.unit}, no corredor ${p.aisle} (${p.department}), ${p.stock} em estoque`;
}

function descreveEspaco(s: { id: string; status: string; tenant: string | null; type: string | null }): string {
  return s.tenant
    ? `${s.id}: ocupado por ${s.tenant}${s.type ? ` (${s.type})` : ""}`
    : `${s.id}: livre, pronto para um novo servico`;
}

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
  // ============================================================ PRODUTOS (leitura)
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

  // ============================================================ COMPRAS
  server.registerTool(
    "register_purchase",
    {
      title: "Registrar compra",
      description:
        "Registra a compra de um ou mais produtos: baixa o estoque de cada um e guarda o pedido. Opcionalmente atribui pontos de fidelidade a um cliente. Nao exige palavra magica.",
      inputSchema: {
        items: z
          .array(
            z.object({
              product: z.string().describe("Nome, codigo (p-001) ou codigo de barras do produto."),
              quantity: z.number().positive().describe("Quantidade comprada."),
            }),
          )
          .min(1)
          .describe("Itens da compra."),
        customer: z.string().optional().describe("Cliente (nome, codigo ou cartao fidelidade) para somar pontos."),
        payment_method: z.string().optional().describe("Forma de pagamento (ex.: pix, credito, debito, dinheiro)."),
      },
    },
    async ({ items, customer, payment_method }) => {
      const r = registerPurchase(items, { customer, payment_method });
      if (!r.ok) return text(r.error);

      const linhas = r.sold.map(
        (i) => `- ${i.qty}x ${i.name} a ${brl(i.unit_price)} (estoque agora: ${i.new_stock})`,
      );
      let msg = `Compra registrada (pedido ${r.order.id}):\n${linhas.join("\n")}\nTotal: ${brl(r.total)}, pago com ${r.order.payment_method}.`;
      if (r.customer) {
        msg += `\n${r.customer.name} ganhou ${r.points_earned} ponto(s) e agora tem ${r.customer.points}.`;
      } else if (customer) {
        msg += `\n(Nao achei o cliente "${customer}", entao os pontos nao foram atribuidos.)`;
      }
      return text(`${msg} ${NAO_PERSISTE}`);
    },
  );

  server.registerTool(
    "list_purchases",
    {
      title: "Listar compras",
      description: "Mostra as compras registradas (as mais recentes primeiro).",
      inputSchema: {
        limit: z.number().int().positive().max(50).optional().describe("Quantas mostrar (padrao 10)."),
      },
    },
    async ({ limit }) => {
      const all = listPurchases().sort((a, b) => b.datetime.localeCompare(a.datetime));
      const take = all.slice(0, limit ?? 10);
      if (take.length === 0) return text("Ainda nao ha compras registradas.");
      const linhas = take.map((o) => {
        const qtdItens = o.items.reduce((s, it) => s + it.qty, 0);
        const quem = o.customer_id ? `cliente ${o.customer_id}` : "sem cliente";
        return `- ${o.id}: ${qtdItens} item(ns), ${brl(o.total)}, ${o.payment_method}, ${quem} (${o.datetime.slice(0, 10)})`;
      });
      return text(`${take.length} compra(s) (de ${all.length}):\n${linhas.join("\n")}`);
    },
  );

  // ============================================================ PRODUTOS (escrita)
  server.registerTool(
    "create_product",
    {
      title: "Cadastrar produto",
      description: "Cadastra um novo produto no catalogo. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        name: z.string().min(1).describe("Nome do produto."),
        department: z.string().min(1).describe("Departamento (ex.: mercearia, bebidas, limpeza...)."),
        price: z.number().min(0).describe("Preco em reais."),
        unit: z.string().optional().describe("Unidade (ex.: pacote, kg, garrafa). Padrao: unidade."),
        stock: z.number().min(0).optional().describe("Quantidade em estoque (padrao 0)."),
        aisle: z.string().optional().describe("Corredor. Padrao: o nome do departamento."),
        brand: z.string().optional().describe("Marca."),
        category: z.string().optional().describe("Categoria."),
      },
    },
    async ({ magic_word, ...input }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const p = createProduct(input);
      return text(`Pronto! Cadastrei ${descreveProduto(p)}. ${NAO_PERSISTE}`);
    },
  );

  server.registerTool(
    "update_product",
    {
      title: "Atualizar produto",
      description: "Atualiza dados de um produto (preco, estoque, corredor, etc.). Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        product: z.string().describe("Nome, codigo (p-001) ou codigo de barras do produto."),
        name: z.string().optional(),
        department: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        price: z.number().min(0).optional(),
        unit: z.string().optional(),
        stock: z.number().min(0).optional(),
        aisle: z.string().optional(),
      },
    },
    async ({ magic_word, product, ...patch }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const hasChange = Object.values(patch).some((v) => v !== undefined);
      if (!hasChange) return text("Diga o que mudar: preco, estoque, corredor, nome, departamento...");
      const p = updateProduct(product, patch);
      return p
        ? text(`Atualizei: agora ${descreveProduto(p)}. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum produto para "${product}", entao nada foi alterado.`);
    },
  );

  server.registerTool(
    "delete_product",
    {
      title: "Remover produto",
      description: "Remove um produto do catalogo. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        product: z.string().describe("Nome, codigo ou codigo de barras do produto."),
      },
    },
    async ({ magic_word, product }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const p = deleteProduct(product);
      return p
        ? text(`Removi ${p.name} (${p.id}) do catalogo. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum produto para "${product}", entao nada foi removido.`);
    },
  );

  // ============================================================ INFO / SERVICOS (leitura)
  server.registerTool(
    "get_store_info",
    {
      title: "Informacoes da loja",
      description: "Endereco, horario, estrutura (estacionamento, caixas, carrinhos) e espacos de servico.",
      inputSchema: {},
    },
    async () => {
      const f = store.facilities;
      const espacos = listServiceSpaces();
      const livres = espacos.filter((s) => s.status === "disponivel").length;
      const ocupados = espacos.filter((s) => s.tenant).map((s) => s.tenant);
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

  server.registerTool(
    "list_service_spaces",
    {
      title: "Listar espacos de servico",
      description: "Lista os espacos de servico rapido da loja e se estao livres ou ocupados.",
      inputSchema: {},
    },
    async () => {
      const espacos = listServiceSpaces();
      if (espacos.length === 0) return text("Nao ha espacos de servico cadastrados.");
      return text(`${espacos.length} espaco(s) de servico:\n${espacos.map((s) => `- ${descreveEspaco(s)}`).join("\n")}`);
    },
  );

  // ============================================================ SERVICOS (escrita)
  server.registerTool(
    "create_service_space",
    {
      title: "Criar espaco de servico",
      description: "Adiciona um espaco de servico rapido. Se informar o lojista, ja entra como ocupado. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        tenant: z.string().optional().describe("Nome do lojista/servico que vai ocupar (opcional)."),
        type: z.string().optional().describe("Tipo de servico (ex.: lavanderia, cafeteria, loterica, lanchonete)."),
      },
    },
    async ({ magic_word, tenant, type }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const s = createServiceSpace({ tenant, type });
      return text(`Criei o espaco de servico ${descreveEspaco(s)}. ${NAO_PERSISTE}`);
    },
  );

  server.registerTool(
    "update_service_space",
    {
      title: "Atualizar espaco de servico",
      description:
        "Ocupa ou libera um espaco de servico, ou muda o lojista/tipo. Exige a palavra magica. Para liberar, passe tenant vazio.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        space: z.string().describe("Codigo do espaco (ex.: svc-1) ou nome do lojista atual."),
        tenant: z.string().optional().describe("Novo lojista. Vazio (\"\") libera o espaco."),
        type: z.string().optional().describe("Novo tipo de servico."),
      },
    },
    async ({ magic_word, space, tenant, type }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      if (tenant === undefined && type === undefined) {
        return text("Diga o que mudar: o lojista (tenant) ou o tipo de servico.");
      }
      const s = updateServiceSpace(space, { tenant, type });
      return s
        ? text(`Atualizei: ${descreveEspaco(s)}. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum espaco de servico para "${space}", entao nada foi alterado.`);
    },
  );

  server.registerTool(
    "delete_service_space",
    {
      title: "Remover espaco de servico",
      description: "Remove um espaco de servico da loja. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        space: z.string().describe("Codigo do espaco (ex.: svc-1) ou nome do lojista atual."),
      },
    },
    async ({ magic_word, space }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const s = deleteServiceSpace(space);
      return s
        ? text(`Removi o espaco ${s.id}${s.tenant ? ` (era de ${s.tenant})` : ""}. ${NAO_PERSISTE}`)
        : text(`Nao encontrei nenhum espaco de servico para "${space}", entao nada foi removido.`);
    },
  );

  // ============================================================ CLIENTES (leitura)
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
        return text(query ? `Nenhum cliente encontrado para "${query}".` : "Ainda nao ha clientes cadastrados.");
      }
      return text(`${found.length} cliente(s):\n${found.map((c) => `- ${descreveCliente(c)}`).join("\n")}`);
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

  // ============================================================ CLIENTES (escrita)
  server.registerTool(
    "create_customer",
    {
      title: "Cadastrar cliente",
      description: "Cadastra um novo cliente. So o nome e obrigatorio. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        name: z.string().min(1).describe("Nome do cliente."),
        loyalty_id: z.string().optional().describe("Cartao fidelidade. Se nao informar, e gerado um."),
        points: z.number().min(0).optional().describe("Pontos iniciais (padrao 0)."),
      },
    },
    async ({ magic_word, name, loyalty_id, points }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
      const c = createCustomer({ name, loyalty_id, points });
      return text(`Pronto! Cadastrei ${descreveCliente(c)}. ${NAO_PERSISTE}`);
    },
  );

  server.registerTool(
    "update_customer",
    {
      title: "Atualizar cliente",
      description: "Atualiza nome, cartao fidelidade ou pontos de um cliente existente. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        customer: z.string().describe("Nome, codigo ou cartao fidelidade do cliente a atualizar."),
        name: z.string().optional().describe("Novo nome."),
        loyalty_id: z.string().optional().describe("Novo cartao fidelidade."),
        points: z.number().min(0).optional().describe("Novo total de pontos."),
      },
    },
    async ({ magic_word, customer, name, loyalty_id, points }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
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
      description: "Remove um cliente do cadastro pelo nome, codigo ou cartao fidelidade. Exige a palavra magica.",
      inputSchema: {
        magic_word: z.string().optional().describe("Palavra magica de autorizacao (obrigatoria nesta operacao)."),
        customer: z.string().describe("Nome, codigo ou cartao fidelidade do cliente a remover."),
      },
    },
    async ({ magic_word, customer }) => {
      const bloqueio = semPalavraMagica(magic_word);
      if (bloqueio) return bloqueio;
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
