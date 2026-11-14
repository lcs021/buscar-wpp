import { timeInSaoPaulo } from "../web/operacao.js";

Deno.test("datetime-local is converted using the configured Sao Paulo offset", () => {
  const actual = timeInSaoPaulo("2026-11-14T10:30");
  if (actual !== "2026-11-14T13:30:00.000Z") {
    throw new Error(`expected 2026-11-14T13:30:00.000Z, got ${actual}`);
  }
});

Deno.test("empty schedule means now and malformed date is rejected", () => {
  if (Math.abs(Date.parse(timeInSaoPaulo("")) - Date.now()) > 1000) {
    throw new Error("empty schedule should mean now");
  }
  let error: unknown;
  try { timeInSaoPaulo("not-a-date"); } catch (caught) { error = caught; }
  if (!(error instanceof Error)) throw new Error("malformed schedule must be rejected");
  error = undefined;
  try { timeInSaoPaulo("2026-02-30T10:30"); } catch (caught) { error = caught; }
  if (!(error instanceof Error)) throw new Error("impossible calendar date must be rejected");
});

