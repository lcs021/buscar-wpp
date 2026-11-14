import { finalizarComRetry } from "../supabase/functions/orquestrador/index.ts";

const ctx = { url: "https://supabase.example", apikey: "test", auth: "Bearer test" };
const body = {
  p_job_id: "00000000-0000-4000-8000-000000000099",
  p_sucesso: false,
  p_resultado: {},
  p_erro: "Places indisponível",
};

Deno.test("finalization retries transient server errors and records the same failure", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const delays: number[] = [];
  globalThis.fetch = (_input, init) => {
    calls++;
    const sent = JSON.parse(String(init?.body));
    if (JSON.stringify(sent) !== JSON.stringify(body)) throw new Error("finalization payload changed");
    return Promise.resolve(new Response(null, { status: calls === 1 ? 503 : 200 }));
  };
  try {
    await finalizarComRetry("https://supabase.example", ctx, body, (ms) => {
      delays.push(ms);
      return Promise.resolve();
    });
    if (calls !== 2) throw new Error(`expected 2 requests, got ${calls}`);
    if (delays.join(",") !== "100") throw new Error(`unexpected retry delays: ${delays}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("finalization stops after three transient failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return Promise.resolve(new Response(null, { status: 503 }));
  };
  try {
    let failure: unknown;
    try {
      await finalizarComRetry("https://supabase.example", ctx, body, () => Promise.resolve());
    } catch (error) {
      failure = error;
    }
    if (!(failure instanceof Error) || !failure.message.includes("503")) {
      throw new Error("expected the final Supabase error to reach the worker");
    }
    if (calls !== 3) throw new Error(`expected 3 requests, got ${calls}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("finalization does not retry permanent client errors", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return Promise.resolve(new Response(null, { status: 400 }));
  };
  try {
    try {
      await finalizarComRetry("https://supabase.example", ctx, body, () => Promise.resolve());
    } catch {
      // The database rejection is surfaced to the caller for lease recovery.
    }
    if (calls !== 1) throw new Error(`expected one request, got ${calls}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
