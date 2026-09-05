// CRUD da base de clientes. Estado real em data/supermarket.json via repository.ts.
import { getData, save, type SaveResult } from "./repository";
import type { Customer } from "./data";

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function all(): Customer[] {
  return getData().customers;
}

function indexOfCustomer(idOrName: string): number {
  const k = norm(idOrName);
  if (!k) return -1;
  const list = all();
  const exact = list.findIndex((c) => norm(c.id) === k || norm(c.loyalty_id) === k);
  if (exact !== -1) return exact;
  return list.findIndex((c) => norm(c.name).includes(k));
}

function nextCustomerId(): string {
  const nums = all()
    .map((c) => Number(/^c-(\d+)$/.exec(c.id)?.[1]))
    .filter((n) => Number.isFinite(n));
  return `c-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

export function listCustomers(query?: string): Customer[] {
  const q = query ? norm(query) : null;
  return all()
    .filter((c) => !q || norm(`${c.name} ${c.id} ${c.loyalty_id}`).includes(q))
    .map((c) => ({ ...c }));
}

export function findCustomer(idOrName: string): Customer | undefined {
  const i = indexOfCustomer(idOrName);
  return i === -1 ? undefined : { ...all()[i] };
}

export interface NewCustomer {
  name: string;
  loyalty_id?: string;
  points?: number;
}

export function createCustomer(input: NewCustomer): { customer: Customer; persist: SaveResult } {
  const id = nextCustomerId();
  const customer: Customer = {
    id,
    name: input.name.trim(),
    loyalty_id: (input.loyalty_id ?? "").trim() || `GTA7-${id.replace(/\D/g, "")}`,
    since: new Date().toISOString().slice(0, 10),
    points: Math.max(0, Math.round(input.points ?? 0)),
  };
  all().push(customer);
  return { customer: { ...customer }, persist: save() };
}

export interface CustomerPatch {
  name?: string;
  loyalty_id?: string;
  points?: number;
}

export function updateCustomer(
  idOrName: string,
  patch: CustomerPatch,
): { customer?: Customer; persist?: SaveResult } {
  const i = indexOfCustomer(idOrName);
  if (i === -1) return {};
  const c = all()[i];
  if (patch.name !== undefined && patch.name.trim()) c.name = patch.name.trim();
  if (patch.loyalty_id !== undefined && patch.loyalty_id.trim()) c.loyalty_id = patch.loyalty_id.trim();
  if (patch.points !== undefined) c.points = Math.max(0, Math.round(patch.points));
  return { customer: { ...c }, persist: save() };
}

export function deleteCustomer(idOrName: string): { customer?: Customer; persist?: SaveResult } {
  const i = indexOfCustomer(idOrName);
  if (i === -1) return {};
  const [removed] = all().splice(i, 1);
  return { customer: removed, persist: save() };
}

/** Soma pontos de fidelidade (delta pode ser negativo). NAO persiste sozinho. */
export function addPoints(idOrName: string, delta: number): Customer | undefined {
  const i = indexOfCustomer(idOrName);
  if (i === -1) return undefined;
  all()[i].points = Math.max(0, Math.round(all()[i].points + delta));
  return { ...all()[i] };
}
