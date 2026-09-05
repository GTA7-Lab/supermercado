// CRUD de produtos e espacos de servico. Estado real em data/supermarket.json
// via repository.ts (persistido no arquivo; na Vercel o disco e somente leitura).
import { getData, save, type SaveResult } from "./repository";
import type { Product, ServiceSpace } from "./data";

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

// --------------------------------------------------------------- produtos
/** Referencia viva do catalogo (usada por queries.ts). */
export function allProducts(): Product[] {
  return getData().products;
}

function nextProductId(): string {
  const nums = allProducts()
    .map((p) => Number(/^p-(\d+)$/.exec(p.id)?.[1]))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `p-${String(next).padStart(3, "0")}`;
}

function productIndex(idOrNameOrBarcode: string): number {
  const k = norm(idOrNameOrBarcode);
  if (!k) return -1;
  const products = allProducts();
  const exact = products.findIndex((p) => norm(p.id) === k || p.barcode === idOrNameOrBarcode.trim());
  if (exact !== -1) return exact;
  return products.findIndex((p) => norm(p.name).includes(k));
}

export function findProduct(idOrName: string): Product | undefined {
  const i = productIndex(idOrName);
  return i === -1 ? undefined : { ...allProducts()[i] };
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

export async function createProduct(
  input: NewProduct,
): Promise<{ product: Product; persist: SaveResult }> {
  const id = nextProductId();
  const product: Product = {
    id,
    name: input.name.trim(),
    category: (input.category ?? input.department).trim(),
    department: input.department.trim(),
    brand: (input.brand ?? "").trim() || "Marca propria",
    price: Math.max(0, Number(input.price)),
    unit: (input.unit ?? "").trim() || "unidade",
    barcode: (input.barcode ?? "").trim() || `2${id.replace(/\D/g, "").padStart(12, "0")}`,
    stock: Math.max(0, Math.round(input.stock ?? 0)),
    aisle: (input.aisle ?? "").trim() || input.department.trim(),
    perishable: false,
  };
  allProducts().push(product);
  return { product: { ...product }, persist: await save() };
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

export async function updateProduct(
  idOrName: string,
  patch: ProductPatch,
): Promise<{ product?: Product; persist?: SaveResult }> {
  const i = productIndex(idOrName);
  if (i === -1) return {};
  const p = allProducts()[i];
  if (patch.name?.trim()) p.name = patch.name.trim();
  if (patch.department?.trim()) p.department = patch.department.trim();
  if (patch.category?.trim()) p.category = patch.category.trim();
  if (patch.brand?.trim()) p.brand = patch.brand.trim();
  if (patch.unit?.trim()) p.unit = patch.unit.trim();
  if (patch.aisle?.trim()) p.aisle = patch.aisle.trim();
  if (patch.price !== undefined) p.price = Math.max(0, Number(patch.price));
  if (patch.stock !== undefined) p.stock = Math.max(0, Math.round(patch.stock));
  return { product: { ...p }, persist: await save() };
}

export async function deleteProduct(
  idOrName: string,
): Promise<{ product?: Product; persist?: SaveResult }> {
  const i = productIndex(idOrName);
  if (i === -1) return {};
  const [removed] = allProducts().splice(i, 1);
  return { product: removed, persist: await save() };
}

// --------------------------------------------------- espacos de servico
export function listServiceSpaces(): ServiceSpace[] {
  return getData().store.service_spaces.map((s) => ({ ...s }));
}

function spaces(): ServiceSpace[] {
  return getData().store.service_spaces;
}

function spaceIndex(id: string): number {
  const k = norm(id);
  return spaces().findIndex((s) => norm(s.id) === k || (!!s.tenant && norm(s.tenant).includes(k)));
}

export function findServiceSpace(id: string): ServiceSpace | undefined {
  const i = spaceIndex(id);
  return i === -1 ? undefined : { ...spaces()[i] };
}

export interface NewServiceSpace {
  tenant?: string;
  type?: string;
}

export async function createServiceSpace(
  input: NewServiceSpace = {},
): Promise<{ space: ServiceSpace; persist: SaveResult }> {
  const nums = spaces()
    .map((s) => Number(/^svc-(\d+)$/.exec(s.id)?.[1]))
    .filter((n) => Number.isFinite(n));
  const id = `svc-${(nums.length ? Math.max(...nums) : 0) + 1}`;
  const tenant = (input.tenant ?? "").trim() || null;
  const space: ServiceSpace = {
    id,
    status: tenant ? "ocupado" : "disponivel",
    tenant,
    type: (input.type ?? "").trim() || null,
  };
  spaces().push(space);
  return { space: { ...space }, persist: await save() };
}

export interface ServiceSpacePatch {
  tenant?: string | null;
  type?: string | null;
  status?: "disponivel" | "ocupado";
}

export async function updateServiceSpace(
  id: string,
  patch: ServiceSpacePatch,
): Promise<{ space?: ServiceSpace; persist?: SaveResult }> {
  const i = spaceIndex(id);
  if (i === -1) return {};
  const s = spaces()[i];
  if (patch.tenant !== undefined) s.tenant = patch.tenant ? String(patch.tenant).trim() : null;
  if (patch.type !== undefined) s.type = patch.type ? String(patch.type).trim() : null;
  if (patch.status !== undefined) s.status = patch.status;
  else s.status = s.tenant ? "ocupado" : "disponivel";
  return { space: { ...s }, persist: await save() };
}

export async function deleteServiceSpace(
  id: string,
): Promise<{ space?: ServiceSpace; persist?: SaveResult }> {
  const i = spaceIndex(id);
  if (i === -1) return {};
  const [removed] = spaces().splice(i, 1);
  return { space: removed, persist: await save() };
}
