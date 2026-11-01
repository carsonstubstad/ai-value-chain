// Pure helpers shared by every view: formatting, indexes, filters, staleness.
// No DOM access here, so tests/render.mjs can run the views in Node.

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (v) => {
  if (v >= 1e9) return "$" + +(v / 1e9).toFixed(v >= 1e11 ? 0 : 1) + "B";
  return "$" + +(v / 1e6).toFixed(0) + "M";
};

export function amountText(d) {
  const lo = d.amount_usd_low, hi = d.amount_usd_high;
  if (lo == null && hi == null) return "undisclosed";
  const tag = d.syndicate_total ? " (syndicate total)" : "";
  if (lo == null) return "up to " + money(hi) + tag;
  if (hi == null) return "over " + money(lo) + tag;
  return (lo === hi ? money(lo) : money(lo) + " to " + money(hi)) + tag;
}

export const highEnd = (d) => d.amount_usd_high ?? d.amount_usd_low ?? 0;
export const hasAmount = (d) => d.amount_usd_high != null || d.amount_usd_low != null;
export const isRange = (d) => d.amount_usd_low == null || d.amount_usd_high == null || d.amount_usd_high !== d.amount_usd_low || d.amount_kind === "cap";

// Sourcing marker beside every amount (D36): F filed, S company-stated, R reported.
export const MARK = { filed: "F", company_stated: "S", reported: "R", rumored: "?" };

// Basis by shape (D36): paid solid, committed outline, cap or range dashed, guarantees grey.
export function basisStyle(d) {
  if (d.contingent) return "contingent";
  if (d.amount_basis === "paid") return "paid";
  if (hasAmount(d) && isRange(d)) return "cap";
  return "committed";
}

// Layer families (spec section 4): position names the layer, hue names the family.
export const FAMILY = {
  equipment: "hw", chip_design: "hw", foundry: "hw", memory: "hw", systems: "hw",
  power: "infra", data_centers: "infra", hyperscale: "infra", labs: "model", applications: "model", capital: "cap",
};
export const CHAIN = ["equipment", "chip_design", "foundry", "memory", "systems", "power", "data_centers", "hyperscale", "labs", "applications"];
const CEILING = new Set(["cap", "multi_year_total", "annual_run_rate"]);

// Layer to layer flows (D33): width is the sum of each deal's largest stated figure, kept as one-time
// money and ceilings so the label can say which (D50). Guarantees count as deals but not in the width.
export function layerFlows(deals, idx) {
  const m = new Map();
  for (const d of deals) {
    const a = idx.companies[d.payer].layer, b = idx.companies[d.payee].layer, k = a + ">" + b;
    if (!m.has(k)) m.set(k, { from: a, to: b, key: k, deals: [], cash: 0, ceil: 0, contingent: 0, paid: 0, paidAmt: 0, noamt: 0 });
    const f = m.get(k);
    f.deals.push(d);
    if (d.amount_basis === "paid") f.paid++;
    if (d.contingent) { f.contingent++; continue; }
    if (!hasAmount(d)) { f.noamt++; continue; }
    if (d.amount_kind === "one_time") f.cash += highEnd(d); else f.ceil += highEnd(d);
    // Paid share (D50): paid deals in full, plus what is recorded as paid to date on committed ones.
    f.paidAmt += d.amount_basis === "paid" ? highEnd(d) : d.paid_to_date_usd || 0;
  }
  return [...m.values()].map((f) => ({ ...f, n: f.deals.length, total: f.cash + f.ceil }))
    .sort((a, b) => b.total - a.total || b.n - a.n || a.key.localeCompare(b.key));
}

// The word for what a width is made of (D50): ceilings when any cap or multi-year total is in it,
// paid when all of it is paid, otherwise committed.
export const flowWord = (f) => (f.ceil > 0 ? "ceilings" : f.total > 0 && f.paidAmt >= f.total ? "paid" : "committed");

// Loop numbers (D35: loops respect the confidence filter only). Ranked by the sum of largest
// stated figures with guarantees left out; the sum orders cards and is never shown.
export function loopView(loop, idx, conf) {
  const deals = loop.deals.map((id) => idx.deals[id]).filter((d) => d && conf.includes(d.confidence));
  const cos = [];
  for (const d of deals) for (const c of [d.payer, d.payee]) if (!cos.includes(c)) cos.push(c);
  const closed = cos.every((c) => deals.some((d) => d.payer === c) && deals.some((d) => d.payee === c));
  const equity = new Set(["equity_investment", "warrant_or_equity_grant", "jv_contribution"]);
  const first = cos.find((c) => deals.some((d) => d.payer === c && equity.has(d.type))) || cos[0];
  const order = first ? [first, ...cos.filter((c) => c !== first)] : cos;
  const sum = (ds) => ds.filter((d) => !d.contingent).reduce((t, d) => t + highEnd(d), 0);
  const put = deals.filter((d) => d.payer === first), back = deals.filter((d) => d.payer !== first);
  return { loop, deals, cos: order, closed: closed && deals.length >= 2, size: sum(deals), put, back, putAmt: sum(put), backAmt: sum(back) };
}

export function isoWeek(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4));
  return { year: y, week: 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7) };
}

export function weekRange(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
}

export const LABEL = {
  confidence: { filed: "Filed", company_stated: "Company-stated", reported: "Reported", rumored: "Rumored" },
  basis: { committed: "Committed", paid: "Paid", estimated: "Estimated" },
  kind: { cap: "up to", multi_year_total: "multi-year", annual_run_rate: "per year", one_time: "one-time", undisclosed: "undisclosed" },
  ownership: { public: "Public", private: "Private", joint_venture: "Joint venture", government: "Government" },
  status: { announced: "Announced", signed: "Signed", closed: "Closed", terminated: "Terminated", superseded: "Superseded" },
};
export const TYPE_SHORT = {
  equity_investment: "equity", warrant_or_equity_grant: "warrant", jv_contribution: "JV stake", acquisition: "acquisition",
  debt_or_gpu_backed_loan: "loan", guarantee_or_backstop: "guarantee", purchase_commitment: "purchase", capacity_lease: "compute lease",
  cloud_credits: "cloud credits", power_supply_agreement: "power deal", revenue_share: "revenue share", government_grant_or_incentive: "grant",
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
    rib: p.get("rib") || "", w: p.get("w") === "count" ? "count" : "", open: p.has("open") ? p.get("open").split(",").filter(Boolean) : [],
    na: p.get("na") === "1" ? "1" : "",
  };
}

export function stateQuery(s) {
  const p = new URLSearchParams();
  for (const k of ["basis", "conf"]) if (s[k].join() !== DEFAULTS[k].join()) p.set(k, s[k].join(","));
  for (const k of ["since", "layer", "q", "family", "own", "region", "focus"]) if (s[k] && s[k] !== DEFAULTS[k]) p.set(k, s[k]);
  if (s.min) p.set("min", String(s.min));
  for (const k of ["rib", "w", "na"]) if (s[k]) p.set(k, s[k]);
  if (s.open?.length) p.set("open", s.open.join(","));
  const q = p.toString();
  return q ? "?" + q : "";
}

// View state (trace, picked ribbon, width toggle, open layers) is not a filter.
export const VIEW_KEYS = { focus: "", rib: "", w: "", open: [], na: "" };
export const isFiltered = (s) => stateQuery({ ...s, ...VIEW_KEYS }) !== "";

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
