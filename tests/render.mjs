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

// Every loop gets either a net figure or a reason there is none.
const ctx0 = V.makeCtx(data, idx, parseState(""), stateQuery);
for (const l of data.loops) if (!V.netText(l, ctx0).why) problems.push(`loop ${l.id}: no net text`);

if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`render: ${problems.length} problems in ${pages} renders`);
  process.exit(1);
}
console.log(`render: ${pages} renders, 0 problems`);
