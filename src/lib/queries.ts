// Funcoes de consulta reutilizadas pela pagina web, pela API REST e pelas MCP tools.
import { products, store, type Product } from "./data";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export interface SearchProductsInput {
  query?: string;
  department?: string;
  max_price?: number;
  in_stock_only?: boolean;
}

export interface SearchProductsResult {
  count: number;
  filters: SearchProductsInput;
  products: Product[];
}

export function searchProducts(input: SearchProductsInput = {}): SearchProductsResult {
  // `query` pode vir como uma frase inteira do usuario (via Core Orchestrator).
  // Casa por token: o produto entra se contiver qualquer palavra (>= 3 letras) da busca.
  const tokens = input.query
    ? [...new Set(norm(input.query).split(/[^a-z0-9]+/).filter((t) => t.length >= 3))]
    : [];
  const dep = input.department ? norm(input.department) : null;

  const list = products.filter((p) => {
    const haystack = norm(`${p.name} ${p.brand} ${p.category} ${p.department}`);
    if (tokens.length && !tokens.some((t) => haystack.includes(t))) return false;
    if (dep && norm(p.department) !== dep) return false;
    if (typeof input.max_price === "number" && p.price > input.max_price) return false;
    if (input.in_stock_only && p.stock <= 0) return false;
    return true;
  });

  return { count: list.length, filters: input, products: list };
}

export interface CheckStockResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    department: string;
    price: number;
    unit: string;
    stock: number;
    aisle: string;
    available: boolean;
  };
  message: string;
}

export function checkStock(product: string): CheckStockResult {
  const key = norm(String(product ?? "").trim());
  if (!key) {
    return { found: false, message: "Informe o id, o nome ou o codigo de barras do produto." };
  }

  const found =
    products.find((p) => norm(p.id) === key || p.barcode === product) ??
    products.find((p) => norm(p.name).includes(key));

  if (!found) {
    return { found: false, message: `Nenhum produto encontrado para "${product}".` };
  }

  return {
    found: true,
    product: {
      id: found.id,
      name: found.name,
      department: found.department,
      price: found.price,
      unit: found.unit,
      stock: found.stock,
      aisle: found.aisle,
      available: found.stock > 0,
    },
    message:
      found.stock > 0
        ? `${found.name}: ${found.stock} em estoque (corredor ${found.aisle}).`
        : `${found.name}: sem estoque no momento.`,
  };
}

export function listDepartments(): string[] {
  return store.facilities.departments;
}
