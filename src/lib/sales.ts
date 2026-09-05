// Registro de compras. Toda compra baixa o estoque dos produtos vendidos.
// Estado em memoria (seed do JSON) — na Vercel nao persiste entre execucoes.
import { purchases as purchaseSeed, type Customer, type Purchase } from "./data";
import { allProducts, findProduct } from "./catalog";
import { addPoints, findCustomer } from "./customers";

const round2 = (n: number) => Math.round(n * 100) / 100;
/** 1 ponto de fidelidade por real gasto. */
const POINTS_PER_BRL = 1;

let sales: Purchase[] = purchaseSeed.map((p) => ({ ...p }));
let orderSeq = 2000;

export interface PurchaseLine {
  product: string;
  quantity: number;
}

export interface PurchaseOptions {
  customer?: string;
  payment_method?: string;
}

export interface SoldItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  new_stock: number;
}

export type PurchaseOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      order: Purchase;
      sold: SoldItem[];
      total: number;
      customer?: Customer;
      points_earned: number;
    };

export function registerPurchase(lines: PurchaseLine[], opts: PurchaseOptions = {}): PurchaseOutcome {
  if (!lines || lines.length === 0) {
    return { ok: false, error: "Diga pelo menos um produto e a quantidade para registrar a compra." };
  }

  // 1) valida tudo antes de mexer no estoque (compra e atomica)
  const resolved: { id: string; name: string; price: number; qty: number }[] = [];
  for (const line of lines) {
    const p = findProduct(line.product);
    if (!p) return { ok: false, error: `Nao encontrei o produto "${line.product}".` };
    const qty = Math.round(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: `Quantidade invalida para ${p.name}.` };
    }
    if (p.stock < qty) {
      return {
        ok: false,
        error: `Estoque insuficiente de ${p.name}: so tem ${p.stock} e a compra pede ${qty}.`,
      };
    }
    resolved.push({ id: p.id, name: p.name, price: p.price, qty });
  }

  // 2) baixa o estoque no catalogo vivo
  const live = allProducts();
  const sold: SoldItem[] = resolved.map((r) => {
    const lp = live.find((x) => x.id === r.id)!;
    lp.stock -= r.qty;
    return { product_id: r.id, name: r.name, qty: r.qty, unit_price: r.price, new_stock: lp.stock };
  });

  const total = round2(sold.reduce((s, i) => s + i.qty * i.unit_price, 0));

  // 3) fidelidade
  let customer: Customer | undefined;
  let pointsEarned = 0;
  if (opts.customer) {
    const found = findCustomer(opts.customer);
    if (found) {
      pointsEarned = Math.floor(total * POINTS_PER_BRL);
      customer = addPoints(found.id, pointsEarned) ?? found;
    }
  }

  // 4) grava o pedido
  orderSeq += 1;
  const order: Purchase = {
    id: `order-${orderSeq}`,
    customer_id: customer?.id ?? "",
    datetime: new Date().toISOString(),
    checkout: 0,
    payment_method: (opts.payment_method ?? "").trim() || "nao informado",
    items: sold.map((i) => ({ product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
    total,
  };
  sales.push(order);

  return { ok: true, order, sold, total, customer, points_earned: pointsEarned };
}

export function listPurchases(): Purchase[] {
  return sales.map((s) => ({ ...s }));
}
