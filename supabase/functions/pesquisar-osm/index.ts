const FONTE = "OpenStreetMap";
const LICENCA = "ODbL-1.0";
const ATRIBUICAO = "© OpenStreetMap contributors";
const URL_DIREITOS = "https://www.openstreetmap.org/copyright";
const MAX_RESULTADOS_CONSULTA = 10;
const MAX_BYTES_RESPOSTA = 2 * 1024 * 1024;
const MAX_BYTES_REQUEST = 4096;
const TIMEOUT_MS = 20_000;
const SEGMENTOS: Record<string, { chave: string; valor: string }> = {
  veterinaria: { chave: "amenity", valor: "veterinary" },
  restaurante: { chave: "amenity", valor: "restaurant" },
  farmacia: { chave: "amenity", valor: "pharmacy" },
  barbearia: { chave: "shop", valor: "hairdresser" },
  padaria: { chave: "shop", valor: "bakery" },
  hotel: { chave: "tourism", valor: "hotel" },
  oficina: { chave: "shop", valor: "car_repair" },
};
const HOSTS_PUBLICOS_BLOQUEADOS = [
  "overpass-api.de",
  "overpass.kumi.systems",
  "overpass.osm.ch",
  "overpass.openstreetmap.ru",
];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type Filtros = { city: string; uf: string; segment: string };
type ElementoOsm = { type?: unknown; id?: unknown; tags?: unknown };
type Candidato = {
  source: string;
  source_element_id: string;
  source_url: string;
  name: string;
  category: string;
  city: string;
  uf: string;
  website: string | null;
  website_evidence: { status: "found_in_osm" | "not_located_in_sources_consulted" | "inconclusive"; detail: string };
  observed_at: string;
  license: string;
  attribution: string;
  attribution_url: string;
};

class SourceError extends Error {
  constructor(readonly code: "source_unavailable" | "source_timeout" | "invalid_source_response") {
    super(code);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    if (codePoint <= 31 || codePoint === 127) return true;
  }
  return false;
}

function validarFiltros(value: unknown): Filtros | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["city", "uf", "segment"].includes(key))) return null;
  if (typeof data.city !== "string" || typeof data.uf !== "string" || typeof data.segment !== "string") return null;
  const city = data.city.trim();
  const uf = data.uf.trim().toUpperCase();
  const segment = data.segment.trim().toLowerCase();
  if (city.length < 2 || city.length > 100 || hasControlCharacters(city)) return null;
  if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(uf)) return null;
  if (!Object.hasOwn(SEGMENTOS, segment)) return null;
  return { city, uf, segment };
}

function escapeOverpass(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildOverpassQuery(filters: Filtros): string {
  const tag = SEGMENTOS[filters.segment];
  if (!tag) throw new Error("unsupported segment");
  const city = escapeOverpass(filters.city);
  const state = `BR-${filters.uf}`;
  return `[out:json][timeout:20][maxsize:4194304];\n` +
    `rel["boundary"="administrative"]["admin_level"="8"]["name"="${city}"]["ISO3166-2"="${state}"]->.city;\n` +
    `map_to_area.city->.searchArea;\n` +
    `(node["${tag.chave}"="${tag.valor}"](area.searchArea);way["${tag.chave}"="${tag.valor}"](area.searchArea);relation["${tag.chave}"="${tag.valor}"](area.searchArea););\n` +
    `out center tags ${MAX_RESULTADOS_CONSULTA};`;
}

export function validarEndpointOverpass(raw: string | undefined, selfHosted: string | undefined): URL | null {
  if (selfHosted !== "true" || !raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/api/interpreter") return null;
    if (HOSTS_PUBLICOS_BLOQUEADOS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return null;
    return url;
  } catch {
    return null;
  }
}

async function lerStreamLimitado(stream: ReadableStream<Uint8Array> | null, declaredLength: string | null, maxBytes: number, signal?: AbortSignal): Promise<string> {
  const declared = declaredLength === null ? 0 : Number(declaredLength);
  if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes || !stream) throw new SourceError("invalid_source_response");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let aborted = signal?.aborted ?? false;
  const cancelOnAbort = () => {
    aborted = true;
    void reader.cancel().catch(() => undefined);
  };
  if (aborted) cancelOnAbort();
  else signal?.addEventListener("abort", cancelOnAbort, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (aborted || signal?.aborted) throw new SourceError("source_timeout");
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SourceError("invalid_source_response");
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function lerRespostaLimitada(response: Response, signal: AbortSignal): Promise<string> {
  return await lerStreamLimitado(response.body, response.headers.get("content-length"), MAX_BYTES_RESPOSTA, signal);
}

async function lerRequestLimitado(request: Request): Promise<unknown> {
  const text = await lerStreamLimitado(request.body, request.headers.get("content-length"), MAX_BYTES_REQUEST);
  try { return JSON.parse(text); } catch { throw new Error("invalid JSON"); }
}

function websiteUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function mapOverpassElements(value: unknown, filters: Filtros, observedAt: string): Candidato[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { elements?: unknown }).elements)) {
    throw new SourceError("invalid_source_response");
  }
  const elements = (value as { elements: ElementoOsm[] }).elements;
  if (elements.length > MAX_RESULTADOS_CONSULTA) throw new SourceError("invalid_source_response");
  const seen = new Set<string>();
  const mapped: Candidato[] = [];
  for (const element of elements) {
    if (!element || !["node", "way", "relation"].includes(String(element.type)) || !Number.isSafeInteger(element.id) || Number(element.id) <= 0) {
      throw new SourceError("invalid_source_response");
    }
    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = element.tags;
    if (!tags || typeof tags !== "object" || Array.isArray(tags)) throw new SourceError("invalid_source_response");
    const values = tags as Record<string, unknown>;
    if (typeof values.name !== "string" || !values.name.trim()) continue;
    const websiteTag = values.website;
    const website = websiteUrl(websiteTag);
    const hasWebsiteTag = typeof websiteTag === "string" && websiteTag.trim().length > 0;
    const evidenceStatus = website ? "found_in_osm" : hasWebsiteTag ? "inconclusive" : "not_located_in_sources_consulted";
    mapped.push({
      source: FONTE,
      source_element_id: id,
      source_url: `https://www.openstreetmap.org/${id}`,
      name: values.name.trim().slice(0, 200),
      category: String(values.amenity || values.shop || values.tourism || "").slice(0, 80),
      city: filters.city,
      uf: filters.uf,
      website,
      website_evidence: {
        status: evidenceStatus,
        detail: website ? "URL registrada na tag website do OSM." : hasWebsiteTag
          ? "Tag website presente, mas não validável como URL HTTP(S)."
          : "Website não localizado nas fontes consultadas; isso não comprova ausência de site.",
      },
      observed_at: observedAt,
      license: LICENCA,
      attribution: ATRIBUICAO,
      attribution_url: URL_DIREITOS,
    });
    if (mapped.length === MAX_RESULTADOS_CONSULTA) break;
  }
  return mapped;
}

async function rpc(
  fetcher: typeof fetch,
  base: string,
  serviceKey: string,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetcher(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error(`quota rpc failed (${response.status})`);
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid quota response");
  return data as Record<string, unknown>;
}

function sourceFailureCode(error: unknown): SourceError["code"] {
  if (error instanceof SourceError) return error.code;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return "source_timeout";
  return "source_unavailable";
}

export async function handler(
  request: Request,
  env: (key: string) => string | undefined,
  fetcher: typeof fetch = fetch,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const authorization = request.headers.get("Authorization") || "";
  const bearer = /^Bearer\s+\S+$/i.test(authorization) ? authorization : "";
  if (!bearer) return json({ error: "authentication required" }, 401);

  let body: unknown;
  try { body = await lerRequestLimitado(request); }
  catch (error) {
    if (error instanceof SourceError) return json({ error: "request body exceeds the 4096-byte limit or is invalid" }, 413);
    return json({ error: "invalid JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "invalid request" }, 400);
  const data = body as Record<string, unknown>;
  const filters = validarFiltros({ city: data.city, uf: data.uf, segment: data.segment });
  const requestKey = typeof data.idempotencyKey === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.idempotencyKey)
    ? data.idempotencyKey
    : null;
  if (!filters || !requestKey || Object.keys(data).some((key) => !["city", "uf", "segment", "idempotencyKey"].includes(key))) {
    return json({ error: "invalid search filters or idempotency key" }, 400);
  }

  const endpoint = validarEndpointOverpass(env("OVERPASS_API_URL"), env("OVERPASS_API_SELF_HOSTED"));
  const base = env("SUPABASE_URL") || "";
  const anonKey = env("SUPABASE_ANON_KEY") || "";
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!endpoint || !base || !anonKey || !serviceKey) return json({ error: "OSM connector is not configured for an approved self-hosted endpoint" }, 503);

  const userResponse = await fetcher(`${base}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: bearer } });
  if (!userResponse.ok) return json({ error: "authentication required" }, 401);
  let userId: string;
  try {
    const user = await userResponse.json();
    userId = typeof user?.id === "string" && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : "";
  } catch { userId = ""; }
  if (!userId) return json({ error: "authentication required" }, 401);

  try {
    await rpc(fetcher, base, serviceKey, "osm_recuperar_reservas_abandonadas", { p_limit: 100 });
  } catch {
    return json({ error: "reservation recovery unavailable; source not queried" }, 503);
  }

  let reservation: Record<string, unknown>;
  try {
    reservation = await rpc(fetcher, base, serviceKey, "osm_reservar_pesquisa", {
      p_user_id: userId,
      p_request_key: requestKey,
      p_city: filters.city,
      p_uf: filters.uf,
      p_segment: filters.segment,
    });
  } catch {
    return json({ error: "quota unavailable; source not queried" }, 503);
  }
  if (reservation.state === "completed") return json({ ...reservation, attribution: ATRIBUICAO, attribution_url: URL_DIREITOS });
  if (reservation.state === "failed") return json({ error: "source failure recorded", failure_code: reservation.failure_code }, 502);
  if (reservation.cached === true || reservation.state !== "reserved") return json({ state: "in_progress", retry_with_same_key: true }, 202);

  let candidates: Candidato[];
  const observedAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const sourceResponse = await fetcher(endpoint, {
        method: "POST",
        redirect: "error",
        credentials: "omit",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "LeadFinder-OSM-connector/1.0",
        },
        body: new URLSearchParams({ data: buildOverpassQuery(filters) }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) throw new SourceError("source_timeout");
      if (sourceResponse.redirected || (sourceResponse.status >= 300 && sourceResponse.status < 400)) {
        throw new SourceError("source_unavailable");
      }
    if (!sourceResponse.ok) throw new SourceError("source_unavailable");
      const sourceText = await lerRespostaLimitada(sourceResponse, controller.signal);
    let sourceData: unknown;
    try { sourceData = JSON.parse(sourceText); } catch { throw new SourceError("invalid_source_response"); }
    candidates = mapOverpassElements(sourceData, filters, observedAt);
    } finally { clearTimeout(timeout); }
  } catch (error) {
    const failureCode = sourceFailureCode(error);
    try {
      await rpc(fetcher, base, serviceKey, "osm_falhar_pesquisa", {
        p_user_id: userId, p_request_key: requestKey, p_failure_code: failureCode,
      });
    } catch { return json({ error: "source failed; quota reservation retained safely" }, 503); }
    return json({ error: "Overpass source unavailable; no website conclusion was made", failure_code: failureCode }, 502);
  }

  let completed: Record<string, unknown>;
  try {
    completed = await rpc(fetcher, base, serviceKey, "osm_concluir_pesquisa", {
      p_user_id: userId, p_request_key: requestKey, p_results: candidates, p_observed_at: observedAt,
    });
  } catch {
    return json({ error: "results not persisted; quota reservation retained safely" }, 503);
  }
  return json({
    ...completed,
    search_status: candidates.length ? "results_found" : "inconclusive",
    source: FONTE,
    license: LICENCA,
    attribution: ATRIBUICAO,
    attribution_url: URL_DIREITOS,
    daily_limit: 50,
    query_limit: MAX_RESULTADOS_CONSULTA,
  });
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D?.serve && import.meta.main) D.serve((request: Request) => handler(request, (key) => D.env.get(key)));

