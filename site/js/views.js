// Views: pure functions from (data, filter state) to HTML strings.
// No DOM access here, so tests/render.mjs can render every page in Node.

import {
  esc, amountText, highEnd, hasAmount, isRange, LABEL, typeLabel, REGION_LABEL,
  applyFilters, isFiltered, staleness, fmtDate, largestBy, reach,
} from "./lib.js";

// ctx = { data, idx, s, qs }: qs is the filter query (no focus) carried on every internal link.
export function makeCtx(data, idx, s, stateQuery) {
  const visible = data.deals.filter((d) => idx.companies[d.payer] && idx.companies[d.payee]);
  return { data, idx, s, qs: stateQuery({ ...s, focus: "" }), visible, shown: applyFilters(visible, s, idx) };
}

const color = (ctx, id) => `var(--l-${ctx.idx.companies[id].layer})`;
const companyLink = (ctx, id) => `<a href="#/company/${esc(id)}${ctx.qs}">${esc(ctx.idx.companies[id].name)}</a>`;
const srcUrl = (ctx, d) => ctx.idx.sources[d.sources[0]]?.url || "";

export function amountLabel(d) {
  const kind = d.amount_kind && d.amount_kind !== "one_time" && hasAmount(d) ? `, ${LABEL.kind[d.amount_kind]}` : "";
  return amountText(d) + kind;
}

const amountLink = (ctx, d) => `<a href="${esc(srcUrl(ctx, d))}" target="_blank" rel="noopener" title="Open the source">${esc(amountLabel(d))}</a>`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- Filters (session 13) ----------

const chip = (group, v, label, on) =>
  `<button type="button" class="chip" data-toggle="${group}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`;
const pick = (field, v, label, on) =>
  `<button type="button" class="chip" data-set="${field}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`;
const options = (pairs, cur, none) =>
  `<option value="">${esc(none)}</option>` + pairs.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");

export function renderControls(ctx) {
  const { s, data } = ctx;
  const extra = [s.family, s.min, s.own, s.region].filter(Boolean).length;
  return `<div class="controls" role="group" aria-label="Filters">
  <div class="row">
    <span class="label">Amounts</span>
    ${["committed", "paid", "estimated"].map((b) => chip("basis", b, LABEL.basis[b], s.basis.includes(b))).join("")}
  </div>
  <div class="row">
    <span class="label">Announced</span>
    ${pick("since", "all", "Any time", s.since === "all")}${pick("since", "24m", "Last 24 months", s.since === "24m")}${pick("since", "12m", "Last 12 months", s.since === "12m")}
  </div>
  <div class="row">
    <span class="label">Sourcing</span>
    ${["filed", "company_stated", "reported", "rumored"].map((c) => chip("conf", c, LABEL.confidence[c], s.conf.includes(c))).join("")}
  </div>
  <div class="row">
    <label class="label" for="f-q">Company</label>
    <input id="f-q" type="search" data-field="q" value="${esc(s.q)}" placeholder="Search by name" autocomplete="off">
  </div>
  <details class="more"${extra ? " open" : ""}>
    <summary>More filters${extra ? ` (${extra} on)` : ""}</summary>
    <div class="row">
      <label class="label" for="f-family">Deal type</label>
      <select id="f-family" data-field="family">${options(data.taxonomy.deal_families.map((f) => [f.id, f.label]), s.family, "All types")}</select>
    </div>
    <div class="row">
      <label class="label" for="f-min">At least</label>
      <select id="f-min" data-field="min">${options([1, 10, 50, 100].map((n) => [String(n), `$${n}B (high end)`]), String(s.min || ""), "Any amount")}</select>
    </div>
    <div class="row">
      <label class="label" for="f-own">Ownership</label>
      <select id="f-own" data-field="own">${options(Object.entries(LABEL.ownership), s.own, "Any")}</select>
    </div>
    <div class="row">
      <label class="label" for="f-region">Headquarters</label>
      <select id="f-region" data-field="region">${options(Object.entries(REGION_LABEL), s.region, "Anywhere")}</select>
    </div>
  </details>
  <p class="count" id="count">${countLine(ctx)}</p>
</div>`;
}

export function countLine(ctx) {
  const n = ctx.shown.length, all = ctx.visible.filter((d) => d.confidence !== "rumored").length;
  const reset = isFiltered(ctx.s) ? ` <button type="button" class="link" data-reset>Reset filters</button>` : "";
  const layer = ctx.s.layer ? ` Layer: ${esc(ctx.idx.layers[ctx.s.layer]?.label || ctx.s.layer)}.` : "";
  return `Showing ${plural(n, "deal", "deals")} of ${all} (rumors hidden by default).${layer}${reset}`;
}

// ---------- Overview (session 11) ----------

function bars(ctx, d, max) {
  if (!hasAmount(d)) return "";
  const c = color(ctx, d.payer), w = (highEnd(d) / max) * 100, lo = ((d.amount_usd_low ?? 0) / max) * 100;
  let out = "";
  if (isRange(d) && d.amount_usd_low) out += `<span class="bar ${d.confidence}" style="--c:${c};width:${lo}%"></span>`;
  out += `<span class="bar ${isRange(d) ? "range" : d.confidence}" style="--c:${c};width:${w}%"></span>`;
  return out;
}

export function renderOverview(ctx) {
  const { data, idx, s, shown } = ctx;
  const count = (b) => shown.filter((d) => d.amount_basis === b).length;
  const undisclosed = shown.filter((d) => !hasAmount(d)).length;
  const rail = data.taxonomy.layers.map((l) => {
    const n = data.companies.filter((c) => c.layer === l.id).length;
    const k = shown.filter((d) => idx.companies[d.payer].layer === l.id || idx.companies[d.payee].layer === l.id).length;
    const on = s.layer === l.id;
    return `<button type="button" class="step${n ? "" : " dim"}" data-set="layer" data-v="${on ? "" : l.id}" aria-pressed="${on}" style="--c:var(--l-${l.id})"><b>${esc(l.label)}</b><i>${plural(n, "company", "companies")}<br>${plural(k, "deal", "deals")}</i></button>`;
  }).join("");

  const top = [...shown].sort((a, b) => highEnd(b) - highEnd(a)).slice(0, 15);
  const max = Math.max(...top.map(highEnd), 1);
  const flows = top.map((d) => `<div class="flow"><div class="who"><span class="dot" style="--c:${color(ctx, d.payer)}"></span>${companyLink(ctx, d.payer)} to ${companyLink(ctx, d.payee)}<small>${esc(d.summary)}</small></div>
    <div class="track" aria-hidden="true">${bars(ctx, d, max)}</div>
    <div class="amt">${amountLink(ctx, d)}</div></div>`).join("");

  const biggest = (side, other) => largestBy(shown, side).slice(0, 8).map(([cid, d]) =>
    `<li>${companyLink(ctx, cid)} <span class="muted">${side === "payer" ? "to" : "from"} ${esc(idx.companies[d[other]].name)}</span><span class="amt">${amountLink(ctx, d)}</span></li>`).join("");

  return `<header class="masthead">
    <div class="eyebrow">AI value chain tracker</div>
    <h1>Who pays whom to build AI</h1>
    <p class="state">${esc(data.state?.text || "")}</p>
  </header>
  <section class="stats" aria-label="Deals shown">
    <div><b>${count("committed")}</b><span>committed deals: money promised, not yet paid</span></div>
    <div><b>${count("paid")}</b><span>paid deals: money that has changed hands</span></div>
    <div><b>${undisclosed}</b><span>deals with no disclosed amount</span></div>
  </section>
  <p class="note">These are counts of deals, not dollar totals. Caps, ranges and multi-year totals are never added up as cash.</p>
  <div id="controls"></div>
  <section aria-labelledby="chain-h">
    <h2 id="chain-h" class="eyebrow">The chain, left to right. Pick a layer to filter.</h2>
    <div class="rail">${rail}</div>
  </section>
  <section aria-labelledby="flows-h">
    <h2 id="flows-h" class="eyebrow">Largest money flows, high end of each deal</h2>
    ${top.length ? `<div class="flows">${flows}</div>` : `<p class="empty">No deals match these filters.</p>`}
    ${legend()}
  </section>
  <section class="two" aria-label="Largest single deals">
    <div><h2 class="eyebrow">Largest single deal paid out</h2><ol class="ranks">${biggest("payer", "payee")}</ol></div>
    <div><h2 class="eyebrow">Largest single deal received</h2><ol class="ranks">${biggest("payee", "payer")}</ol></div>
  </section>
  <p class="note">Each company's largest single deal, never a sum. Click any amount to open its source, or a name to open the company card.</p>`;
}

const legend = () => `<p class="legend"><span class="key filed"></span>Filed with a regulator <span class="key company_stated"></span>Stated by a company <span class="key reported"></span>Reported by the press <span class="key range"></span>A range or an "up to" cap. Color shows the paying company's layer.</p>`;

// ---------- Company card (session 11) ----------

function dealItem(ctx, d, other) {
  const meta = [LABEL.basis[d.amount_basis], LABEL.confidence[d.confidence], LABEL.status[d.status], fmtDate(d.announced)];
  return `<li class="deal"><div class="head"><span class="dot" style="--c:${color(ctx, other)}"></span>${companyLink(ctx, other)} <small>${esc(typeLabel(d.type))}</small><span class="amt">${amountLink(ctx, d)}</span></div>
    <p>${esc(d.summary)}</p>
    <div class="meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</div>
    ${d.notes || d.sources.length > 1 ? `<details><summary>${d.notes ? "Notes and sources" : "Sources"}</summary>${d.notes ? `<p>${esc(d.notes)}</p>` : ""}${sourceList(ctx, d.sources)}</details>` : ""}</li>`;
}

const sourceList = (ctx, ids) => `<ul class="sources">${ids.map((id) => ctx.idx.sources[id]).filter(Boolean)
  .map((src) => `<li><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.label || src.publisher)}</a></li>`).join("")}</ul>`;

export function renderCompany(ctx, id) {
  const { data, idx, shown, visible } = ctx;
  const c = idx.companies[id];
  if (!c) return `<p class="empty">No company with that id. <a href="#/${ctx.qs}">Back to the overview</a>.</p>`;
  const out = shown.filter((d) => d.payer === id).sort((a, b) => highEnd(b) - highEnd(a));
  const inn = shown.filter((d) => d.payee === id).sort((a, b) => highEnd(b) - highEnd(a));
  const hidden = visible.filter((d) => (d.payer === id || d.payee === id) && !shown.includes(d)).length;
  const loops = data.loops.filter((l) => l.deals.some((did) => [idx.deals[did]?.payer, idx.deals[did]?.payee].includes(id)));
  const st = staleness(c.last_checked, idx.asOf, data.taxonomy.stale_days);
  const facts = [
    idx.layers[c.layer]?.label + (c.secondary?.length ? `, also ${c.secondary.map((l) => idx.layers[l]?.label).join(", ")}` : ""),
    LABEL.ownership[c.ownership], `HQ ${c.hq_country}`, c.tickers?.length ? c.tickers.join(", ") : "",
  ].filter(Boolean);
  return `<p class="crumb"><a href="#/${ctx.qs}">Overview</a></p>
  <header class="company" style="--c:var(--l-${c.layer})">
    <h1>${esc(c.name)}</h1>
    <p class="facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</p>
    <p class="one">${esc(c.one_line)}</p>
    <p class="checked"><span class="stale ${st}" title="${st === "fresh" ? "Checked recently" : st === "amber" ? "Not checked in over 90 days" : "Not checked in over 180 days"}"></span>Checked ${esc(fmtDate(c.last_checked))}. <a href="#/flows?${(ctx.qs ? ctx.qs.slice(1) + "&" : "")}focus=${esc(id)}">Trace its money in Money flows</a></p>
  </header>
  <div id="controls"></div>
  ${hidden ? `<p class="note">${plural(hidden, "deal is", "deals are")} hidden by the filters. <button type="button" class="link" data-reset>Reset filters</button></p>` : ""}
  <section class="two">
    <div><h2 class="eyebrow">Money out: ${plural(out.length, "deal", "deals")}</h2>${out.length ? `<ul class="deals">${out.map((d) => dealItem(ctx, d, d.payee)).join("")}</ul>` : `<p class="empty">None recorded.</p>`}</div>
    <div><h2 class="eyebrow">Money in: ${plural(inn.length, "deal", "deals")}</h2>${inn.length ? `<ul class="deals">${inn.map((d) => dealItem(ctx, d, d.payer)).join("")}</ul>` : `<p class="empty">None recorded.</p>`}</div>
  </section>
  ${loops.length ? `<section><h2 class="eyebrow">Money loops it is part of</h2><ul class="plain">${loops.map((l) => `<li><a href="#/loops${ctx.qs}">${esc(l.name)}</a>: ${esc(l.explanation)}</li>`).join("")}</ul></section>` : ""}
  <section><h2 class="eyebrow">Company sources</h2>${sourceList(ctx, c.sources || [])}</section>`;
}

// ---------- Money flows and trace (session 12) ----------

const DASH = { filed: "", company_stated: "8 3", reported: "3 3", rumored: "1 4" };

export function renderFlows(ctx) {
  const { data, idx, s, shown } = ctx;
  const layers = [...data.taxonomy.layers].sort((a, b) => a.order - b.order);
  const used = new Set(shown.flatMap((d) => [d.payer, d.payee]));
  if (s.focus && idx.companies[s.focus]) used.add(s.focus);
  const cols = layers.map((l) => data.companies.filter((c) => c.layer === l.id && used.has(c.id)).sort((a, b) => a.name.localeCompare(b.name)));
  const colW = 96, rowH = 38, top = 46, pad = 8, nodeW = 8;
  const rows = Math.max(1, ...cols.map((c) => c.length));
  const W = pad * 2 + colW * layers.length, H = top + rows * rowH + 16;
  const pos = {};
  cols.forEach((list, i) => list.forEach((c, r) => { pos[c.id] = { x: pad + i * colW, y: top + r * rowH + rowH / 2, col: i }; }));

  const focus = s.focus && idx.companies[s.focus] ? s.focus : "";
  const down = focus ? reach(shown, focus, "down") : null;
  const up = focus ? reach(shown, focus, "up") : null;
  const lit = focus ? new Set([...down.edges, ...up.edges]) : null;
  const litNodes = focus ? new Set([focus, ...down.companies, ...up.companies]) : null;
  const max = Math.max(...shown.map(highEnd), 1);

  const edges = [...shown].sort((a, b) => highEnd(b) - highEnd(a)).map((d) => {
    const a = pos[d.payer], b = pos[d.payee];
    const w = hasAmount(d) ? 1.5 + 9 * Math.sqrt(highEnd(d) / max) : 1;
    let path;
    if (a.col === b.col) {
      const x = a.x + nodeW, bend = 34 + Math.min(40, Math.abs(b.y - a.y) / 3);
      path = `M${x},${a.y} C${x + bend},${a.y} ${x + bend},${b.y} ${x},${b.y}`;
    } else {
      const fwd = b.col > a.col, x1 = fwd ? a.x + nodeW : a.x, x2 = fwd ? b.x : b.x + nodeW, mx = (x1 + x2) / 2;
      path = `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`;
    }
    const layer = idx.companies[d.payer].layer;
    const cls = lit ? (lit.has(d.id) ? " lit" : " faded") : "";
    const title = `${idx.companies[d.payer].name} pays ${idx.companies[d.payee].name}: ${amountLabel(d)}. ${LABEL.confidence[d.confidence]}, ${LABEL.basis[d.amount_basis].toLowerCase()}.`;
    return `<a href="${esc(srcUrl(ctx, d))}" target="_blank" rel="noopener"><path class="edge${cls}" d="${path}" stroke="var(--l-${layer})" stroke-width="${w.toFixed(1)}"${DASH[d.confidence] ? ` stroke-dasharray="${DASH[d.confidence]}"` : ""} marker-end="url(#ar-${layer})"><title>${esc(title)}</title></path></a>`;
  }).join("");

  const qsBase = ctx.qs ? ctx.qs.slice(1) + "&" : "";
  const nodes = Object.entries(pos).map(([id, p]) => {
    const c = idx.companies[id];
    const cls = litNodes ? (id === focus ? " focus" : litNodes.has(id) ? " lit" : " faded") : "";
    const href = id === focus ? `#/flows${ctx.qs}` : `#/flows?${qsBase}focus=${id}`;
    return `<a class="node${cls}" href="${esc(href)}"><rect x="${p.x}" y="${p.y - 7}" width="${nodeW}" height="14" rx="2" fill="var(--l-${c.layer})"/><text x="${p.x + nodeW + 4}" y="${p.y + 4}">${esc(c.name.length > 15 ? c.name.slice(0, 14) + "." : c.name)}</text><title>${esc(c.name)}: ${id === focus ? "clear the trace" : "trace its money"}</title></a>`;
  }).join("");

  const heads = layers.map((l, i) => `<text class="colhead" x="${pad + i * colW}" y="20">${esc(l.label)}</text><line x1="${pad + i * colW}" x2="${pad + i * colW + colW - 12}" y1="28" y2="28" stroke="var(--l-${l.id})" stroke-width="3"/>`).join("");
  const markers = layers.map((l) => `<marker id="ar-${l.id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--l-${l.id})"/></marker>`).join("");

  const companyOptions = [...data.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.id, c.name]);
  return `<header><div class="eyebrow">Money flows</div><h1>Follow the money from payer to payee</h1>
    <p class="lede">Each line is one deal, drawn from the company that pays to the company that is paid. Thicker lines are bigger deals at the high end. Pick a company to trace where its money goes and where it comes from.</p></header>
  <div id="controls"></div>
  <div class="row trace"><label class="label" for="f-focus">Trace</label><select id="f-focus" data-field="focus">${options(companyOptions, focus, "Pick a company")}</select>${focus ? ` <button type="button" class="link" data-set="focus" data-v="">Clear</button>` : ""}</div>
  ${shown.length ? `<div class="chart" tabindex="0" aria-label="Money flow chart, scrolls sideways on small screens"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${plural(shown.length, "deal", "deals")} drawn between ${Object.keys(pos).length} companies across the chain"><defs>${markers}</defs>${heads}<g>${edges}</g><g>${nodes}</g></svg></div>` : `<p class="empty">No deals match these filters.</p>`}
  <p class="legend"><svg width="34" height="8" aria-hidden="true"><line x1="0" x2="34" y1="4" y2="4" class="lkey"/></svg>Filed <svg width="34" height="8" aria-hidden="true"><line x1="0" x2="34" y1="4" y2="4" class="lkey" stroke-dasharray="8 3"/></svg>Company-stated <svg width="34" height="8" aria-hidden="true"><line x1="0" x2="34" y1="4" y2="4" class="lkey" stroke-dasharray="3 3"/></svg>Reported. A hairline means no amount was disclosed. Color shows the paying company's layer. Click a line to open its source.</p>
  ${focus ? traceLists(ctx, focus, down, up) : ""}
  <details class="list"><summary>All ${plural(shown.length, "flow", "flows")} as a list</summary><ul class="deals">${[...shown].sort((a, b) => highEnd(b) - highEnd(a)).map((d) => `<li class="deal"><div class="head">${companyLink(ctx, d.payer)} to ${companyLink(ctx, d.payee)}<span class="amt">${amountLink(ctx, d)}</span></div><div class="meta"><span>${esc(typeLabel(d.type))}</span><span>${esc(LABEL.basis[d.amount_basis])}</span><span>${esc(LABEL.confidence[d.confidence])}</span></div></li>`).join("")}</ul></details>`;
}

function traceLists(ctx, focus, down, up) {
  const { idx, shown } = ctx;
  const name = idx.companies[focus].name;
  const direct = (side) => shown.filter((d) => d[side] === focus).sort((a, b) => highEnd(b) - highEnd(a));
  const further = (r, firstHop) => {
    const names = [...r.companies].filter((c) => !firstHop.has(c)).sort((a, b) => idx.companies[a].name.localeCompare(idx.companies[b].name)).map((c) => companyLink(ctx, c));
    return names.length > 12 ? [...names.slice(0, 12), `${names.length - 12} more`] : names;
  };
  const outD = direct("payer"), inD = direct("payee");
  const outFurther = further(down, new Set(outD.map((d) => d.payee)));
  const inFurther = further(up, new Set(inD.map((d) => d.payer)));
  const list = (ds, other) => ds.length ? `<ul class="deals">${ds.map((d) => dealItem(ctx, d, d[other])).join("")}</ul>` : `<p class="empty">None recorded.</p>`;
  return `<section class="two">
    <div><h2 class="eyebrow">Where ${esc(name)}'s money goes</h2>${list(outD, "payee")}${outFurther.length ? `<p class="note">Further down the chain, that money can reach ${outFurther.join(", ")}.</p>` : ""}</div>
    <div><h2 class="eyebrow">Where ${esc(name)}'s money comes from</h2>${list(inD, "payer")}${inFurther.length ? `<p class="note">Further up the chain, it starts with ${inFurther.join(", ")}.</p>` : ""}</div>
  </section>
  <p class="note">The trace shows who is connected, not how much passes through. Amounts are never added along a path, because caps and multi-year totals are not cash.</p>`;
}

// ---------- Loops (session 13) ----------

export function netText(loop, ctx) {
  const ds = loop.deals.map((id) => ctx.idx.deals[id]).filter(Boolean);
  const cos = [...new Set(ds.flatMap((d) => [d.payer, d.payee]))];
  const why = [];
  if (cos.length !== 2) why.push("it runs through three companies");
  if (ds.some((d) => !hasAmount(d))) why.push("at least one deal has no disclosed amount");
  if (ds.some((d) => hasAmount(d) && isRange(d))) why.push("at least one amount is a range or a cap");
  if (ds.some((d) => hasAmount(d) && ["multi_year_total", "annual_run_rate"].includes(d.amount_kind))) why.push("at least one deal is spread over years");
  const joined = why.length > 1 ? why.slice(0, -1).join(", ") + " and " + why[why.length - 1] : why[0];
  if (why.length) return { net: null, why: `No net figure, because ${joined}.` };
  const [a, b] = cos;
  const sum = (p) => ds.filter((d) => d.payer === p).reduce((t, d) => t + highEnd(d), 0);
  const n = sum(a) - sum(b);
  const [from, to] = n >= 0 ? [a, b] : [b, a];
  return { net: Math.abs(n), why: `On net, ${ctx.idx.companies[from].name} pays ${ctx.idx.companies[to].name} ${amountText({ amount_usd_low: Math.abs(n), amount_usd_high: Math.abs(n) })}, since every deal here is a one-time, fixed amount.` };
}

export function renderLoops(ctx) {
  const { data, idx } = ctx;
  const loops = [...data.loops].sort((a, b) => a.name.localeCompare(b.name));
  const cards = loops.map((l) => {
    const ds = l.deals.map((id) => idx.deals[id]).filter(Boolean);
    const cos = [...new Set(ds.flatMap((d) => [d.payer, d.payee]))];
    const rows = ds.map((d) => `<li><span class="dot" style="--c:${color(ctx, d.payer)}"></span>${companyLink(ctx, d.payer)} to ${companyLink(ctx, d.payee)}: ${esc(typeLabel(d.type).toLowerCase())}<span class="amt">${amountLink(ctx, d)}</span><div class="meta"><span>${esc(LABEL.basis[d.amount_basis])}</span><span>${esc(LABEL.confidence[d.confidence])}</span><span>${esc(LABEL.status[d.status])}</span></div></li>`).join("");
    return `<article class="card" id="loop-${esc(l.id)}"><h2>${esc(l.name)}</h2><p>${esc(l.explanation)}</p><ul class="loopdeals">${rows}</ul><p class="note">${esc(netText(l, ctx).why)} ${cos.length} companies, ${plural(ds.length, "deal", "deals")}, each shown gross.</p></article>`;
  }).join("");
  return `<header><div class="eyebrow">Loops</div><h1>Where money goes out and comes back</h1>
    <p class="lede">A loop is a set of deals where each company both pays and is paid by the others, such as an investor whose cash returns as a cloud or chip order. Both sides are shown in full. Loops leave out rumors and deals that ended, and they ignore the filters.</p></header>
  <div class="cards">${cards}</div>`;
}

// ---------- What changed (session 13) ----------

export function renderChanges(ctx) {
  const { data, idx } = ctx;
  const events = [...data.events].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const KIND = { new_deal: "New deal", amount_change: "Amount changed", basis_change: "Basis changed", status_change: "Status changed", filing: "Filing update", other: "Update" };
  const kindLabel = (e) => (e.kind === "basis_change" && idx.deals[e.deal]?.amount_basis === "paid" ? "Now paid" : KIND[e.kind] || "Update");
  const ev = events.map((e) => {
    const src = idx.sources[e.sources[0]];
    const who = e.companies.filter((c) => idx.companies[c]).map((c) => companyLink(ctx, c)).join(" and ");
    return `<li class="event"><time datetime="${esc(e.date)}">${esc(fmtDate(e.date))}</time><div><b>${esc(kindLabel(e))}</b> <span class="muted">${who}</span><p>${esc(e.summary)}${src ? ` <a href="${esc(src.url)}" target="_blank" rel="noopener">Source</a>` : ""}</p></div></li>`;
  }).join("");
  const newest = ctx.visible.filter((d) => d.confidence !== "rumored").sort((a, b) => b.announced.localeCompare(a.announced)).slice(0, 10)
    .map((d) => `<li class="event"><time datetime="${esc(d.announced)}">${esc(fmtDate(d.announced))}</time><div>${companyLink(ctx, d.payer)} to ${companyLink(ctx, d.payee)}<span class="amt">${amountLink(ctx, d)}</span><p>${esc(d.summary)}</p></div></li>`).join("");
  const days = data.taxonomy.stale_days;
  const stale = [...data.companies.map((c) => ["company", c]), ...ctx.visible.map((d) => ["deal", d])]
    .map(([k, r]) => [k, r, staleness(r.last_checked, idx.asOf, days)]).filter(([, , st]) => st !== "fresh");
  const total = data.companies.length + ctx.visible.length;
  return `<header><div class="eyebrow">What changed</div><h1>Recent changes to the record</h1>
    <p class="lede">Each change is dated by the filing or release that caused it. Data as of ${esc(fmtDate(idx.asOf))}.</p></header>
  <section><h2 class="eyebrow">Changes, newest first</h2>${events.length ? `<ol class="events">${ev}</ol>` : `<p class="empty">No changes recorded yet.</p>`}</section>
  <section><h2 class="eyebrow">Newest deals by announcement date</h2><ol class="events">${newest}</ol></section>
  <section><h2 class="eyebrow">How fresh the record is</h2><p>${stale.length ? `${plural(stale.length, "record has", "records have")} not been checked in over ${days.amber} days: ${stale.map(([k, r]) => k === "company" ? companyLink(ctx, r.id) : esc(r.summary)).join("; ")}.` : `All ${total} companies and deals were checked within the last ${days.amber} days.`}</p></section>`;
}

export function renderFoot(ctx) {
  const { data } = ctx;
  const epoch = data.sources.some((s) => /epoch/i.test(s.publisher || ""));
  return `<p>${data.companies.length} companies, ${data.deals.length} deals, ${data.sources.length} sources. Data as of ${esc(fmtDate(ctx.idx.asOf))}.${epoch ? " Some data from Epoch AI." : ""}</p>
  <p>Every amount links to its source. Figures are as filed, stated or reported, never estimated by this site. Not investment advice. <a href="https://github.com/carsonstubstad/ai-value-chain">Source code and data</a>.</p>`;
}
