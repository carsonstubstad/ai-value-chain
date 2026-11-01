// Views: pure functions from (data, filter state) to HTML strings, built to docs/design-spec.md.
// No DOM access here, so tests/render.mjs can render every page in Node.

import {
  esc, money, amountText, highEnd, hasAmount, basisStyle, MARK, LABEL, TYPE_SHORT, FAMILY, VIEW_KEYS,
  REGION_LABEL, applyFilters, isFiltered, staleness, fmtDate, reach, layerFlows, loopView, isoWeek, weekRange, parseState,
} from "./lib.js";
import { chainHero, loopDiagram, loopBars, companyDiagram, flowsChart, amountWords } from "./charts.js";

// ctx = { data, idx, s, qs, qsWith }: qs carries the filters on every internal link; qsWith also
// keeps the page's view state (trace, open layers, picked ribbon) and changes one key.
export function makeCtx(data, idx, s, stateQuery) {
  const visible = data.deals.filter((d) => idx.companies[d.payer] && idx.companies[d.payee]);
  return {
    data, idx, s, visible, shown: applyFilters(visible, s, idx),
    qs: stateQuery({ ...s, ...VIEW_KEYS }),
    qsWith: (k, v) => stateQuery({ ...s, [k]: v }),
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fam = (ctx, id) => FAMILY[ctx.idx.companies[id].layer];
const dot = (ctx, id) => `<span class="dot ${fam(ctx, id)}" aria-hidden="true"></span>`;
const companyLink = (ctx, id) => `<a href="#/company/${esc(id)}${ctx.qs}">${esc(ctx.idx.companies[id].name)}</a>`;
const srcUrl = (ctx, d) => ctx.idx.sources[d.sources[0]]?.url || "";
const shape = (d) => `<span class="shape ${basisStyle(d)}" aria-hidden="true"></span>`;

export function amountLabel(d) {
  const { amt, kind } = amountWords(d);
  return kind && kind !== "one-time" ? `${amt}, ${kind}` : amt;
}

// Every amount links to its first source and carries its sourcing marker (D36).
const amountLink = (ctx, d) => `${shape(d)}<a class="num" href="${esc(srcUrl(ctx, d))}" target="_blank" rel="noopener">${esc(amountLabel(d))}</a><span class="mk" title="${esc(LABEL.confidence[d.confidence])}">${MARK[d.confidence]}</span>`;

// A deal row: counterparty, type, amount (D39). The summary is on hover; meta adds one grey line.
function dealRow(ctx, d, other, meta) {
  const who = other ? `${dot(ctx, other)}${companyLink(ctx, other)}` : `${dot(ctx, d.payer)}${companyLink(ctx, d.payer)} <span class="to">to</span> ${companyLink(ctx, d.payee)}`;
  const m = meta ? `<span class="rmeta">${esc([LABEL.basis[d.amount_basis], LABEL.confidence[d.confidence], LABEL.status[d.status], fmtDate(d.announced)].join(" · "))}</span>` : "";
  return `<li class="drow" title="${esc(d.summary)}"><span class="who">${who}</span><span class="ty">${esc(TYPE_SHORT[d.type])}</span><span class="amt">${amountLink(ctx, d)}</span>${m}</li>`;
}

const masthead = (ctx) => {
  const { week } = isoWeek(ctx.idx.asOf);
  return `<p class="mast">AI Value Chain · Week ${week} · data as of ${esc(fmtDate(ctx.idx.asOf))}</p>`;
};

// ---------- Filters: one line, the rest in a drawer ----------

const toggle = (group, v, label, on) =>
  `<button type="button" class="chip" data-toggle="${group}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`;
const pick = (field, v, label, on) =>
  `<button type="button" class="chip" data-set="${field}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`;
// A view switch (width, ranking) is a link styled as a chip, so the choice lives in the URL.
const viewChip = (href, label, on) => `<a class="chip" href="${href}" aria-current="${on}">${esc(label)}</a>`;
const sel = (inner) => `<span class="sel">${inner}</span>`;

// Buttons (D53): one primary per page; the quiet one sits beside it.
const ARROW = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const DOWN = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2v8M3.5 6.5 7 10l3.5-3.5M2.5 12.5h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const button = (label, href, kind = "", icon = ARROW, extra = "") => `<a class="btn${kind ? " " + kind : ""}" href="${href}"${extra}>${esc(label)}${icon}</a>`;
const options = (pairs, cur, none) =>
  `<option value="">${esc(none)}</option>` + pairs.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");

export function renderControls(ctx) {
  const { s, data } = ctx;
  const extra = [s.family, s.min, s.own, s.region, s.since !== "all" ? s.since : ""].filter(Boolean).length;
  const SHORT = { filed: "Filed", company_stated: "Stated", reported: "Reported", rumored: "Rumors" };
  return `<div class="controls" role="group" aria-label="Filters">
  <span class="grp">${["filed", "company_stated", "reported", "rumored"].map((c) => toggle("conf", c, SHORT[c], s.conf.includes(c))).join("")}</span>
  <span class="grp">${["committed", "paid"].map((b) => toggle("basis", b, LABEL.basis[b], s.basis.includes(b))).join("")}</span>
  <input id="f-q" type="search" data-field="q" value="${esc(s.q)}" placeholder="Company" aria-label="Search by company" autocomplete="off">
  <details class="more"${extra ? " open" : ""}><summary>More filters${extra ? ` (${extra})` : ""}</summary><div class="drawer">
    <span class="grp">${pick("since", "all", "Any time", s.since === "all")}${pick("since", "24m", "24 months", s.since === "24m")}${pick("since", "12m", "12 months", s.since === "12m")}</span>
    ${sel(`<select data-field="family" aria-label="Deal type">${options(data.taxonomy.deal_families.map((f) => [f.id, f.label]), s.family, "All types")}</select>`)}
    ${sel(`<select data-field="min" aria-label="Smallest amount">${options([1, 10, 50, 100].map((n) => [String(n), `$${n}B or more`]), String(s.min || ""), "Any amount")}</select>`)}
    ${sel(`<select data-field="own" aria-label="Ownership">${options(Object.entries(LABEL.ownership), s.own, "Any owner")}</select>`)}
    ${sel(`<select data-field="region" aria-label="Headquarters">${options(Object.entries(REGION_LABEL), s.region, "Anywhere")}</select>`)}
  </div></details>
  <span class="count" id="count">${countLine(ctx)}</span>
</div>`;
}

export function countLine(ctx) {
  const all = ctx.visible.filter((d) => d.confidence !== "rumored").length;
  const reset = isFiltered(ctx.s) ? ` <button type="button" class="link" data-reset>Reset</button>` : "";
  return `${ctx.shown.length} of ${all} deals${reset}`;
}

// ---------- Overview (D40) ----------

function loopViews(ctx) {
  return ctx.data.loops.map((l) => loopView(l, ctx.idx, ctx.s.conf)).filter((v) => v.closed).sort((a, b) => b.size - a.size || a.loop.name.localeCompare(b.loop.name));
}

function changeRow(ctx, e) {
  const d = ctx.idx.deals[e.deal];
  const what = { basis_change: d.amount_basis === "paid" ? "now paid" : "basis changed", status_change: "now " + LABEL.status[d.status].toLowerCase(),
    filing: "now filed", new_deal: "new", amount_change: "amount updated" }[e.kind] || "updated";
  const glyph = e.kind === "basis_change" && d.amount_basis === "paid" ? ` <span class="shape committed"></span><span class="to">to</span><span class="shape paid"></span>` : "";
  return `<li class="crow" title="${esc(e.summary)}">${dot(ctx, d.payer)}<span>${companyLink(ctx, d.payer)} <span class="to">to</span> ${companyLink(ctx, d.payee)}, <a class="num" href="${esc(ctx.idx.sources[e.sources[0]]?.url || "")}" target="_blank" rel="noopener">${esc(amountText(d))}</a> ${esc(TYPE_SHORT[d.type])}: ${what}${glyph}</span></li>`;
}

const sortedEvents = (ctx) => [...ctx.data.events].filter((e) => ctx.idx.deals[e.deal]).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

export function renderOverview(ctx) {
  // The Overview has no filters (D51): it always shows the default view, rumors hidden.
  const { data, idx, s } = ctx;
  const shown = applyFilters(ctx.visible, parseState(""), idx);
  const flows = layerFlows(shown, idx);
  const hero = chainHero(ctx, flows, { w: s.w, rib: s.rib, qs: ctx.qs, qsWith: ctx.qsWith });
  const picked = s.rib && flows.find((f) => f.key === s.rib);
  const ribPanel = picked ? `<section class="ribdeals" aria-label="Deals in the picked ribbon"><h2>${esc(idx.layers[picked.from].label)} to ${esc(idx.layers[picked.to].label)}</h2><ul class="rows">${[...picked.deals].sort((a, b) => highEnd(b) - highEnd(a)).map((d) => dealRow(ctx, d)).join("")}</ul></section>` : "";
  const loops = loopViews(ctx).slice(0, 3);
  const minis = loops.map((v) => `<div class="loop"><h3><a href="#/loops#loop-${esc(v.loop.id)}">${esc(v.loop.name)}</a></h3>${loopDiagram(ctx, v)}</div>`).join("");
  const evs = sortedEvents(ctx).slice(0, 5);
  const top = shown.filter((d) => hasAmount(d) && !d.contingent).sort((a, b) => highEnd(b) - highEnd(a) || a.id.localeCompare(b.id)).slice(0, 10);
  const pairs = {};
  for (const d of top) pairs[d.payer + d.payee] = (pairs[d.payer + d.payee] || 0) + 1;
  const topRows = top.map((d) => `<li class="frow" title="${esc(d.summary)}"><span>${companyLink(ctx, d.payer)} <span class="to">to</span> ${companyLink(ctx, d.payee)}${pairs[d.payer + d.payee] > 1 ? ` <span class="yr">${esc(d.announced.slice(0, 4))}</span>` : ""}</span><span class="amt">${amountLink(ctx, d)}</span></li>`).join("");
  const items = findings(ctx).items.map((f) => `<li><p class="big">${esc(f.fig)}</p><p>${esc(f.text)}</p><p class="ev"><a href="${esc(f.href)}">${esc(f.evid)}</a></p></li>`).join("");
  return `<header class="hero-top">${masthead(ctx)}
    <h1>Who pays whom to build AI</h1><p class="state">${esc(data.state?.text || "")}</p>
    <ul class="findings" aria-label="Three things to know">${items}</ul>
    <div class="actions">${button("Follow the money", "#/flows")}${button("Download the data", "#/data", "quiet", DOWN)}</div>
  </header>
  <section class="hero" aria-label="The chain">
    <h2>Who pays whom, by layer</h2>
    ${shown.length ? `<figure class="fig">${hero}</figure>` : `<p class="empty">No deals match these filters.</p>`}
    <p class="legend">Width: announced ceilings, not cash · hatched: caps and multi-year totals · dotted: undisclosed</p>
    ${ribPanel}
  </section>
  ${loops.length ? `<section><h2>Three largest loops</h2><div class="loops">${minis}</div></section>` : ""}
  <section><h2>What changed</h2><ul class="rows">${evs.map((e) => changeRow(ctx, e)).join("")}</ul></section>
  <section class="col"><h2>Top 10 flows</h2>${top.length ? `<ul class="rows">${topRows}</ul>` : `<p class="empty">No deals match these filters.</p>`}</section>`;
}

// ---------- The three findings (D51): computed from the records, never typed ----------

// Plain nouns for a layer as payer or payee, so a finding reads as a sentence.
const NOUN = { equipment: "equipment makers", chip_design: "chipmakers", foundry: "foundries", memory: "memory makers", systems: "system makers",
  power: "power suppliers", data_centers: "data center builders", hyperscale: "clouds", labs: "labs", applications: "app makers", capital: "investors" };
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const CEILING_KINDS = new Set(["cap", "multi_year_total"]);
const monthYear = (iso) => fmtDate(iso).split(" ").slice(1).join(" ");

export function findings(ctx) {
  const { idx } = ctx;
  const shown = applyFilters(ctx.visible, parseState(""), idx);
  const drift = [];
  const items = [];
  // 1. The largest layer flow by announced ceilings (guarantees left out, D33).
  const flow = layerFlows(shown, idx).filter((f) => f.total > 0).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))[0];
  if (flow) {
    const ceil = flow.deals.some((d) => CEILING_KINDS.has(d.amount_kind) || (d.amount_usd_high && d.amount_usd_high !== d.amount_usd_low));
    const kind = ceil ? "of announced ceilings" : flow.paid === flow.n ? "paid" : "committed";
    items.push({ key: "flow", value: flow.total, id: flow.key, fig: money(flow.total),
      text: `${cap1(NOUN[flow.from])} ${flow.paid ? "pay" : "promise"} ${NOUN[flow.to]} the chain's largest flow: ${flow.n} deals ${kind}, ${flow.paid ? `${flow.paid} paid` : "none recorded as paid"}.`,
      href: `#/?rib=${encodeURIComponent(flow.key)}`, evid: `See the ${idx.layers[flow.from].label} to ${idx.layers[flow.to].label} ribbon` });
  }
  // 2. The largest paid deal, and whether every paid deal is equity.
  const paid = shown.filter((d) => d.amount_basis === "paid" && hasAmount(d));
  const top = [...paid].sort((a, b) => highEnd(b) - highEnd(a) || a.id.localeCompare(b.id))[0];
  if (top) {
    const equity = paid.every((d) => ["equity_investment", "warrant_or_equity_grant"].includes(d.type));
    if (!equity) drift.push("not every paid deal is equity");
    const [a, b] = [idx.companies[top.payer].name, idx.companies[top.payee].name];
    const how = LABEL.confidence[top.confidence].toLowerCase();
    items.push({ key: "paid", value: highEnd(top), id: top.id, count: paid.length, fig: money(highEnd(top)),
      text: equity ? `All ${paid.length} paid deals are equity stakes; the largest is ${a}'s stake in ${b}, ${how}.`
        : `${paid.length} deals are recorded as paid; the largest is ${a} to ${b}, ${how}.`,
      href: `#/company/${encodeURIComponent(top.payee)}`, evid: `See the deal, ${a} to ${b}, ${monthYear(top.announced)}` });
  }
  // 3. The loop with the most promised back.
  const loop = ctx.data.loops.map((l) => loopView(l, idx, parseState("").conf)).filter((v) => v.closed)
    .sort((x, y) => y.backAmt - x.backAmt || y.putAmt - x.putAmt || x.loop.name.localeCompare(y.loop.name))[0];
  if (loop) {
    const backers = [...new Set(loop.back.map((d) => d.payer))];
    const who = backers.length === 1 ? idx.companies[backers[0]].name : "the others";
    const backPaid = loop.back.some((d) => d.amount_basis === "paid");
    items.push({ key: "loop", value: loop.backAmt, id: loop.loop.id, fig: money(loop.backAmt),
      text: `The largest loop is ${loop.loop.name}: ${who} promised it back against ${money(loop.putAmt)} put in, ${backPaid ? "part of it paid" : "none recorded as paid"}.`,
      href: `#/loops#loop-${loop.loop.id}`, evid: `See the ${loop.loop.name} loop` });
  }
  for (const f of items) if (f.text.split(/\s+/).length > 20) drift.push(`finding ${f.key} is over 20 words`);
  if (items.length !== 3) drift.push(`${items.length} findings, expected 3`);
  return { items, drift };
}

// ---------- Data page (D53): the bundle and a deals CSV, both rebuilt by bundle.py ----------

export function renderData(ctx) {
  const { data } = ctx;
  const epoch = data.sources.some((s) => /epoch/i.test(s.publisher || ""));
  return `${masthead(ctx)}
  <header class="col"><h1>The data behind the site</h1><p class="state">${data.deals.length} deals, ${data.companies.length} companies and ${data.sources.length} sources, every figure with its source.</p></header>
  <ul class="files">
    <li><span><span class="what">Deals, one row each</span><br><span class="meta">deals.csv · payer, payee, type, amounts, basis, sourcing, status, dates, source</span></span>${button("Download the CSV", "data/deals.csv", "", DOWN, " download")}</li>
    <li><span><span class="what">Everything the site draws</span><br><span class="meta">bundle.json · companies, deals, loops, sources, changes</span></span>${button("Download the JSON", "data/bundle.json", "quiet", DOWN, " download")}</li>
  </ul>
  <p class="meta col">Rumors are included and marked. Ranges stay as low and high; caps are never summed.${epoch ? " Some records credit Epoch AI." : ""} Data as of ${esc(fmtDate(ctx.idx.asOf))}.</p>`;
}

// ---------- Company card ----------

export function renderCompany(ctx, id) {
  const { data, idx, shown, visible } = ctx;
  const c = idx.companies[id];
  if (!c) return `${masthead(ctx)}<p class="empty">No company with that id. <a href="#/${ctx.qs}">Back to the overview</a>.</p>`;
  const bySize = (a, b) => (b.contingent ? 0 : highEnd(b)) - (a.contingent ? 0 : highEnd(a)) || a.id.localeCompare(b.id);
  const out = shown.filter((d) => d.payer === id).sort(bySize);
  const inn = shown.filter((d) => d.payee === id).sort(bySize);
  const hidden = visible.filter((d) => (d.payer === id || d.payee === id) && !shown.includes(d)).length;
  const loops = loopViews(ctx).filter((v) => v.cos.includes(id));
  const st = staleness(c.last_checked, idx.asOf, data.taxonomy.stale_days);
  const facts = [idx.layers[c.layer]?.label, LABEL.ownership[c.ownership], `HQ ${c.hq_country}`, c.tickers?.length ? c.tickers.join(", ") : "", `checked ${fmtDate(c.last_checked)}`].filter(Boolean);
  const list = (ds, side) => (ds.length ? `<ul class="rows">${ds.map((d) => dealRow(ctx, d, d[side], true)).join("")}</ul>` : `<p class="empty">None recorded.</p>`);
  const srcs = (c.sources || []).map((sid) => idx.sources[sid]).filter(Boolean).map((src) => `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.publisher || src.label)}</a>`);
  return `${masthead(ctx)}
  <header class="col"><h1>${esc(c.name)}</h1><p class="state">${esc(c.one_line)}</p>
    <p class="meta"><span class="stale ${st}" aria-hidden="true"></span>${esc(facts.join(" · "))} · <a href="#/flows?${ctx.qs ? ctx.qs.slice(1) + "&" : ""}focus=${esc(id)}">trace its money</a></p></header>
  <div id="controls"></div>
  ${hidden ? `<p class="meta">${plural(hidden, "deal is", "deals are")} hidden by the filters. <button type="button" class="link" data-reset>Reset</button></p>` : ""}
  ${out.length || inn.length ? `<figure class="fig small">${companyDiagram(ctx, id, inn, out)}</figure>` : ""}
  <section class="two">
    <div><h2>Money in <span class="n2">${inn.length}</span></h2>${list(inn, "payer")}</div>
    <div><h2>Money out <span class="n2">${out.length}</span></h2>${list(out, "payee")}</div>
  </section>
  ${loops.length ? `<section><h2>Loops</h2><div class="loops">${loops.map((v) => `<div class="loop"><h3><a href="#/loops${ctx.qs}">${esc(v.loop.name)}</a></h3><p class="line">${esc(v.loop.line)}</p>${loopDiagram(ctx, v)}</div>`).join("")}</div></section>` : ""}
  ${srcs.length ? `<p class="meta">Company sources: ${srcs.join(" · ")}</p>` : ""}`;
}

// ---------- Money flows (13d) ----------

export function renderFlows(ctx) {
  const { data, idx, s, shown } = ctx;
  const focus = s.focus && idx.companies[s.focus] ? s.focus : "";
  const down = focus ? reach(shown, focus, "down") : null;
  const up = focus ? reach(shown, focus, "up") : null;
  const lit = focus ? new Set([...down.edges, ...up.edges]) : null;
  const litNodes = focus ? new Set([focus, ...down.companies, ...up.companies]) : null;
  // A trace opens every layer it passes through, so the lit lines run company to company.
  const open = new Set(s.open);
  if (focus) for (const cid of litNodes) open.add(idx.companies[cid].layer);
  const chart = flowsChart(ctx, shown, { open, lit, litNodes, focus, na: s.na, w: s.w, qsWith: ctx.qsWith });
  const hiddenLayers = ["systems", "applications"].filter((l) => !shown.some((d) => [idx.companies[d.payer].layer, idx.companies[d.payee].layer].includes(l)));
  const companyOptions = [...data.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.id, c.name]);
  const noAmount = shown.filter((d) => !hasAmount(d)).length;
  const direct = (side) => shown.filter((d) => d[side] === focus).sort((a, b) => highEnd(b) - highEnd(a));
  const trace = focus ? `<section class="two">
    <div><h2>Money in <span class="n2">${direct("payee").length}</span></h2><ul class="rows">${direct("payee").map((d) => dealRow(ctx, d, d.payer)).join("") || ""}</ul></div>
    <div><h2>Money out <span class="n2">${direct("payer").length}</span></h2><ul class="rows">${direct("payer").map((d) => dealRow(ctx, d, d.payee)).join("") || ""}</ul></div></section>` : "";
  const all = [...shown].sort((a, b) => highEnd(b) - highEnd(a) || a.id.localeCompare(b.id));
  return `${masthead(ctx)}
  <header class="col"><h1>${focus ? `Tracing ${esc(idx.companies[focus].name)}` : "Money flows"}</h1></header>
  <div id="controls"></div>
  <p class="toggle">
    ${sel(`<select data-field="focus" aria-label="Trace a company">${options(companyOptions, focus, "Trace a company")}</select>`)}
    ${viewChip(`#/flows${ctx.qsWith("w", "")}`, "Ceilings", s.w !== "count")}${viewChip(`#/flows${ctx.qsWith("w", "count")}`, "Deal count", s.w === "count")}
    ${viewChip(`#/flows${ctx.qsWith("na", s.na ? "" : "1")}`, `${noAmount} with no amount`, !!s.na)}
    ${open.size && !focus ? `<span class="sep">|</span><a href="#/flows${ctx.qsWith("open", [])}">Close all layers</a>` : ""}${focus ? `<span class="sep">|</span><a href="#/flows${ctx.qsWith("focus", "")}">Clear the trace</a>` : ""}
  </p>
  ${shown.length ? `<figure class="fig">${chart}</figure>` : `<p class="empty">No deals match these filters.</p>`}
  <p class="legend">Above the line: paying suppliers · below: investing · click a layer to open it, a company to trace it${hiddenLayers.length ? ` · ${hiddenLayers.map((l) => idx.layers[l].label).join(" and ")} hidden, no sourced flows yet` : ""}</p>
  ${trace}
  ${focus ? "" : `<details class="list col"><summary>All ${plural(shown.length, "flow", "flows")} as a list</summary><ul class="rows">${all.map((d) => dealRow(ctx, d)).join("")}</ul></details>`}`;
}

// ---------- Loops (D35: the confidence filter only) ----------

export function renderLoops(ctx) {
  const views = loopViews(ctx);
  const deals = new Set(views.flatMap((v) => v.deals.map((d) => d.id)));
  const on = {};
  for (const v of views) for (const c of v.cos) on[c] = (on[c] || 0) + 1;
  const lead = Object.entries(on).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([c, n]) => `${ctx.idx.companies[c].name} on ${n}`);
  const cards = views.map((v) => `<article class="loop card" id="loop-${esc(v.loop.id)}"><h2>${esc(v.loop.name)}</h2><p class="line">${esc(v.loop.line)}</p>${loopDiagram(ctx, v, { W: 500, big: true, scaleMax: 250e9, wmax: 22 })}${loopBars(ctx, v, 500)}</article>`).join("");
  return `${masthead(ctx)}
  <header class="col"><h1>Loops</h1><p class="state">${views.length} loops, ${deals.size} deals${lead.length ? ", " + lead.join(", ") : ""}.</p>
  <p class="caveat">Nets are not shown: caps, ranges and multi-year totals cannot be netted against cash.</p></header>
  ${views.length ? `<div class="cards">${cards}</div>` : `<p class="empty">No loop is complete with this sourcing filter.</p>`}`;
}

// ---------- What changed ----------

export function renderChanges(ctx) {
  const { data, idx } = ctx;
  const evs = sortedEvents(ctx);
  const groups = [];
  for (const e of evs) {
    const { year, week } = isoWeek(e.date), k = `${year}-${week}`;
    if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, week, year, date: e.date, evs: [] });
    groups[groups.length - 1].evs.push(e);
  }
  const days = data.taxonomy.stale_days;
  const stale = [...data.companies, ...ctx.visible].filter((r) => staleness(r.last_checked, idx.asOf, days) !== "fresh").length;
  const latest = groups[0];
  return `${masthead(ctx)}
  <header class="col"><h1>What changed</h1>${latest ? `<p class="state">${plural(latest.evs.length, "change", "changes")} in week ${latest.week}, each dated by the filing or release behind it.</p>` : ""}</header>
  ${groups.map((g) => { const [a, b] = weekRange(g.date); return `<section class="col"><h2 class="wk">Week ${g.week} <span class="meta">${esc(fmtDate(a))} to ${esc(fmtDate(b))}</span></h2><ul class="rows">${g.evs.map((e) => changeRow(ctx, e)).join("")}</ul></section>`; }).join("") || `<p class="empty">No changes recorded yet.</p>`}
  <p class="meta">${stale ? `${plural(stale, "record has", "records have")} not been checked in over ${days.amber} days.` : `Every company and deal was checked in the last ${days.amber} days.`}</p>`;
}

export function renderFoot(ctx) {
  const { data } = ctx;
  const epoch = data.sources.some((s) => /epoch/i.test(s.publisher || ""));
  return `<p>${data.companies.length} companies · ${data.deals.length} deals · ${data.sources.length} sources${epoch ? " · some data from Epoch AI" : ""} · F filed, S stated, R reported · not investment advice · <a href="https://github.com/carsonstubstad/ai-value-chain">code and data</a></p>`;
}
