// Join the Bunker API: cloud save, recovery codes, leaderboards. Cloudflare Worker + D1 (binding DB).
// No accounts, no emails, no free text. A recovery code is the only key; only its hash is stored.
const ORIGINS = ["https://jointhebunker.com", "https://www.jointhebunker.com", "https://ejcoz.github.io", "http://localhost:8811"];
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const GAMES = { pipes: 60, gen: 60, pantry: 60, shaft: 80, hatch: 60 }; // max coins in one run (per design, generous)
const DAILY_CAP = 800;          // most coins one player can gain in a day
const MAX_STATE = 6000;         // bytes of JSON
const MIN_GAP_MS = 1500;        // min time between saves for one player

const J = (o, s = 200, req) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors(req) } });
const cors = req => { const o = req && req.headers.get("origin"); return { "access-control-allow-origin": ORIGINS.includes(o) ? o : ORIGINS[0], "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", "vary": "origin" }; };
const sha = async t => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, "0")).join("");
const newCode = () => { const r = crypto.getRandomValues(new Uint8Array(12)); const s = [...r].map(b => ALPHA[b % 32]).join(""); return "BUNK-" + s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12); };
const normCode = c => { const s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^BUNK/, ""); return s.length === 12 && [...s].every(ch => ALPHA.includes(ch)) ? "BUNK-" + s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12) : null; };
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const cleanHandle = h => String(h || "").toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._]/g, "").slice(0, 40);
const FLOORS = [[1, 10000], [10001, 20000], [20001, 30000], [30001, 40000], [40001, 70000], [70001, 85000], [85001, 99999]];
const floorOf = b => { const i = FLOORS.findIndex(f => b >= f[0] && b <= f[1]); return i < 0 ? 0 : i + 1; };

// validates and trims the room state sent by the browser
export function cleanState(s) {
  if (!s || typeof s !== "object") return null;
  const n = (v, max) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  const strs = (a, k) => (Array.isArray(a) ? a : []).filter(x => typeof x === "string" && x.length <= 40).slice(0, k);
  const eq = {}; for (const [k, v] of Object.entries(s.eq || {})) if (typeof v === "string" && k.length <= 20 && v.length <= 40 && Object.keys(eq).length < 30) eq[k] = v;
  const best = {}; for (const g of Object.keys(GAMES)) if (s.best && Number.isFinite(s.best[g])) best[g] = n(s.best[g], GAMES[g]);
  return { coins: n(s.coins, 1e6), own: strs(s.own, 200), eq, best, earned: n(s.earned, 1e7), coat: s.coat == null ? null : (typeof s.coat === "string" || Number.isFinite(s.coat) ? s.coat : null) };
}

async function save(req, env) {
  let b; try { b = await req.json(); } catch { return J({ error: "bad json" }, 400, req); }
  const st = cleanState(b.state), handle = cleanHandle(b.handle), bed = Math.floor(b.bed);
  if (!st || !handle || !(bed >= 1 && bed <= 99999) || JSON.stringify(st).length > MAX_STATE) return J({ error: "bad state" }, 400, req);
  const now = Date.now(), d = day(now);
  let code = normCode(b.code), id, row = null, created = false;
  if (code) { id = await sha(code); row = await env.DB.prepare("SELECT * FROM players WHERE id=?").bind(id).first(); if (!row) return J({ error: "unknown code" }, 404, req); }
  else { code = newCode(); id = await sha(code); created = true; }
  if (row && now - row.updated < MIN_GAP_MS) return J({ error: "slow down" }, 429, req);
  // coins earned are counted by the server: the rise in "earned", capped per day
  const prevEarned = row ? row.earned : 0, prevDaily = (await env.DB.prepare("SELECT gained FROM daily WHERE player=? AND day=?").bind(id, d).first())?.gained || 0;
  let rise = Math.max(0, st.earned - prevEarned);
  if (created) rise = Math.min(rise, DAILY_CAP); // a first save carries history; trust it up to one day's cap, rest is local
  const allowed = Math.max(0, Math.min(rise, DAILY_CAP - prevDaily));
  const earned = created ? Math.min(st.earned, DAILY_CAP * 3) : prevEarned + allowed;
  const kept = JSON.stringify({ ...st, earned });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO players(id,handle,bed,state,earned,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET handle=excluded.handle,bed=excluded.bed,state=excluded.state,earned=excluded.earned,updated=excluded.updated").bind(id, handle, bed, kept, earned, row ? row.created : now, now),
    env.DB.prepare("INSERT INTO daily(player,day,gained,writes) VALUES(?,?,?,1) ON CONFLICT(player,day) DO UPDATE SET gained=gained+?, writes=writes+1").bind(id, d, allowed, allowed),
  ]);
  return J({ ok: true, code: created ? code : undefined, earned }, 200, req);
}

async function load(req, env, url) {
  const code = normCode(url.searchParams.get("code")); if (!code) return J({ error: "bad code" }, 400, req);
  const row = await env.DB.prepare("SELECT handle,bed,state FROM players WHERE id=?").bind(await sha(code)).first();
  if (!row) return J({ error: "unknown code" }, 404, req);
  return J({ handle: row.handle, bed: row.bed, state: JSON.parse(row.state) }, 200, req);
}

async function score(req, env) {
  let b; try { b = await req.json(); } catch { return J({ error: "bad json" }, 400, req); }
  const code = normCode(b.code), game = String(b.game), sc = Math.floor(b.score), secs = Number(b.secs);
  if (!code || !(game in GAMES) || !(sc >= 0 && sc <= GAMES[game]) || !(secs >= 3)) return J({ error: "rejected" }, 400, req);
  if (sc / secs > 3) return J({ error: "rejected" }, 400, req); // more than 3 coins a second is not a human
  const id = await sha(code); if (!(await env.DB.prepare("SELECT 1 x FROM players WHERE id=?").bind(id).first())) return J({ error: "unknown code" }, 404, req);
  await env.DB.prepare("INSERT INTO scores(player,game,day,best) VALUES(?,?,?,?) ON CONFLICT(player,game,day) DO UPDATE SET best=MAX(best,excluded.best)").bind(id, game, day(), sc).run();
  return J({ ok: true }, 200, req);
}

async function board(req, env, url) {
  const kind = url.searchParams.get("kind") || "game", period = url.searchParams.get("period") || "week";
  const since = period === "today" ? day() : period === "week" ? day(Date.now() - 6 * 864e5) : "0000-00-00";
  let rows;
  if (kind === "game") {
    const g = url.searchParams.get("game"); if (!(g in GAMES)) return J({ error: "bad game" }, 400, req);
    rows = (await env.DB.prepare("SELECT p.handle,p.bed,MAX(s.best) v FROM scores s JOIN players p ON p.id=s.player WHERE s.game=? AND s.day>=? GROUP BY s.player ORDER BY v DESC LIMIT 10").bind(g, since).all()).results;
  } else if (kind === "coins") {
    rows = (await env.DB.prepare("SELECT p.handle,p.bed,SUM(d.gained) v FROM daily d JOIN players p ON p.id=d.player WHERE d.day>=? GROUP BY d.player HAVING v>0 ORDER BY v DESC LIMIT 10").bind(since).all()).results;
  } else if (kind === "floors") {
    const all = (await env.DB.prepare("SELECT p.bed,SUM(d.gained) v FROM daily d JOIN players p ON p.id=d.player WHERE d.day>=? GROUP BY p.bed").bind(since).all()).results;
    const t = {}; for (const r of all) { const f = floorOf(r.bed); if (f) t[f] = (t[f] || 0) + r.v; }
    rows = Object.entries(t).map(([f, v]) => ({ floor: +f, v })).sort((a, b) => b.v - a.v);
  } else return J({ error: "bad kind" }, 400, req);
  return new Response(JSON.stringify({ kind, period, rows }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=60", ...cors(req) } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    try {
      if (url.pathname === "/save" && req.method === "POST") return await save(req, env);
      if (url.pathname === "/load" && req.method === "GET") return await load(req, env, url);
      if (url.pathname === "/score" && req.method === "POST") return await score(req, env);
      if (url.pathname === "/board" && req.method === "GET") return await board(req, env, url);
      return J({ ok: true, service: "bunker-api" }, 200, req);
    } catch (e) { return J({ error: "server" }, 500, req); }
  },
};
