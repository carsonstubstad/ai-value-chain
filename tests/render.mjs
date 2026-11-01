// Renders every page of the site in Node from site/data/bundle.json, with several filter
// states, and fails on a thrown error, "undefined", "NaN", an em-dash or an unbalanced tag.
// Run: node tests/render.mjs  (no packages needed)

import { readFileSync } from "node:fs";
import { index, parseState, stateQuery, applyFilters, esc, hasAmount } from "../site/js/lib.js";
import { sankeyEdges } from "../site/js/charts.js";
import * as V from "../site/js/views.js";

const data = JSON.parse(readFileSync(new URL("../site/data/bundle.json", import.meta.url)));
const idx = index(data);
const problems = [];
let pages = 0;

const STATES = ["", "conf=filed", "basis=paid", "since=12m", "layer=labs", "q=nvidia", "family=debt", "min=10",
  "own=private", "region=asia", "conf=filed,company_stated,reported,rumored", "q=zzzz", "focus=openai", "focus=nvidia&layer=labs",
  "open=R%3Ahyperscale&focus=openai", "open=L%3Alabs,R%3Alabs", "open=capital&w=count", "w=count", "na=1", "rib=labs%3Ehyperscale"];

function check(label, html) {
  pages++;
  if (/undefined|NaN|\[object /.test(html)) problems.push(`${label}: contains undefined, NaN or [object`);
  if (html.includes(String.fromCharCode(0x2014))) problems.push(`${label}: contains an em-dash`);
  for (const tag of ["div", "section", "ul", "ol", "li", "p", "a", "svg", "details", "header", "article", "g"]) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (open !== close) problems.push(`${label}: <${tag}> opened ${open}, closed ${close}`);
  }
}

function run(label, fn) {
  try { check(label, fn()); } catch (e) { problems.push(`${label}: threw ${e.stack.split("\n").slice(0, 2).join(" ")}`); }
}

for (const q of STATES) {
  const s = parseState(q);
  const ctx = V.makeCtx(data, idx, s, stateQuery);
  run(`controls ?${q}`, () => V.renderControls(ctx));
  run(`overview ?${q}`, () => V.renderOverview(ctx));
  run(`flows ?${q}`, () => V.renderFlows(ctx));
  run(`loops ?${q}`, () => V.renderLoops(ctx));
  run(`changes ?${q}`, () => V.renderChanges(ctx));
  run(`data ?${q}`, () => V.renderData(ctx));
  run(`foot ?${q}`, () => V.renderFoot(ctx));
  for (const c of data.companies) run(`company/${c.id} ?${q}`, () => V.renderCompany(ctx, c.id));
  // The filter state must survive a trip through the URL.
  const back = parseState(stateQuery(s).slice(1));
  if (JSON.stringify(back) !== JSON.stringify(s)) problems.push(`state round trip failed for ?${q}`);
}
run("company/unknown", () => V.renderCompany(V.makeCtx(data, idx, parseState(""), stateQuery), "no-such-company"));

// Rumors are hidden by default.
const def = applyFilters(data.deals, parseState(""), idx);
if (def.some((d) => d.confidence === "rumored")) problems.push("default filters show a rumor");

// Word budgets (D39). Text is what a reader sees outside the charts: no svg or phone ledger, title text,
// select options, the filter drawer or the F/S/R markers. A word has a letter or digit.
// The phone ledger repeats the sankey in words, so it is counted once, as the chart (HANDOFF 6).
const strip = (h) => h.replace(/<div class="phone-only">[\s\S]*?<\/div>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<select[\s\S]*?<\/select>/g, " ")
  .replace(/<details class="more"[\s\S]*?<\/details>/g, " ").replace(/<span class="mk"[^>]*>[^<]*<\/span>/g, " ");
const words = (h) => strip(h).replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&[a-z#0-9]+;/g, " ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const inner = (h, re) => [...h.matchAll(re)].map((m) => m[1]);
function budgets(label, html) {
  for (const t of inner(html, /<h1>([\s\S]*?)<\/h1>/g)) if (words(t) > 6) problems.push(`${label}: headline over 6 words: ${t}`);
  for (const t of inner(html, /<p class="state">([\s\S]*?)<\/p>/g)) if (words(t) > 20) problems.push(`${label}: state line over 20 words`);
  for (const t of inner(html, /<p class="line">([\s\S]*?)<\/p>/g)) if (words(t) > 15) problems.push(`${label}: loop line over 15 words: ${t}`);
  for (const t of inner(html, /title="([^"]*)"/g)) if (t.split("\n").length > 2) problems.push(`${label}: tooltip over 2 lines`);
  if (/class="lede"/.test(html)) problems.push(`${label}: explanatory paragraph`);
  if ((html.match(/cannot be netted/g) || []).length > 1) problems.push(`${label}: netting caveat more than once`);
}
const c0 = V.makeCtx(data, idx, parseState(""), stateQuery);
const ov = V.renderOverview(c0);
budgets("overview", ov);
if (words(ov) >= 250) problems.push(`overview: ${words(ov)} words, budget is under 250`);
// The sankey (HANDOFF 6 and 9): labeled ribbons are $5B or more, no hatching or dashes, and every
// deal with an amount is in a ribbon whose width sums to the layer flows.
const toUsd = (t) => { const m = t.match(/^\$([\d.]+)([BMT])/); return m ? Number(m[1]) * { M: 1e6, B: 1e9, T: 1e12 }[m[2]] : NaN; };
for (const [label, html] of [["overview", ov], ["flows", V.renderFlows(c0)], ["flows open", V.renderFlows(V.makeCtx(data, idx, parseState("open=R%3Ahyperscale&focus=openai"), stateQuery))]]) {
  const svg = (html.match(/<svg viewBox="0 0 1080[\s\S]*?<\/svg>/) || [""])[0];
  if (!svg) { problems.push(`${label}: no sankey`); continue; }
  for (const t of inner(svg, /<text class="small halo"[^>]*>([^<]*)<\/text>/g)) if (!(toUsd(t) >= 5e9)) problems.push(`${label}: sankey label under $5B: ${t}`);
  if (/stroke-dasharray|url\(#h-/.test(svg)) problems.push(`${label}: sankey uses dashes or hatching`);
  if (!/class="phone-only"><ul class="ledger">/.test(html)) problems.push(`${label}: no phone ledger`);
}
{
  const shown0 = applyFilters(c0.visible, parseState(""), idx);
  const want = shown0.filter((d) => !d.contingent && hasAmount(d)).reduce((t, d) => t + Math.max(d.amount_usd_low || 0, d.amount_usd_high || 0), 0);
  const got = sankeyEdges(c0, shown0).reduce((t, e) => t + e.v, 0);
  if (Math.abs(want - got) > 1) problems.push(`sankey widths sum to ${got}, the records give ${want}`);
}
budgets("loops", V.renderLoops(c0));
budgets("flows", V.renderFlows(c0));
budgets("changes", V.renderChanges(c0));
budgets("data", V.renderData(c0));
for (const c of data.companies) budgets(`company/${c.id}`, V.renderCompany(c0, c.id));
const foot = V.renderFoot(c0);
if ((foot.match(/<p[\s>]/g) || []).length !== 1) problems.push("footer is not one line");


// The three Overview findings (D51) are recomputed here from the bundle, independently of views.js.
{
  const { items, drift } = V.findings(c0);
  for (const d of drift) problems.push(`findings: ${d}`);
  const base = def.filter((d) => idx.companies[d.payer] && idx.companies[d.payee]);
  const hi = (d) => d.amount_usd_high ?? d.amount_usd_low ?? 0;
  const pairs = {};
  const has = (d) => d.amount_usd_low != null || d.amount_usd_high != null;
  for (const d of base) if (!d.contingent && has(d)) {
    const k = idx.companies[d.payer].layer + ">" + idx.companies[d.payee].layer;
    pairs[k] = (pairs[k] || 0) + hi(d);
  }
  const [bigKey, bigVal] = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  const paid = base.filter((d) => d.amount_basis === "paid" && has(d));
  const topPaid = Math.max(...paid.map(hi));
  const loopBack = Math.max(...data.loops.map((l) => {
    const ds = l.deals.map((id) => idx.deals[id]).filter((d) => d && d.confidence !== "rumored");
    // Kept independent of lib.js: the equity payer is first, everything else is money back.
    const eq = new Set(["equity_investment", "warrant_or_equity_grant", "jv_contribution"]);
    const cos = [...new Set(ds.flatMap((d) => [d.payer, d.payee]))];
    const first = cos.find((c) => ds.some((d) => d.payer === c && eq.has(d.type))) || cos[0];
    return ds.filter((d) => d.payer !== first && !d.contingent).reduce((t, d) => t + hi(d), 0);
  }));
  const by = Object.fromEntries(items.map((f) => [f.key, f]));
  if (by.flow?.id !== bigKey || by.flow?.value !== bigVal) problems.push(`finding 1: says ${by.flow?.id} ${by.flow?.value}, records give ${bigKey} ${bigVal}`);
  if (by.paid?.value !== topPaid || by.paid?.count !== paid.length) problems.push(`finding 2: says ${by.paid?.value} of ${by.paid?.count}, records give ${topPaid} of ${paid.length}`);
  if (by.loop?.value !== loopBack) problems.push(`finding 3: says ${by.loop?.value}, records give ${loopBack}`);
  for (const f of items) if (!ov.includes(esc(f.fig)) || !ov.includes(f.href.replace(/&/g, "&amp;"))) problems.push(`finding ${f.key} is not on the Overview`);
}

// Stylesheet rules (D49): hex colors only in the token blocks; the pop only in its five places.
{
  const css = readFileSync(new URL("../site/css/site.css", import.meta.url), "utf8");
  const outside = css.slice(0, css.indexOf("/* tokens:light */")) + css.slice(css.indexOf("/* tokens:end */"));
  const hexes = outside.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-fA-F]{3,8}\b/g);
  if (hexes) problems.push(`site.css: hex colors outside the token blocks: ${hexes.join(" ")}`);
  const POP_OK = /^(\.top|\.navin a\[aria-current="page"\]|a:hover|\.link:hover|\.more summary:hover|(a|button|summary|input|select):focus-visible|\.findings \.big|\.btn.*|:root)$/;
  for (const m of outside.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/--pop|--paid/.test(m[2])) continue;
    for (const sel of m[1].split(",").map((x) => x.trim())) {
      if (/--paid/.test(m[2]) && /^\.shape\.paid$/.test(sel)) continue;
      if (!POP_OK.test(sel)) problems.push(`site.css: the pop is used outside its five places, in ${sel}`);
    }
  }
}

// The state line (D41) is recounted from the records: Labs paying for compute.
const COMPUTE = ["hyperscale", "chip_design", "data_centers", "memory"];
const compute = data.deals.filter((d) => d.confidence !== "rumored" && idx.companies[d.payer]?.layer === "labs"
  && ["purchase_commitment", "capacity_lease"].includes(d.type) && COMPUTE.includes(idx.companies[d.payee]?.layer));
const m = /committed to (\d+) compute deals/.exec(data.state?.text || "");
if (!m || Number(m[1]) !== compute.length) problems.push(`state line says ${m?.[1]} compute deals, records give ${compute.length}`);
if (compute.some((d) => d.amount_basis === "paid") && /none is recorded as paid/.test(data.state.text)) problems.push("state line says none paid, a record is paid");

export { words, strip };
if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`render: ${problems.length} problems in ${pages} renders`);
  process.exit(1);
}
console.log(`render: ${pages} renders, 0 problems`);
