#!/usr/bin/env bun
/**
 * Poseidon Dashboard Server
 * Serves: static files, REST API (reads JSONL/JSON), SSE for live updates
 * Launch: bun dashboard/server.ts
 */
import { resolve, dirname, join, extname } from "path";
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { homedir } from "os";

const PORT = parseInt(process.env.PORT || "3456");
const BASE = process.env.POSEIDON_DIR || resolve(dirname(new URL(import.meta.url).pathname), "..");
const PAI_DIR = process.env.PAI_DIR?.replace(/^\$HOME|^\$\{HOME\}|^~/, homedir()) || join(homedir(), ".claude");
const MEMORY = join(PAI_DIR, "MEMORY");
const SETTINGS = join(PAI_DIR, "settings.json");
const MIME: Record<string, string> = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2",
};

function cors(extra?: Record<string, string>): Record<string, string> {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", ...extra };
}
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors({ "Content-Type": "application/json" }) });
}
function wrap(arr: any[]) { return { data: arr, count: arr.length, empty: arr.length === 0 }; }

function readJsonl(path: string, opts?: { since?: string; limit?: number }): any[] {
  if (!existsSync(path)) return [];
  try {
    const lines = readFileSync(path, "utf-8").split("\n").filter(Boolean);
    let recs = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    if (opts?.since) {
      const cutoff = new Date(opts.since).getTime();
      recs = recs.filter((r: any) => {
        const ts = r.timestamp || r.ts || r.date || r.created;
        return ts && new Date(ts).getTime() >= cutoff;
      });
    }
    if (opts?.limit) recs = recs.slice(-opts.limit);
    return recs;
  } catch { return []; }
}

function parseFM(content: string): Record<string, string> {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const r: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) r[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return r;
}

function scanPRDs(workDir: string): any[] {
  if (!existsSync(workDir)) return [];
  const out: any[] = [];
  try {
    for (const name of readdirSync(workDir)) {
      const dir = join(workDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const prd = join(dir, "PRD.md");
      if (!existsSync(prd)) continue;
      try {
        const fm = parseFM(readFileSync(prd, "utf-8").split("\n").slice(0, 15).join("\n"));
        out.push({ slug: name, task: fm.task || name, effort: fm.effort || "", phase: fm.phase || "", progress: fm.progress || "", started: fm.started || "", updated: fm.updated || "" });
      } catch {}
    }
  } catch {}
  return out.sort((a, b) => (b.started || "").localeCompare(a.started || ""));
}

function scanMDs(dir: string): any[] {
  if (!existsSync(dir)) return [];
  const out: any[] = [];
  try {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      try {
        const content = readFileSync(join(dir, file), "utf-8");
        const fm = parseFM(content);
        const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "").split("\n").slice(0, 5).join("\n").trim();
        out.push({ filename: file, status: fm.status || "", created: fm.created || "", pattern: fm.pattern || "", text: body });
      } catch {}
    }
  } catch {}
  return out;
}

// SSE file watcher state
const watched: Record<string, number> = {};
function fsize(p: string): number { try { return statSync(p).size; } catch { return 0; } }
const WATCHED_PATHS = [
  join(MEMORY, "LEARNING", "SIGNALS", "ratings.jsonl"),
  join(MEMORY, "LEARNING", "error-log.jsonl"),
  join(MEMORY, "LEARNING", "metrics.jsonl"),
  join(MEMORY, "LEARNING", "escalation-patterns.jsonl"),
  join(MEMORY, "LEARNING", "SIGNALS", "thinking-runs.jsonl"),
];
for (const p of WATCHED_PATHS) watched[p] = fsize(p);

// JSONL path shortcuts
const P = {
  ratings: join(MEMORY, "LEARNING", "SIGNALS", "ratings.jsonl"),
  errors: join(MEMORY, "LEARNING", "error-log.jsonl"),
  metrics: join(MEMORY, "LEARNING", "metrics.jsonl"),
  escalation: join(MEMORY, "LEARNING", "escalation-patterns.jsonl"),
  thinking: join(MEMORY, "LEARNING", "SIGNALS", "thinking-runs.jsonl"),
  work: join(MEMORY, "WORK"),
  rules: join(MEMORY, "LEARNING", "rules"),
  candidates: join(MEMORY, "LEARNING", "candidates"),
};

async function handle(req: Request, srv: any): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const q = (k: string, def: string) => url.searchParams.get(k) || def;

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

  // Static files
  if (path === "/" || path === "/index.html") {
    const f = join(BASE, "dashboard", "index.html");
    return existsSync(f) ? new Response(readFileSync(f, "utf-8"), { headers: cors({ "Content-Type": "text/html" }) })
      : new Response("Not found", { status: 404, headers: cors() });
  }
  if (path.startsWith("/static/")) {
    const f = join(BASE, "dashboard", path);
    if (!existsSync(f)) return new Response("Not found", { status: 404, headers: cors() });
    return new Response(Bun.file(f), { headers: cors({ "Content-Type": MIME[extname(f)] || "application/octet-stream" }) });
  }

  // Data APIs
  if (path === "/api/ratings") {
    let recs = readJsonl(P.ratings, { since: q("since", "") || undefined, limit: parseInt(q("limit", "100")) });
    recs = recs.map((r: any) => { if (r.timestamp) r._ts = Math.floor(new Date(r.timestamp).getTime() / 1000); return r; });
    return json(wrap(recs));
  }
  if (path === "/api/errors") return json(wrap(readJsonl(P.errors, { since: q("since", "") || undefined, limit: parseInt(q("limit", "100")) })));
  if (path === "/api/metrics") return json(wrap(readJsonl(P.metrics, { limit: parseInt(q("limit", "30")) })));
  if (path === "/api/sessions") return json(wrap(scanPRDs(P.work)));
  if (path === "/api/rules") return json(wrap(scanMDs(P.rules)));
  if (path === "/api/candidates") return json(wrap(scanMDs(P.candidates)));
  if (path === "/api/escalation") return json(wrap(readJsonl(P.escalation)));
  if (path === "/api/thinking") return json(wrap(readJsonl(P.thinking)));

  // Settings
  if (path === "/api/settings" && req.method === "GET") {
    try { return json(JSON.parse(readFileSync(SETTINGS, "utf-8"))); }
    catch { return json({ error: "Could not read settings" }, 500); }
  }
  if (path === "/api/settings" && req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body !== "object" || body === null || !("identity" in body))
        return json({ error: "Invalid settings: must be object with identity key" }, 400);
      const tmp = SETTINGS + ".tmp";
      writeFileSync(tmp, JSON.stringify(body, null, 2));
      renameSync(tmp, SETTINGS);
      return json({ ok: true });
    } catch (e: any) { return json({ error: e.message || "Write failed" }, 500); }
  }

  // Candidate approve/reject
  const approveM = path.match(/^\/api\/candidates\/([^/]+)\/approve$/);
  if (approveM && req.method === "POST") {
    const fn = decodeURIComponent(approveM[1]);
    const src = join(P.candidates, fn), dst = join(P.rules, fn);
    if (!existsSync(src)) return json({ error: "Candidate not found" }, 404);
    try {
      writeFileSync(dst, readFileSync(src, "utf-8").replace(/^(status:\s*).*$/m, "$1verified"));
      unlinkSync(src);
      return json({ ok: true, moved: fn });
    } catch (e: any) { return json({ error: e.message }, 500); }
  }
  const rejectM = path.match(/^\/api\/candidates\/([^/]+)\/reject$/);
  if (rejectM && req.method === "POST") {
    const fn = decodeURIComponent(rejectM[1]);
    const src = join(P.candidates, fn);
    if (!existsSync(src)) return json({ error: "Candidate not found" }, 404);
    try { unlinkSync(src); return json({ ok: true, deleted: fn }); }
    catch (e: any) { return json({ error: e.message }, 500); }
  }

  // SSE events
  if (path === "/api/events") {
    srv.timeout(req, 0);
    const stream = new ReadableStream({
      start(ctrl) {
        const enc = new TextEncoder();
        const send = (d: any) => { try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`)); } catch {} };
        send({ type: "init", ratingsCount: readJsonl(P.ratings, { limit: 1 }).length, errorsCount: readJsonl(P.errors, { limit: 1 }).length });
        const iv = setInterval(() => {
          for (const [fp, prev] of Object.entries(watched)) {
            const sz = fsize(fp);
            if (sz <= prev) continue;
            try {
              const lines = readFileSync(fp, "utf-8").split("\n").filter(Boolean).slice(-5);
              const type = fp.includes("ratings") ? "rating" : fp.includes("error") ? "error"
                : fp.includes("metrics") ? "metric" : fp.includes("escalation") ? "escalation"
                : fp.includes("thinking") ? "thinking" : "update";
              for (const l of lines) { try { send({ type, record: JSON.parse(l) }); } catch {} }
            } catch {}
            watched[fp] = sz;
          }
        }, 2000);
        req.signal.addEventListener("abort", () => { clearInterval(iv); try { ctrl.close(); } catch {} });
      },
    });
    return new Response(stream, { headers: cors({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }) });
  }

  return new Response("Not found", { status: 404, headers: cors() });
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req, srv) {
    try { return handle(req, srv); }
    catch (e: any) { return json({ error: e.message || "Internal error" }, 500); }
  },
});
console.log(`Poseidon Dashboard: http://0.0.0.0:${server.port} | PAI: ${PAI_DIR}`);
