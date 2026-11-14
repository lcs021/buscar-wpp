import {
  executarBuscaAgendada,
  type Ctx,
} from "../buscar-empresas/index.ts";

type Job = {
  id: string;
  user_id: string;
  payload: unknown;
};

async function segredoIgual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diferenca = 0;
  for (let i = 0; i < bytesA.length; i++) diferenca |= bytesA[i] ^ bytesB[i];
  return diferenca === 0;
}

async function rest(base: string, ctx: Ctx, path: string, body: unknown) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: ctx.apikey,
      Authorization: ctx.auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function handler(
  request: Request,
  env: (key: string) => string | undefined,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  const cronSecret = env("ORQUESTRADOR_CRON_SECRET") || "";
  const authorization = request.headers.get("Authorization") || "";
  if (cronSecret.length < 32 || !await segredoIgual(authorization, `Bearer ${cronSecret}`)) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = env("SUPABASE_URL") || "";
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY") || "";
  const placesKey = env("GOOGLE_PLACES_API_KEY") || "";
  if (!url || !serviceRoleKey || !placesKey) return json({ error: "server configuration incomplete" }, 500);

  const ctx: Ctx = { url, apikey: serviceRoleKey, auth: `Bearer ${serviceRoleKey}` };
  try {
    const jobs: Job[] = await rest(url, ctx, "rpc/claim_operacao_jobs", { p_limit: 10 }) || [];
    const results = await Promise.all(jobs.map(async (job) => {
      try {
        const result = await executarBuscaAgendada(ctx, placesKey, job.user_id, job.payload);
        await rest(url, ctx, "rpc/finalizar_operacao_job", {
          p_job_id: job.id,
          p_sucesso: true,
          p_resultado: { total: result.total, novos: result.novos, qualificados: result.qualificados },
          p_erro: "",
        });
        return { status: "succeeded" };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Erro desconhecido na tarefa.";
        await rest(url, ctx, "rpc/finalizar_operacao_job", {
          p_job_id: job.id,
          p_sucesso: false,
          p_resultado: {},
          p_erro: reason,
        });
        return { status: "failed" };
      }
    }));
    return json({ claimed: jobs.length, succeeded: results.filter((r) => r.status === "succeeded").length, failed: results.filter((r) => r.status === "failed").length });
  } catch {
    return json({ error: "queue processing failed" }, 500);
  }
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D?.serve && import.meta.main) D.serve((request: Request) => handler(request, (key) => D.env.get(key)));

