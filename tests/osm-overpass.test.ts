import {
  buildOverpassQuery,
  handler,
  lerRespostaLimitada,
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

Deno.test("Overpass 301/302 redirects fail closed and never follow the public destination", async () => {
  for (const status of [301, 302]) {
    const calls: string[] = [];
    let redirectMode: unknown;
    const fetcher: typeof fetch = (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/v1/user")) return Promise.resolve(Response.json({ id: "00000000-0000-4000-8000-000000000001" }));
      if (url.endsWith("/rpc/osm_recuperar_reservas_abandonadas")) return Promise.resolve(Response.json({ recovered: 0 }));
      if (url.endsWith("/rpc/osm_reservar_pesquisa")) return Promise.resolve(Response.json({ state: "reserved", cached: false }));
      if (url === "https://overpass.example/api/interpreter") {
        redirectMode = init?.redirect;
        return Promise.resolve(new Response(null, { status, headers: { Location: "https://overpass-api.de/api/interpreter" } }));
      }
      if (url.endsWith("/rpc/osm_falhar_pesquisa")) return Promise.resolve(Response.json({ state: "failed" }));
      return Promise.reject(new Error(`unexpected endpoint: ${url}`));
    };
    const response = await handler(new Request("https://edge.example/pesquisar-osm", {
      method: "POST",
      headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ ...filters, idempotencyKey: `00000000-0000-4000-8000-00000000009${status === 301 ? "1" : "2"}` }),
    }), (key) => ({
      SUPABASE_URL: "https://supabase.example", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service",
      OVERPASS_API_URL: "https://overpass.example/api/interpreter", OVERPASS_API_SELF_HOSTED: "true",
    } as Record<string, string>)[key], fetcher);
    if (response.status !== 502 || redirectMode !== "error") throw new Error(`${status} redirect did not fail closed`);
    if (calls.includes("https://overpass-api.de/api/interpreter")) throw new Error("redirect destination was requested");
  }
});

Deno.test("repeated successful empty searches each reserve and persist one upstream call", async () => {
  let sourceCalls = 0;
  let reservations = 0;
  const fetcher: typeof fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) return Promise.resolve(Response.json({ id: "00000000-0000-4000-8000-000000000001" }));
    if (url.endsWith("/rpc/osm_recuperar_reservas_abandonadas")) return Promise.resolve(Response.json({ recovered: 0 }));
    if (url.endsWith("/rpc/osm_reservar_pesquisa")) { reservations++; return Promise.resolve(Response.json({ state: "reserved", cached: false })); }
    if (url === "https://overpass.example/api/interpreter") { sourceCalls++; return Promise.resolve(Response.json({ elements: [] })); }
    if (url.endsWith("/rpc/osm_concluir_pesquisa")) {
      if (!String(init?.body).includes('"p_results":[]')) throw new Error("empty source result not persisted");
      return Promise.resolve(Response.json({ state: "completed", results: [] }));
    }
    return Promise.reject(new Error(`unexpected endpoint: ${url}`));
  };
  const env = (key: string) => ({
    SUPABASE_URL: "https://supabase.example", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service",
    OVERPASS_API_URL: "https://overpass.example/api/interpreter", OVERPASS_API_SELF_HOSTED: "true",
  } as Record<string, string>)[key];
  for (const suffix of ["1", "2"]) {
    const response = await handler(new Request("https://edge.example/pesquisar-osm", {
      method: "POST", headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ ...filters, idempotencyKey: `00000000-0000-4000-8000-00000000009${suffix}` }),
    }), env, fetcher);
    if (response.status !== 200 || (await response.json()).search_status !== "inconclusive") throw new Error("empty search must be successful but inconclusive");
  }
  if (sourceCalls !== 2 || reservations !== 2) throw new Error("distinct empty searches must each consume one call reservation");
});

Deno.test("response-body timeout cancels a stalled stream and oversized bodies fail", async () => {
  let cancelled = false;
  const slowBody = new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode("{")); },
    cancel() { cancelled = true; },
  }));
  const controller = new AbortController();
  const reading = lerRespostaLimitada(slowBody, controller.signal);
  setTimeout(() => controller.abort(), 10);
  let timedOut = false;
  try { await reading; } catch (error) { timedOut = error instanceof Error && error.message === "source_timeout"; }
  if (!timedOut || !cancelled) throw new Error("aborted body read must time out and cancel the stream");

  const oversized = new Response(new Uint8Array(2 * 1024 * 1024 + 1));
  let rejected = false;
  try { await lerRespostaLimitada(oversized, new AbortController().signal); }
  catch (error) { rejected = error instanceof Error && error.message === "invalid_source_response"; }
  if (!rejected) throw new Error("oversized response body must be rejected");
});

Deno.test("handler timeout remains active until slow response body is consumed", async () => {
  let cancelled = false;
  const calls: string[] = [];
  const fetcher: typeof fetch = (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/auth/v1/user")) return Promise.resolve(Response.json({ id: "00000000-0000-4000-8000-000000000001" }));
    if (url.endsWith("/rpc/osm_recuperar_reservas_abandonadas")) return Promise.resolve(Response.json({ recovered: 0 }));
    if (url.endsWith("/rpc/osm_reservar_pesquisa")) return Promise.resolve(Response.json({ state: "reserved", cached: false }));
    if (url === "https://overpass.example/api/interpreter") return Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode("{")); },
      cancel() { cancelled = true; },
    })));
    if (url.endsWith("/rpc/osm_falhar_pesquisa")) return Promise.resolve(Response.json({ state: "failed" }));
    return Promise.reject(new Error(`unexpected endpoint: ${url}`));
  };
  const env = (key: string) => ({
    SUPABASE_URL: "https://supabase.example", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service",
    OVERPASS_API_URL: "https://overpass.example/api/interpreter", OVERPASS_API_SELF_HOSTED: "true",
  } as Record<string, string>)[key];
  const response = await handler(new Request("https://edge.example/pesquisar-osm", {
    method: "POST", headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ ...filters, idempotencyKey: "00000000-0000-4000-8000-000000000096" }),
  }), env, fetcher, 10);
  const body = await response.json();
  if (response.status !== 502 || body.failure_code !== "source_timeout" || !cancelled) {
    throw new Error("handler timeout must include body consumption and record its failure");
  }
  if (!calls.some((url) => url.endsWith("/rpc/osm_falhar_pesquisa"))) throw new Error("body timeout must be recorded against the reservation");
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
    if (url.endsWith("/rpc/osm_recuperar_reservas_abandonadas")) return Promise.resolve(Response.json({ recovered: 0 }));
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

Deno.test("oversized JSON request is rejected before auth, quota, or source calls", async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls++; return Promise.reject(new Error("network must not be used")); };
  const requestBody = `${" ".repeat(5000)}${JSON.stringify({ ...filters, idempotencyKey: "00000000-0000-4000-8000-000000000097" })}`;
  const response = await handler(new Request("https://edge.example/pesquisar-osm", {
    method: "POST", headers: { Authorization: "Bearer synthetic-jwt", "Content-Type": "application/json" }, body: requestBody,
  }), () => undefined, fetcher);
  if (response.status !== 413 || calls !== 0) throw new Error("oversized request must fail before any network or quota operation");
});

