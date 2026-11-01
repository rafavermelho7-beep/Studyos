// DUBLÊ DE TESTE da API da Anthropic (NÃO é a API real). Responde no formato SSE de
// /v1/messages para exercitar o pipeline completo (roteador, streaming, extração,
// registro de custo) sem gastar créditos. Registra cada requisição em requests.jsonl.
import http from "node:http";
import fs from "node:fs";

const LOG = new URL("./requests.jsonl", import.meta.url);
fs.writeFileSync(LOG, "");

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

http
  .createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) {
      res.writeHead(404);
      return res.end();
    }
    const p = JSON.parse(body);
    fs.appendFileSync(LOG, JSON.stringify(p) + "\n");
    const sys = Array.isArray(p.system) ? p.system.map((b) => b.text).join("\n") : p.system ?? "";
    const last = p.messages.at(-1)?.content ?? "";
    const lastText = typeof last === "string" ? last : JSON.stringify(last);
    let text;
    if (p.output_config?.format) {
      const memories = [];
      const proposals = [];
      if (/prefiro/i.test(lastText)) memories.push({ kind: "preference", content: "Prefere estudar de manhã cedo", domain: "estudos", sensitivity: "normal", confidence: 0.9, stated: true });
      if (/ansios/i.test(lastText)) memories.push({ kind: "fact", content: "Sente ansiedade antes de provas", domain: "saude", sensitivity: "sensitive", confidence: 0.8, stated: true });
      if (/rende mais/i.test(lastText)) memories.push({ kind: "inference", content: "Parece render mais quando dorme bem", domain: "saude", sensitivity: "normal", confidence: 0.9, stated: false });
      if (/quero .*objetivo|meu objetivo/i.test(lastText)) proposals.push({ type: "create_goal", title: "Correr uma meia maratona", description: "", domain: "saude", why: "Saúde e disciplina", horizon: "year", rationale: "O usuário declarou a intenção explicitamente." });
      text = JSON.stringify({ memories, proposals, space_title: "Rotina de estudos" });
    } else if (/SÍNTESE DIÁRIA/.test(lastText)) {
      text = "Dia com dados limitados.\n\n- Hoje: revise a prova de Cálculo II.\n- Equilíbrio: relacionamentos sem registro esta semana.";
    } else if (/REVISÃO SEMANAL/.test(lastText)) {
      text = "Semana de avanço parcial.\n\n- Objetivo de estágio parado.\n- Hipótese (n=3): energia menor após noites curtas.";
    } else {
      const mem = sys.includes("MEMÓRIAS RELEVANTES:\n-") ? "Considerei suas memórias." : "Ainda sei pouco sobre você.";
      text = `Resposta simulada do dublê de teste. ${mem} Você disse: "${lastText.slice(0, 60)}". **Ponto-chave:** equilíbrio antes de volume.`;
    }
    const inTok = Math.ceil((sys.length + JSON.stringify(p.messages).length) / 4);
    const outTok = Math.ceil(text.length / 4);
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    sse(res, "message_start", { type: "message_start", message: { id: "msg_mock", type: "message", role: "assistant", model: p.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: inTok, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } });
    sse(res, "content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    for (const chunk of text.match(/.{1,24}/gs) ?? []) {
      sse(res, "content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } });
      await new Promise((r) => setTimeout(r, 15));
    }
    sse(res, "content_block_stop", { type: "content_block_stop", index: 0 });
    sse(res, "message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: outTok } });
    sse(res, "message_stop", { type: "message_stop" });
    res.end();
  })
  .listen(4010, "127.0.0.1", () => console.log("mock anthropic :4010"));
