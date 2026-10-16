// Cliente mínimo da API pública de consultas do PNCP (Portal Nacional de
// Contratações Públicas, Lei 14.133/2021). Não exige cadastro nem chave.
//
// Referência: "Manual das APIs de Consultas PNCP", versão 1.0 (gov.br/pncp).
// Endpoint usado: GET /api/consulta/v1/contratacoes/proposta
//   obrigatórios: dataFinal (AAAAMMDD), codigoModalidadeContratacao, pagina
//   opcionais:    uf, codigoMunicipioIbge, cnpj, tamanhoPagina
// Relatos de desenvolvedores (2026) dizem que a API às vezes ignora filtros
// sem avisar — por isso TODO filtro importante é refeito aqui no código
// (ver filtro.mjs), e o filtro da API serve só para reduzir o volume.

export const BASE_URL = "https://pncp.gov.br";

export const MODALIDADES = {
  1: "Leilão - Eletrônico",
  2: "Diálogo Competitivo",
  3: "Concurso",
  4: "Concorrência - Eletrônica",
  5: "Concorrência - Presencial",
  6: "Pregão - Eletrônico",
  7: "Pregão - Presencial",
  8: "Dispensa de Licitação",
  9: "Inexigibilidade",
  10: "Manifestação de Interesse",
  11: "Pré-qualificação",
  12: "Credenciamento",
  13: "Leilão - Presencial",
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Data local no formato AAAAMMDD que a API espera. */
export function yyyymmdd(data) {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}${m}${d}`;
}

/**
 * GET com tentativas: repete em erro de rede, 429 e 5xx (espera 2s, 4s, 8s...).
 * Devolve null em 204 (a API responde "sem conteúdo" quando não há registros).
 */
export async function getJson(url, { fetchImpl = fetch, tentativas = 4, esperaBaseMs = 2000 } = {}) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (resp.status === 204) return null;
      if (resp.ok) {
        const texto = await resp.text();
        return texto.trim() === "" ? null : JSON.parse(texto);
      }
      if (resp.status === 429 || resp.status >= 500) {
        ultimoErro = new Error(`PNCP respondeu ${resp.status} em ${url}`);
      } else {
        // 4xx (exceto 429) não melhora tentando de novo: parâmetro errado.
        const corpo = await resp.text().catch(() => "");
        throw new ErroDefinitivo(`PNCP respondeu ${resp.status} em ${url}: ${corpo.slice(0, 300)}`);
      }
    } catch (erro) {
      if (erro instanceof ErroDefinitivo) throw erro;
      ultimoErro = erro;
    }
    if (i < tentativas - 1) await esperar(esperaBaseMs * 2 ** i);
  }
  throw ultimoErro;
}

class ErroDefinitivo extends Error {}

/**
 * Todas as contratações com recebimento de propostas aberto até `dataFinal`,
 * para uma modalidade (e opcionalmente uma UF / município). Percorre as páginas.
 */
export async function buscarPropostasAbertas({
  dataFinal,
  modalidade,
  uf,
  codigoMunicipioIbge,
  tamanhoPagina = 50,
  maxPaginas = 40,
  pausaMs = 400,
  fetchImpl = fetch,
  esperaBaseMs,
}) {
  const resultados = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const params = new URLSearchParams({
      dataFinal,
      codigoModalidadeContratacao: String(modalidade),
      pagina: String(pagina),
      tamanhoPagina: String(tamanhoPagina),
    });
    if (uf) params.set("uf", uf);
    if (codigoMunicipioIbge) params.set("codigoMunicipioIbge", String(codigoMunicipioIbge));
    const url = `${BASE_URL}/api/consulta/v1/contratacoes/proposta?${params}`;
    const json = await getJson(url, { fetchImpl, esperaBaseMs });
    if (!json || !Array.isArray(json.data) || json.data.length === 0) break;
    resultados.push(...json.data);
    totalPaginas = Number(json.totalPaginas) || pagina;
    pagina++;
    if (pagina <= totalPaginas && pausaMs) await esperar(pausaMs);
  } while (pagina <= totalPaginas && pagina <= maxPaginas);
  return resultados;
}

/** Identificadores (cnpj do órgão, ano, sequencial) de uma contratação. */
export function chaveContratacao(c) {
  const m = /^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(c.numeroControlePNCP ?? "");
  if (m) return { cnpj: m[1], sequencial: Number(m[2]), ano: Number(m[3]) };
  const cnpj = c.orgaoEntidade?.cnpj;
  if (cnpj && c.anoCompra && c.sequencialCompra) {
    return { cnpj, ano: Number(c.anoCompra), sequencial: Number(c.sequencialCompra) };
  }
  return null;
}

/** Página pública do edital no PNCP: /app/editais/{cnpj}/{ano}/{sequencial}. */
export function linkPncp(c) {
  const k = chaveContratacao(c);
  return k ? `${BASE_URL}/app/editais/${k.cnpj}/${k.ano}/${k.sequencial}` : null;
}

/** Itens de uma contratação (é onde fica o benefício ME/EPP de cada item). */
export async function buscarItens(c, { fetchImpl = fetch, esperaBaseMs } = {}) {
  const k = chaveContratacao(c);
  if (!k) return [];
  const url = `${BASE_URL}/api/pncp/v1/orgaos/${k.cnpj}/compras/${k.ano}/${k.sequencial}/itens?pagina=1&tamanhoPagina=500`;
  const json = await getJson(url, { fetchImpl, esperaBaseMs });
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
}
