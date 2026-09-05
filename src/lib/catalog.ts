// Estado mutavel de produtos e espacos de servico, semeado pelo JSON.
// Na Vercel o disco e somente leitura: as alteracoes valem so durante a
// execucao (nao ficam salvas de forma permanente).
import { products as productSeed, store, type Product, type ServiceSpace } from "./data";

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

// --------------------------------------------------------------- produtos
let products: Product[] = productSeed.map((p) => ({ ...p }));
let pSeq = products.length;

/** Referencia viva do catalogo (usada por queries.ts). */
export function allProducts(): Product[] {
  return products;
}

function productIndex(idOrNameOrBarcode: string): number {
  const k = norm(idOrNameOrBarcode);
  if (!k) return -1;
  const exact = products.findIndex((p) => norm(p.id) === k || p.barcode === idOrNameOrBarcode.trim());
  if (exact !== -1) return exact;
  return products.findIndex((p) => norm(p.name).includes(k));
}

export function findProduct(idOrName: string): Product | undefined {
  const i = productIndex(idOrName);
  return i === -1 ? undefined : { ...products[i] };
}

export interface NewProduct {
  name: string;
  department: string;
  price: number;
  unit?: string;
  stock?: number;
  aisle?: string;
  brand?: string;
  category?: string;
  barcode?: string;
}

export function createProduct(input: NewProduct): Product {
  pSeq += 1;
  const product: Product = {
    id: `p-${String(pSeq).padStart(3, "0")}`,
    name: input.name.trim(),
    category: (input.category ?? input.department).trim(),
    department: input.department.trim(),
    brand: (input.brand ?? "").trim() || "Marca propria",
    price: Math.max(0, Number(input.price)),
    unit: (input.unit ?? "").trim() || "unidade",
    barcode: (input.barcode ?? "").trim() || `2${String(pSeq).padStart(12, "0")}`,
    stock: Math.max(0, Math.round(input.stock ?? 0)),
    aisle: (input.aisle ?? "").trim() || input.department.trim(),
    perishable: false,
  };
  products.push(product);
  return { ...product };
}

export interface ProductPatch {
  name?: string;
  department?: string;
  category?: string;
  brand?: string;
  price?: number;
  unit?: string;
  stock?: number;
  aisle?: string;
}

export function updateProduct(idOrName: string, patch: ProductPatch): Product | undefined {
  const i = productIndex(idOrName);
  if (i === -1) return undefined;
  const p = products[i];
  if (patch.name?.trim()) p.name = patch.name.trim();
  if (patch.department?.trim()) p.department = patch.department.trim();
  if (patch.category?.trim()) p.category = patch.category.trim();
  if (patch.brand?.trim()) p.brand = patch.brand.trim();
  if (patch.unit?.trim()) p.unit = patch.unit.trim();
  if (patch.aisle?.trim()) p.aisle = patch.aisle.trim();
  if (patch.price !== undefined) p.price = Math.max(0, Number(patch.price));
  if (patch.stock !== undefined) p.stock = Math.max(0, Math.round(patch.stock));
  return { ...p };
}

export function deleteProduct(idOrName: string): Product | undefined {
  const i = productIndex(idOrName);
  if (i === -1) return undefined;
  const [removed] = products.splice(i, 1);
  return removed;
}

// --------------------------------------------------- espacos de servico
let serviceSpaces: ServiceSpace[] = store.service_spaces.map((s) => ({ ...s }));
let sSeq = serviceSpaces.length;

export function listServiceSpaces(): ServiceSpace[] {
  return serviceSpaces.map((s) => ({ ...s }));
}

function spaceIndex(id: string): number {
  const k = norm(id);
  return serviceSpaces.findIndex((s) => norm(s.id) === k || (!!s.tenant && norm(s.tenant).includes(k)));
}

export function findServiceSpace(id: string): ServiceSpace | undefined {
  const i = spaceIndex(id);
  return i === -1 ? undefined : { ...serviceSpaces[i] };
}

export interface NewServiceSpace {
  tenant?: string;
  type?: string;
}

export function createServiceSpace(input: NewServiceSpace = {}): ServiceSpace {
  sSeq += 1;
  const tenant = (input.tenant ?? "").trim() || null;
  const space: ServiceSpace = {
    id: `svc-${sSeq}`,
    status: tenant ? "ocupado" : "disponivel",
    tenant,
    type: (input.type ?? "").trim() || null,
  };
  serviceSpaces.push(space);
  return { ...space };
}

export interface ServiceSpacePatch {
  tenant?: string | null;
  type?: string | null;
  status?: "disponivel" | "ocupado";
}

export function updateServiceSpace(id: string, patch: ServiceSpacePatch): ServiceSpace | undefined {
  const i = spaceIndex(id);
  if (i === -1) return undefined;
  const s = serviceSpaces[i];
  if (patch.tenant !== undefined) s.tenant = patch.tenant ? String(patch.tenant).trim() : null;
  if (patch.type !== undefined) s.type = patch.type ? String(patch.type).trim() : null;
  if (patch.status !== undefined) s.status = patch.status;
  else s.status = s.tenant ? "ocupado" : "disponivel";
  return { ...s };
}

export function deleteServiceSpace(id: string): ServiceSpace | undefined {
  const i = spaceIndex(id);
  if (i === -1) return undefined;
  const [removed] = serviceSpaces.splice(i, 1);
  return removed;
}
