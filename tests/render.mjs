// Renders every page of the site in Node from site/data/bundle.json, with several filter
// states, and fails on a thrown error, "undefined", "NaN", an em-dash or an unbalanced tag.
// Run: node tests/render.mjs  (no packages needed)

import { readFileSync } from "node:fs";
import { index, parseState, stateQuery, applyFilters } from "../site/js/lib.js";
import * as V from "../site/js/views.js";

const data = JSON.parse(readFileSync(new URL("../site/data/bundle.json", import.meta.url)));
const idx = index(data);
const problems = [];
let pages = 0;

const STATES = ["", "conf=filed", "basis=paid", "since=12m", "layer=labs", "q=nvidia", "family=debt", "min=10",
  "own=private", "region=asia", "conf=filed,company_stated,reported,rumored", "q=zzzz", "focus=openai", "focus=nvidia&layer=labs"];

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

// Word budgets (D39). Text is what a reader sees outside the charts: no svg, title text,
// select options, the filter drawer or the F/S/R markers. A word has a letter or digit.
const strip = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<select[\s\S]*?<\/select>/g, " ")
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
budgets("loops", V.renderLoops(c0));
budgets("flows", V.renderFlows(c0));
budgets("changes", V.renderChanges(c0));
for (const c of data.companies) budgets(`company/${c.id}`, V.renderCompany(c0, c.id));
const foot = V.renderFoot(c0);
if ((foot.match(/<p[\s>]/g) || []).length !== 1) problems.push("footer is not one line");

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
