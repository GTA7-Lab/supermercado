// Repositorio unico da entidade: os dados vivem em data/supermarket.json.
//
// Leitura: pega o arquivo do disco; se nao der, usa o seed embutido no bundle.
// Escrita (save):
//   1. tenta gravar no data/supermarket.json local (funciona em dev / npm start);
//   2. se o disco for somente leitura (Vercel) e houver GITHUB_TOKEN, faz um commit
//      do arquivo atualizado no repositorio via API do GitHub — o proprio deploy
//      da Vercel republica o site com os dados novos em ~1 min;
//   3. sem token, a alteracao vale so enquanto a instancia estiver quente.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED, type SupermarketData } from "./data";

const FILE = join(process.cwd(), "data", "supermarket.json");

const GH_TOKEN = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "").trim();
const GH_REPO = (process.env.GITHUB_REPO ?? "GTA7-Lab/supermercado").trim();
const GH_BRANCH = (process.env.GITHUB_BRANCH ?? "main").trim();
const GH_PATH = (process.env.GITHUB_DATA_PATH ?? "data/supermarket.json").trim();

let data: SupermarketData | null = null;
/** sha do blob atual no GitHub, para o proximo commit. */
let knownSha: string | undefined;

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

function serialize(): string {
  return JSON.stringify(getData(), null, 2) + "\n";
}

export interface SaveResult {
  saved: boolean;
  target?: "arquivo" | "github";
  reason?: string;
  commitUrl?: string;
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "gta7-lab-supermercado",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchSha(): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`,
    { headers: ghHeaders() },
  );
  if (!res.ok) return undefined;
  return ((await res.json()) as { sha?: string }).sha;
}

async function commitToGitHub(content: string): Promise<SaveResult> {
  if (!GH_TOKEN) {
    return { saved: false, reason: "ambiente somente leitura e sem GITHUB_TOKEN" };
  }
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}`;
  const put = (sha?: string) =>
    fetch(url, {
      method: "PUT",
      headers: ghHeaders(),
      body: JSON.stringify({
        message: "Atualiza dados da loja (via MCP)",
        content: Buffer.from(content, "utf8").toString("base64"),
        branch: GH_BRANCH,
        sha,
      }),
    });

  try {
    if (!knownSha) knownSha = await fetchSha();
    let res = await put(knownSha);
    if (res.status === 409 || res.status === 422) {
      knownSha = await fetchSha();
      res = await put(knownSha);
    }
    if (!res.ok) {
      return { saved: false, reason: `GitHub respondeu ${res.status}` };
    }
    const body = (await res.json()) as {
      content?: { sha?: string };
      commit?: { html_url?: string };
    };
    knownSha = body.content?.sha;
    return { saved: true, target: "github", commitUrl: body.commit?.html_url };
  } catch (e) {
    return { saved: false, reason: String((e as Error)?.message ?? e) };
  }
}

/** Forca o caminho de commit no GitHub mesmo com disco gravavel (teste/prod controlada). */
const FORCE_GITHUB = process.env.FORCE_GITHUB_PERSIST === "1";

/** Persiste o estado atual. Ver estrategia no topo do arquivo. */
export async function save(): Promise<SaveResult> {
  if (!FORCE_GITHUB) {
    try {
      writeFileSync(FILE, serialize(), "utf8");
      return { saved: true, target: "arquivo" };
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      const readOnly = code === "EROFS" || code === "EACCES" || code === "EPERM";
      if (!readOnly) return { saved: false, reason: String((e as Error)?.message ?? e) };
    }
  }
  return commitToGitHub(serialize());
}

/** Frase amigavel para o fim das respostas de escrita. */
export function savedNote(r: SaveResult): string {
  if (r.saved && r.target === "github") {
    return "Salvo no repositorio da loja — o site publicado atualiza em cerca de 1 minuto.";
  }
  if (r.saved) return "Salvo no arquivo de dados da loja.";
  return `Nao consegui salvar (${r.reason ?? "motivo desconhecido"}); a mudanca vale so nesta sessao.`;
}

/** Dados fixos da loja (nome, endereco, estrutura). service_spaces e mutavel. */
export const store = getData().store;
