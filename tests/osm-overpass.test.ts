import {
  buildOverpassQuery,
  handler,
  mapOverpassElements,
  validarEndpointOverpass,
} from "../supabase/functions/pesquisar-osm/index.ts";
import { fixture } from "./fixtures/osm-overpass-synthetic.ts";

const filters = { city: "São Paulo", uf: "SP", segment: "veterinaria" };

Deno.test("Overpass query uses fixed segment tags and hard response bounds", () => {
  const query = buildOverpassQuery(filters);
  if (!query.includes("[timeout:20]") || !query.includes("[maxsize:4194304]")) throw new Error("query limits are missing");
  if (!query.includes("out center tags 10") || !query.includes('"amenity"="veterinary"')) throw new Error("query result cap or fixed segment is missing");
  if (query.includes("phone") || query.includes("contact:")) throw new Error("query requests personal/contact tags");
  let rejected = false;
  try { buildOverpassQuery({ ...filters, segment: "veterinaria];out;" }); } catch { rejected = true; }
  if (!rejected) throw new Error("unknown segment must not enter Overpass QL");
});

Deno.test("only explicit self-hosted HTTPS Overpass endpoints are accepted", () => {
  if (validarEndpointOverpass(undefined, "true") !== null) throw new Error("missing endpoint should disable connector");
  if (validarEndpointOverpass("https://overpass-api.de/api/interpreter", "true") !== null) throw new Error("public backend endpoint must be blocked");
  if (validarEndpointOverpass("http://overpass.example/api/interpreter", "true") !== null) throw new Error("HTTP endpoint must be blocked");
  if (validarEndpointOverpass("https://overpass.example/api/interpreter", "false") !== null) throw new Error("unapproved endpoint must be blocked");
  if (!validarEndpointOverpass("https://overpass.example/api/interpreter", "true")) throw new Error("approved self-hosted endpoint should be accepted");
});

Deno.test("OSM fixtures preserve provenance and never infer website absence", () => {
  const observedAt = "2026-11-15T12:00:00.000Z";
  const results = mapOverpassElements(fixture, filters, observedAt);
  if (results.length !== 3) throw new Error(`expected duplicate OSM elements to be removed, got ${results.length}`);
  if (results[0].website_evidence.status !== "found_in_osm" || results[0].website !== "https://clinic-a.example/") throw new Error("positive website evidence was lost");
  if (results[1].website_evidence.status !== "not_located_in_sources_consulted") throw new Error("missing OSM website tag must be labeled as not located, not absent");
  if (results[2].website_evidence.status !== "inconclusive" || results[2].website !== null) throw new Error("invalid website tag must be inconclusive");
  for (const result of results) {
    if (result.source !== "OpenStreetMap" || result.license !== "ODbL-1.0" || !result.attribution.includes("OpenStreetMap contributors")) throw new Error("source license/attribution missing");
    if (result.observed_at !== observedAt || !result.source_url.includes(result.source_element_id)) throw new Error("source timestamp or element link missing");
    if ("phone" in result || "email" in result || "contact:email" in result) throw new Error("personal/contact data must be excluded");
  }
});

Deno.test("source HTTP errors are recorded and do not call a real Overpass or Google endpoint", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  const fetcher: typeof fetch = (input, init) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.endsWith("/auth/v1/user")) return Promise.resolve(Response.json({ id: "00000000-0000-4000-8000-000000000001" }));
    if (url.endsWith("/rpc/osm_reservar_pesquisa")) return Promise.resolve(Response.json({ state: "reserved", cached: false }));
    if (url === "https://overpass.example/api/interpreter") return Promise.resolve(new Response("unavailable", { status: 503 }));
    if (url.endsWith("/rpc/osm_falhar_pesquisa")) return Promise.resolve(Response.json({ state: "failed", cached: false }));
    return Promise.reject(new Error(`unexpected endpoint: ${url}`));
  };
  const env = (key: string) => ({
    SUPABASE_URL: "https://supabase.example",
    SUPABASE_ANON_KEY: "synthetic-anon",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
    OVERPASS_API_URL: "https://overpass.example/api/interpreter",
    OVERPASS_API_SELF_HOSTED: "true",
  } as Record<string, string>)[key];
  const response = await handler(new Request("https://edge.example/pesquisar-osm", {
    method: "POST",
    headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ ...filters, idempotencyKey: "00000000-0000-4000-8000-000000000099" }),
  }), env, fetcher);
  if (response.status !== 502) throw new Error(`expected source failure 502, got ${response.status}`);
  const failure = await response.json();
  if (failure.failure_code !== "source_unavailable" || !String(failure.error).includes("no website conclusion")) throw new Error("source error was not reported safely");
  const failureRpc = calls.find((call) => call.url.endsWith("/rpc/osm_falhar_pesquisa"));
  if (!failureRpc?.body?.includes('"p_failure_code":"source_unavailable"')) throw new Error("source failure was not recorded");
  if (calls.some((call) => call.url.includes("googleapis.com") || call.url.includes("overpass-api.de"))) throw new Error("paid Google or public Overpass endpoint was called");
});

Deno.test("missing endpoint configuration fails before authentication or quota reservation", async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls++; return Promise.reject(new Error("network must not be used")); };
  const response = await handler(new Request("https://edge.example/pesquisar-osm", {
    method: "POST",
    headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ ...filters, idempotencyKey: "00000000-0000-4000-8000-000000000098" }),
  }), (key) => ({
    SUPABASE_URL: "https://supabase.example",
    SUPABASE_ANON_KEY: "synthetic-anon",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
  } as Record<string, string>)[key], fetcher);
  if (response.status !== 503 || calls !== 0) throw new Error("missing source config must fail closed before any request");
});
