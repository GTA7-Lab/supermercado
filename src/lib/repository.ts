// Repositorio unico da entidade: os dados vivem em data/supermarket.json.
// Leitura: pega o arquivo do disco; se nao der, usa o seed embutido no bundle.
// Escrita: grava de volta no data/supermarket.json.
//   - Local (npm run dev/start): funciona, as alteracoes ficam salvas no arquivo.
//   - Vercel: o disco e somente leitura, entao save() falha de forma controlada
//     e a alteracao vale so enquanto a instancia estiver quente.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED, type SupermarketData } from "./data";

const FILE = join(process.cwd(), "data", "supermarket.json");

let data: SupermarketData | null = null;

function load(): SupermarketData {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as SupermarketData;
    if (parsed && Array.isArray(parsed.products) && parsed.store) return parsed;
  } catch {
    /* arquivo indisponivel (ex.: bundle da Vercel) — cai no seed */
  }
  return JSON.parse(JSON.stringify(SEED)) as SupermarketData;
}

/** Instancia unica e mutavel dos dados. Todos os modulos leem/escrevem aqui. */
export function getData(): SupermarketData {
  if (!data) data = load();
  return data;
}

export interface SaveResult {
  saved: boolean;
  reason?: string;
}

/** Persiste o estado atual em data/supermarket.json. */
export function save(): SaveResult {
  try {
    writeFileSync(FILE, JSON.stringify(getData(), null, 2) + "\n", "utf8");
    return { saved: true };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    const reason =
      code === "EROFS" || code === "EACCES" || code === "EPERM"
        ? "ambiente somente leitura"
        : String((e as Error)?.message ?? e);
    return { saved: false, reason };
  }
}

/** Frase amigavel para o fim das respostas de escrita. */
export function savedNote(r: SaveResult): string {
  return r.saved
    ? "Salvo no arquivo de dados da loja."
    : `Nao consegui salvar no arquivo (${r.reason}); a mudanca vale so nesta sessao.`;
}

/** Dados fixos da loja (nome, endereco, estrutura). service_spaces e mutavel. */
export const store = getData().store;
