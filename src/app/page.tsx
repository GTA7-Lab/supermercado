import { searchProducts, listDepartments } from "@/lib/queries";
import { store } from "@/lib/repository";

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const query = one(sp.query);
  const department = one(sp.department);
  const maxPrice = one(sp.max_price);
  const inStockOnly = one(sp.in_stock_only) === "true";

  const result = searchProducts({
    query: query || undefined,
    department: department || undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
    in_stock_only: inStockOnly,
  });

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <main>
      <h1>{store.name}</h1>
      <p className="muted">
        {store.address} &middot; {store.hours}
      </p>
      <p className="muted">
        {store.facilities.checkouts} caixas &middot; {store.facilities.self_checkouts} self-checkouts &middot;{" "}
        {store.facilities.shopping_carts} carrinhos &middot; {store.facilities.parking_spaces} vagas
      </p>

      <form method="get">
        <input type="text" name="query" placeholder="Buscar produto, marca..." defaultValue={query} />
        <select name="department" defaultValue={department}>
          <option value="">Todos os departamentos</option>
          {listDepartments().map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input type="number" name="max_price" placeholder="Preço máx." step="0.01" min="0" defaultValue={maxPrice} />
        <label>
          <input type="checkbox" name="in_stock_only" value="true" defaultChecked={inStockOnly} />
          Só com estoque
        </label>
        <button type="submit">Filtrar</button>
      </form>

      <p className="muted">{result.count} produto(s)</p>

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Departamento</th>
            <th>Corredor</th>
            <th className="num">Preço</th>
            <th className="num">Estoque</th>
          </tr>
        </thead>
        <tbody>
          {result.products.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name}
                <br />
                <span className="muted">
                  {p.brand} &middot; <code>{p.id}</code>
                </span>
              </td>
              <td>
                <span className="tag">{p.department}</span>
              </td>
              <td>{p.aisle}</td>
              <td className="num">
                {brl(p.price)}
                <br />
                <span className="muted">/{p.unit}</span>
              </td>
              <td className="num">{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        APIs: <code>/api/products</code> &middot; <code>/api/manifest</code> &middot; MCP: <code>/api/mcp</code>
      </footer>
    </main>
  );
}
