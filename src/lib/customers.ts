// CRUD da base de clientes. Estado em memoria a partir do seed do JSON.
// Na versao publicada (Vercel) o disco e somente leitura, entao as alteracoes
// valem so durante a execucao — nao ficam salvas de forma permanente.
import { customers as seed, type Customer } from "./data";

let list: Customer[] = seed.map((c) => ({ ...c }));
let seq = list.length + 100;

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function indexOfCustomer(idOrName: string): number {
  const k = norm(idOrName);
  if (!k) return -1;
  const exact = list.findIndex((c) => norm(c.id) === k || norm(c.loyalty_id) === k);
  if (exact !== -1) return exact;
  return list.findIndex((c) => norm(c.name).includes(k));
}

export function listCustomers(query?: string): Customer[] {
  const q = query ? norm(query) : null;
  return list
    .filter((c) => !q || norm(`${c.name} ${c.id} ${c.loyalty_id}`).includes(q))
    .map((c) => ({ ...c }));
}

export function findCustomer(idOrName: string): Customer | undefined {
  const i = indexOfCustomer(idOrName);
  return i === -1 ? undefined : { ...list[i] };
}

export interface NewCustomer {
  name: string;
  loyalty_id?: string;
  points?: number;
}

export function createCustomer(input: NewCustomer): Customer {
  seq += 1;
  const customer: Customer = {
    id: `c-${String(seq).padStart(3, "0")}`,
    name: input.name.trim(),
    loyalty_id: (input.loyalty_id ?? "").trim() || `GTA7-${1000 + seq}`,
    since: new Date().toISOString().slice(0, 10),
    points: Math.max(0, Math.round(input.points ?? 0)),
  };
  list.push(customer);
  return { ...customer };
}

export interface CustomerPatch {
  name?: string;
  loyalty_id?: string;
  points?: number;
}

export function updateCustomer(idOrName: string, patch: CustomerPatch): Customer | undefined {
  const i = indexOfCustomer(idOrName);
  if (i === -1) return undefined;
  const c = list[i];
  if (patch.name !== undefined && patch.name.trim()) c.name = patch.name.trim();
  if (patch.loyalty_id !== undefined && patch.loyalty_id.trim()) c.loyalty_id = patch.loyalty_id.trim();
  if (patch.points !== undefined) c.points = Math.max(0, Math.round(patch.points));
  return { ...c };
}

export function deleteCustomer(idOrName: string): Customer | undefined {
  const i = indexOfCustomer(idOrName);
  if (i === -1) return undefined;
  const [removed] = list.splice(i, 1);
  return removed;
}
