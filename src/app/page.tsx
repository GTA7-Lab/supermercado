// Pagina inicial: apenas identifica a entidade e aponta para o MCP.
// Os dados (produtos, estoque, clientes, compras) NAO sao expostos aqui —
// o acesso e exclusivamente pelas MCP tools em /api/mcp.

export default function Page() {
  return (
    <main>
      <h1>Supermercado GTA7 Central</h1>
      <p>Entidade da cidade digital GTA7 Lab.</p>
      <p className="muted">
        Os dados sao acessados somente pelas MCP tools. Conecte um cliente MCP em:
      </p>
      <p>
        <code>/api/mcp</code> <span className="muted">(Streamable HTTP)</span>
      </p>
      <p className="muted">
        Manifesto da entidade (nome e lista de tools, sem dados): <code>/api/manifest</code>
      </p>
    </main>
  );
}
