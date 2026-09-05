// Tipos da entidade + seed embutido no bundle (fallback de leitura).
// O acesso mutavel aos dados e feito por src/lib/repository.ts.
import raw from "../../data/supermarket.json";

export interface Product {
  id: string;
  name: string;
  category: string;
  department: string;
  brand: string;
  price: number;
  unit: string;
  barcode: string;
  stock: number;
  aisle: string;
  perishable: boolean;
}

export interface Customer {
  id: string;
  name: string;
  loyalty_id: string;
  since: string;
  points: number;
}

export interface PurchaseItem {
  product_id: string;
  qty: number;
  unit_price: number;
}

export interface Purchase {
  id: string;
  customer_id: string;
  datetime: string;
  checkout: number;
  payment_method: string;
  items: PurchaseItem[];
  total: number;
}

export interface ServiceSpace {
  id: string;
  status: "disponivel" | "ocupado";
  tenant: string | null;
  type: string | null;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  address: string;
  hours: string;
  facilities: {
    parking_spaces: number;
    restrooms: boolean;
    shopping_carts: number;
    checkouts: number;
    self_checkouts: number;
    departments: string[];
  };
  service_spaces: ServiceSpace[];
}

export interface SupermarketData {
  store: Store;
  products: Product[];
  customers: Customer[];
  purchases: Purchase[];
}

/** Seed embutido no bundle. Nao mutar — use repository.getData(). */
export const SEED: SupermarketData = raw as SupermarketData;
