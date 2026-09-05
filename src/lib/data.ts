// Carrega os dados da entidade a partir do arquivo JSON local.
// Primeira versao: sem banco de dados.
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

export const data: SupermarketData = raw as SupermarketData;

export const store = data.store;
export const products = data.products;
export const customers = data.customers;
export const purchases = data.purchases;
