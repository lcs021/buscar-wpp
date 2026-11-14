import { handler } from "../supabase/functions/orquestrador/index.ts";

Deno.test("orchestrator requires the cron secret before reading configuration", async () => {
  const response = await handler(
    new Request("https://edge.example/orquestrador", { method: "POST" }),
    () => "super-secret-that-is-long-enough-for-this-test",
  );
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

Deno.test("orchestrator refuses short cron secrets", async () => {
  const response = await handler(
    new Request("https://edge.example/orquestrador", {
      method: "POST",
      headers: { Authorization: "Bearer short" },
    }),
    () => "short",
  );
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

Deno.test("orchestrator rejects non-POST requests", async () => {
  const response = await handler(
    new Request("https://edge.example/orquestrador", { method: "GET" }),
    () => undefined,
  );
  if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`);
});

