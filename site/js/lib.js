// Pure helpers shared by every view: formatting, indexes, filters, staleness.
// No DOM access here, so tests/render.mjs can run the views in Node.

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (v) => {
  if (v >= 1e9) return "$" + +(v / 1e9).toFixed(v % 1e9 ? 1 : 0) + "B";
  return "$" + +(v / 1e6).toFixed(0) + "M";
};

export function amountText(d) {
  const lo = d.amount_usd_low, hi = d.amount_usd_high;
  if (lo == null && hi == null) return "not disclosed";
  const tag = d.syndicate_total ? " (syndicate total)" : "";
  if (lo == null) return "up to " + money(hi) + tag;
  if (hi == null) return "over " + money(lo) + tag;
  return (lo === hi ? money(lo) : money(lo) + " to " + money(hi)) + tag;
}

export const highEnd = (d) => d.amount_usd_high ?? d.amount_usd_low ?? 0;
export const hasAmount = (d) => d.amount_usd_high != null || d.amount_usd_low != null;
export const isRange = (d) => d.amount_usd_low == null || d.amount_usd_high == null || d.amount_usd_high !== d.amount_usd_low || d.amount_kind === "cap";

export const LABEL = {
  confidence: { filed: "Filed", company_stated: "Company-stated", reported: "Reported", rumored: "Rumored" },
  basis: { committed: "Committed", paid: "Paid", estimated: "Estimated" },
  kind: { cap: "cap", multi_year_total: "multi-year total", annual_run_rate: "annual run-rate", one_time: "one-time" },
  ownership: { public: "Public", private: "Private", joint_venture: "Joint venture", government: "Government" },
  status: { announced: "Announced", signed: "Signed", closed: "Closed", terminated: "Terminated", superseded: "Superseded" },
};
export const typeLabel = (t) => t.replace(/_/g, " ").replace(/\bgpu\b/g, "GPU").replace(/\bjv\b/g, "JV").replace(/^./, (c) => c.toUpperCase());

// HQ regions for the drill-down filter.
export const REGIONS = { americas: ["US", "CA"], europe: ["FR", "GB", "NL", "DE", "CH", "SE", "IE"], asia: ["JP", "KR", "TW", "AE", "CN", "SG", "IN", "SA"] };
export const REGION_LABEL = { americas: "Americas", europe: "Europe", asia: "Asia and Middle East" };

export function index(data) {
  const companies = Object.fromEntries(data.companies.map((c) => [c.id, c]));
  const sources = Object.fromEntries(data.sources.map((s) => [s.id, s]));
  const deals = Object.fromEntries(data.deals.map((d) => [d.id, d]));
  const layers = Object.fromEntries(data.taxonomy.layers.map((l) => [l.id, l]));
  const family = {};
  for (const f of data.taxonomy.deal_families) for (const t of f.types) family[t] = f.id;
  const asOf = data.state?.as_of ?? data.deals.reduce((m, d) => (d.last_checked > m ? d.last_checked : m), "");
  return { companies, sources, deals, layers, family, asOf };
}

// Filter state lives in the URL hash query, so every view can be linked.
export const DEFAULTS = { basis: ["committed", "paid", "estimated"], conf: ["filed", "company_stated", "reported"], since: "all", layer: "", q: "", family: "", min: 0, own: "", region: "" };

export function parseState(query) {
  const p = new URLSearchParams(query || "");
  const list = (k) => (p.has(k) ? p.get(k).split(",").filter(Boolean) : DEFAULTS[k]);
  return {
    basis: list("basis"), conf: list("conf"), since: p.get("since") || "all", layer: p.get("layer") || "",
    q: p.get("q") || "", family: p.get("family") || "", min: Number(p.get("min")) || 0,
    own: p.get("own") || "", region: p.get("region") || "", focus: p.get("focus") || "",
  };
}

export function stateQuery(s) {
  const p = new URLSearchParams();
  for (const k of ["basis", "conf"]) if (s[k].join() !== DEFAULTS[k].join()) p.set(k, s[k].join(","));
  for (const k of ["since", "layer", "q", "family", "own", "region", "focus"]) if (s[k] && s[k] !== DEFAULTS[k]) p.set(k, s[k]);
  if (s.min) p.set("min", String(s.min));
  const q = p.toString();
  return q ? "?" + q : "";
}

export const isFiltered = (s) => stateQuery({ ...s, focus: "" }) !== "";

export function sinceDate(since, asOf) {
  const m = { "12m": 12, "24m": 24 }[since];
  if (!m || !asOf) return "";
  const d = new Date(asOf + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - m);
  return d.toISOString().slice(0, 10);
}

export function applyFilters(deals, s, idx) {
  const from = sinceDate(s.since, idx.asOf);
  const q = s.q.trim().toLowerCase();
  const inRegion = (c) => !s.region || (REGIONS[s.region] || []).includes(c.hq_country);
  return deals.filter((d) => {
    const a = idx.companies[d.payer], b = idx.companies[d.payee];
    if (!a || !b) return false;
    if (!s.conf.includes(d.confidence)) return false;
    if (!s.basis.includes(d.amount_basis)) return false;
    if (from && d.announced < from) return false;
    if (s.layer && a.layer !== s.layer && b.layer !== s.layer) return false;
    if (q && !a.name.toLowerCase().includes(q) && !b.name.toLowerCase().includes(q)) return false;
    if (s.family && idx.family[d.type] !== s.family) return false;
    if (s.min && highEnd(d) < s.min * 1e9) return false;
    if (s.own && a.ownership !== s.own && b.ownership !== s.own) return false;
    if (s.region && !inRegion(a) && !inRegion(b)) return false;
    return true;
  });
}

// Staleness (P05): amber after 90 days unchecked, grey after 180.
export function staleness(lastChecked, asOf, days) {
  if (!lastChecked || !asOf) return "fresh";
  const age = (Date.parse(asOf) - Date.parse(lastChecked)) / 864e5;
  if (age > days.grey) return "grey";
  if (age > days.amber) return "amber";
  return "fresh";
}

export function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d} ${mon} ${y}`;
}

// Largest single deal per company on one side (P23: never a sum of caps).
export function largestBy(deals, side) {
  const best = {};
  for (const d of deals) if (hasAmount(d) && highEnd(d) > (best[d[side]] ? highEnd(best[d[side]]) : 0)) best[d[side]] = d;
  return Object.entries(best).sort((a, b) => highEnd(b[1]) - highEnd(a[1]));
}

// Follow the money: every company reachable downstream (money out) or upstream (money in).
export function reach(deals, start, dir) {
  const seen = new Set([start]);
  const edges = new Set();
  const queue = [start];
  while (queue.length) {
    const c = queue.shift();
    for (const d of deals) {
      const [from, to] = dir === "down" ? [d.payer, d.payee] : [d.payee, d.payer];
      if (from !== c) continue;
      edges.add(d.id);
      if (!seen.has(to)) { seen.add(to); queue.push(to); }
    }
  }
  seen.delete(start);
  return { companies: seen, edges };
}
