// API REST simples de consulta de produtos.
// GET /api/products?query=arroz&department=mercearia&max_price=30&in_stock_only=true
import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries";

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const maxPrice = sp.get("max_price");

  const result = searchProducts({
    query: sp.get("query") ?? undefined,
    department: sp.get("department") ?? undefined,
    max_price: maxPrice !== null ? Number(maxPrice) : undefined,
    in_stock_only: sp.get("in_stock_only") === "true",
  });

  return NextResponse.json(result);
}
