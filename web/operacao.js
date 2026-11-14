const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ESTADO_PADRAO = {
  enabled: false,
  paused: true,
  timezone: "America/Sao_Paulo",
  starts_at: "09:00:00",
  ends_at: "18:00:00",
  weekdays: [1, 2, 3, 4, 5],
  daily_limit: 50,
  max_concurrency: 1,
};
const STATUS = {
  queued: "Na fila",
  running: "Em execução",
  succeeded: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

let state = { config: { ...ESTADO_PADRAO }, jobs: [], runs: [], error: "", connected: false };

export async function carregarOperacao(sb) {
  const requests = await Promise.allSettled([
    sb.db("operacao_config?select=*&limit=1"),
    sb.db("operacao_jobs?select=id,kind,payload,status,attempts,max_attempts,scheduled_at,created_at,last_error&order=created_at.desc&limit=20"),
    sb.db("operacao_runs?select=job_id,attempt,status,started_at,ended_at,error,result&order=started_at.desc&limit=20"),
  ]);
  const failure = requests.find((r) => r.status === "rejected");
  if (failure) {
    state = { ...state, error: failure.reason?.message || "Não foi possível carregar a fila de operação.", connected: false };
    return;
  }
  const [config, jobs, runs] = requests.map((r) => r.value);
  state = {
    config: { ...ESTADO_PADRAO, ...(config?.[0] || {}) },
    jobs: jobs || [],
    runs: runs || [],
    error: "",
    connected: true,
  };
}

function hora(valor) { return String(valor || "").slice(0, 5); }
function marcado(condicao) { return condicao ? " checked" : ""; }

export function renderOperacao(esc) {
  const c = state.config;
  if (!state.connected) {
    return `<section class="card"><h3>Orquestração de pesquisas</h3>
      <div class="aviso erro">A operação ainda não está disponível neste projeto. Aplique a migração 20261114100000_operacao_agendada.sql no Supabase e recarregue. Detalhe: ${esc(state.error)}</div>
      <p>Enquanto isso, as pesquisas manuais continuam funcionando normalmente.</p></section>`;
  }
  const statusAtual = !c.enabled ? "Desativada" : c.paused ? "Pausada" : "Ativa dentro do expediente";
  const pendentes = state.jobs.filter((j) => ["queued", "running"].includes(j.status)).length;
  const concluidas = state.jobs.filter((j) => j.status === "succeeded").length;
  const htmlDias = DIAS.map((dia, i) => `<label class="chk op-dia"><input type="checkbox" name="weekdays" value="${i + 1}"${marcado((c.weekdays || []).includes(i + 1))}> ${dia}</label>`).join("");
  const tabela = state.jobs.length ? `<div class="tab-wrap op-jobs"><table><thead><tr><th>Pesquisa</th><th>Agendada para</th><th>Status</th><th>Tentativas</th><th>Resultado / erro recente</th></tr></thead><tbody>
    ${state.jobs.map((job) => {
      const filtro = job.payload || {};
      const resumo = state.runs.find((run) => run.job_id === job.id)?.result || {};
      const resultado = job.last_error || (resumo.total != null ? `${resumo.total} empresas · ${resumo.qualificados || 0} qualificadas` : "—");
      return `<tr><td>${esc([filtro.tipo, filtro.cidade, filtro.uf].filter(Boolean).join(" · "))}</td>
        <td>${esc(new Date(job.scheduled_at).toLocaleString("pt-BR", { timeZone: c.timezone }))}</td>
        <td>${esc(STATUS[job.status] || job.status)}</td><td>${job.attempts}/${job.max_attempts}</td><td>${esc(resultado)}</td></tr>`;
    }).join("")}</tbody></table></div>` : `<div class="vazio"><b>Nenhuma pesquisa agendada</b>As buscas serão registradas aqui.</div>`;

  return `<div class="op-wrap">
    <div class="op-status card"><div><span class="rot">Estado da operação</span><strong>${esc(statusAtual)}</strong></div>
      <div><span class="rot">Fila pendente</span><strong>${pendentes}</strong></div>
      <div><span class="rot">Concluídas nesta lista</span><strong>${concluidas}</strong></div>
      ${c.enabled ? `<button class="btn ${c.paused ? "p" : ""}" type="button" data-acao="op-pause">${c.paused ? "Retomar" : "Pausar"}</button>` : ""}</div>
    <div class="aviso info">A fila executa somente pesquisas de empresas. Ela respeita o fuso America/Sao_Paulo, os dias e horários definidos, o limite diário e a concorrência. Nenhuma mensagem, publicação comercial ou contato é enviado pelo orquestrador.</div>
    <form class="card" id="f-operacao"><h3>Expediente e limites</h3>
      <div class="op-grid">
        <label class="chk"><input type="checkbox" name="enabled"${marcado(c.enabled)}> Ativar pesquisas agendadas</label>
        <label class="chk"><input type="checkbox" name="paused"${marcado(c.paused)}> Manter operação pausada</label>
        <div class="campo"><label for="op-inicio">Início</label><input class="in" id="op-inicio" name="starts_at" type="time" required value="${esc(hora(c.starts_at))}"></div>
        <div class="campo"><label for="op-fim">Encerramento</label><input class="in" id="op-fim" name="ends_at" type="time" required value="${esc(hora(c.ends_at))}"></div>
        <div class="campo"><label for="op-limite">Pesquisas por dia (1–100)</label><input class="in" id="op-limite" name="daily_limit" type="number" min="1" max="100" step="1" required value="${c.daily_limit}"></div>
        <div class="campo"><label for="op-concorrencia">Pesquisas simultâneas (1–3)</label><input class="in" id="op-concorrencia" name="max_concurrency" type="number" min="1" max="3" step="1" required value="${c.max_concurrency}"></div>
      </div>
      <fieldset class="op-weekdays"><legend>Dias de operação · ${esc(c.timezone)}</legend><div class="op-days">${htmlDias}</div></fieldset>
      <button class="btn p" type="submit">Salvar configuração</button>
    </form>
    <form class="card" id="f-operacao-job"><h3>Agendar pesquisa</h3>
      <p class="sub">Pesquisas agendadas aguardam até o próximo expediente se a operação estiver pausada ou fora da janela.</p>
      <div class="op-grid">
        <div class="campo"><label>Tipo de empresa</label><input class="in" name="tipo" maxlength="100" required placeholder="Barbearias"></div>
        <div class="campo"><label>Cidade</label><input class="in" name="cidade" maxlength="100" required placeholder="Campinas"></div>
        <div class="campo"><label>UF</label><select class="in" name="uf" required><option value="">Selecione</option>${"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ").map((uf) => `<option>${uf}</option>`).join("")}</select></div>
        <div class="campo"><label>Bairro (opcional)</label><input class="in" name="bairro" maxlength="100"></div>
        <div class="campo"><label>Empresas (1–60)</label><select class="in" name="quantidade">${[10, 20, 40, 60].map((n) => `<option value="${n}"${n === 20 ? " selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="campo"><label>Data e hora (opcional)</label><input class="in" name="scheduled_at" type="datetime-local"></div>
      </div>
      <button class="btn p" type="submit">Adicionar à fila</button>
    </form>
    <section class="card"><h3>Fila e execuções</h3>${tabela}</section>
  </div>`;
}

function timeInSaoPaulo(localValue) {
  if (!localValue) return new Date().toISOString();
  const iso = new Date(`${localValue}:00-03:00`);
  if (!Number.isFinite(iso.getTime())) throw new Error("Data e hora inválidas.");
  return iso.toISOString();
}

async function salvarConfig(sb, userId, changes = {}) {
  const body = { user_id: userId, ...ESTADO_PADRAO, ...state.config, ...changes, timezone: "America/Sao_Paulo" };
  const [saved] = await sb.db("operacao_config?on_conflict=user_id", {
    method: "POST",
    body,
    prefer: "resolution=merge-duplicates,return=representation",
  });
  state.config = { ...ESTADO_PADRAO, ...saved };
}

export async function submitOperacao(ev, sb, userId, toast) {
  const form = ev.target;
  if (form.id !== "f-operacao" && form.id !== "f-operacao-job") return false;
  ev.preventDefault();
  const data = new FormData(form);
  try {
    if (form.id === "f-operacao") {
      const start = String(data.get("starts_at"));
      const end = String(data.get("ends_at"));
      if (start >= end) throw new Error("O horário de encerramento deve ser depois do início.");
      const weekdays = data.getAll("weekdays").map(Number);
      if (!weekdays.length) throw new Error("Selecione pelo menos um dia de operação.");
      await salvarConfig(sb, userId, {
        enabled: data.get("enabled") === "on",
        paused: data.get("paused") === "on",
        starts_at: `${start}:00`,
        ends_at: `${end}:00`,
        weekdays,
        daily_limit: Number(data.get("daily_limit")),
        max_concurrency: Number(data.get("max_concurrency")),
      });
      toast("Configuração da operação salva.");
    } else {
      const payload = {
        tipo: String(data.get("tipo") || "").trim(),
        cidade: String(data.get("cidade") || "").trim(),
        uf: String(data.get("uf") || "").trim().toUpperCase(),
        bairro: String(data.get("bairro") || "").trim(),
        quantidade: Number(data.get("quantidade")),
      };
      await sb.db("rpc/enfileirar_pesquisa", {
        method: "POST",
        body: { p_payload: payload, p_scheduled_at: timeInSaoPaulo(String(data.get("scheduled_at") || "")), p_request_key: crypto.randomUUID() },
      });
      toast("Pesquisa adicionada à fila.");
    }
    await carregarOperacao(sb);
    return true;
  } catch (error) {
    toast(error.message || "Não foi possível salvar a operação.", true);
    return true;
  }
}

export async function clickOperacao(ev, sb, userId, toast) {
  const button = ev.target.closest('[data-acao="op-pause"]');
  if (!button) return false;
  try {
    await salvarConfig(sb, userId, { enabled: true, paused: !state.config.paused });
    await carregarOperacao(sb);
    toast(state.config.paused ? "Operação pausada." : "Operação retomada.");
  } catch (error) { toast(error.message || "Não foi possível alterar a operação.", true); }
  return true;
}

