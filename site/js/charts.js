// SVG builders for the design in docs/design-spec.md: the two-way chain (D40), loop diagrams,
// the company in and out diagram and the money flows chart. Pure functions returning strings.

import { esc, money, amountText, highEnd, hasAmount, basisStyle, MARK, LABEL, TYPE_SHORT, FAMILY, CHAIN } from "./lib.js";

const f1 = (n) => (Math.round(n * 10) / 10).toString();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fam = (layer) => FAMILY[layer] || "hw";
const col = (layer) => `var(--${fam(layer)})`;
const tip = (a, b) => `<title>${esc(a)}${b ? "\n" + esc(b) : ""}</title>`;

export const HATCH = `<defs>${["hw", "infra", "model", "cap"].map((f) =>
  `<pattern id="h-${f}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--paper)"/><rect width="2.2" height="5" fill="var(--${f})"/></pattern>`).join("")}</defs>`;

// A cubic arc from x1 to x2 on the line y0, bulging up or down by about `depth`.
const arc = (x1, x2, y0, depth, up) => {
  const c = y0 + (up ? -1 : 1) * depth * 1.33;
  return `M${f1(x1)} ${f1(y0)} C${f1(x1)} ${f1(c)} ${f1(x2)} ${f1(c)} ${f1(x2)} ${f1(y0)}`;
};

// The first share t of a one-segment cubic path, for paid to date.
function partOf(path, t) {
  const n = path.match(/-?[0-9.]+/g).map(Number);
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p0 = [n[0], n[1]], p1 = [n[2], n[3]], p2 = [n[4], n[5]], p3 = [n[6], n[7]];
  const q0 = L(p0, p1), q1 = L(p1, p2), q2 = L(p2, p3), r0 = L(q0, q1), r1 = L(q1, q2), e = L(r0, r1);
  return `M${p0.map(f1).join(" ")} C${[...q0, ...r0, ...e].map(f1).join(" ")}`;
}

// One deal drawn along a path by basis (D36): paid solid, committed outline, cap or range dashed
// outline, paid to date as a fill inside the outline, guarantees as a grey outline, no amount dotted.
export function mark(path, layer, w, d) {
  const c = col(layer);
  if (!w) return `<path d="${path}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2 3"/>`;
  const st = basisStyle(d);
  if (st === "paid") return `<path d="${path}" fill="none" stroke="${c}" stroke-width="${f1(w)}"/>`;
  w = Math.max(w, 5);
  const k = st === "contingent" ? "var(--muted)" : c;
  let s = `<path d="${path}" fill="none" stroke="${k}" stroke-width="${f1(w)}"${st === "cap" ? ' stroke-dasharray="5 3"' : ""}/>`
    + `<path d="${path}" fill="none" stroke="var(--paper)" stroke-width="${f1(w - 2.6)}"/>`
    + `<path d="${path}" fill="none" stroke="${k}" stroke-width="${f1(w - 2.6)}" opacity=".14"/>`;
  const top = highEnd(d);
  if (d.paid_to_date_usd && top) s += `<path d="${partOf(path, Math.min(1, d.paid_to_date_usd / top))}" fill="none" stroke="${k}" stroke-width="${f1(w - 2.6)}"/>`;
  return s;
}

// Amount words for a label: "$11.8B of $13B paid", "$38B multi-year", "up to $100B", "undisclosed".
export function amountWords(d) {
  if (d.paid_to_date_usd && highEnd(d)) return { amt: `${money(d.paid_to_date_usd)} of ${money(highEnd(d))} paid`, kind: "" };
  const amt = amountText(d);
  const kind = !hasAmount(d) || d.amount_kind === "cap" || d.amount_kind === "undisclosed" ? "" : LABEL.kind[d.amount_kind] || "";
  return { amt, kind };
}

const label = (x, y, d, anchor = "middle", size) => {
  const { amt, kind } = amountWords(d);
  return `<text class="n halo" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"${size ? ` style="font-size:${size}px"` : ""}>${esc(amt)}${kind ? `<tspan class="lab" dx="4">${esc(kind)}</tspan>` : ""}<tspan class="mk" dx="4">${MARK[d.confidence]}</tspan></text>`;
};

const dealTip = (ctx, d) => tip(`${ctx.idx.companies[d.payer].name} to ${ctx.idx.companies[d.payee].name}, ${amountText(d)}`,
  `${TYPE_SHORT[d.type]}, ${LABEL.basis[d.amount_basis].toLowerCase()}, ${LABEL.confidence[d.confidence].toLowerCase()}`);

// ---------- The two-way chain (D40) ----------

export function chainHero(ctx, flows, opts = {}) {
  const { idx, data, shown } = ctx;
  const W = 1080, cw = W / CHAIN.length, WMAX = 22;
  const cx = Object.fromEntries(CHAIN.map((l, i) => [l, cw * i + cw / 2]));
  const deg = {}, layerDeg = {};
  for (const d of shown) {
    for (const c of [d.payer, d.payee]) deg[c] = (deg[c] || 0) + 1;
    for (const l of [idx.companies[d.payer].layer, idx.companies[d.payee].layer]) layerDeg[l] = (layerDeg[l] || 0) + 1;
  }
  const byCount = opts.w === "count";
  const vmax = Math.max(1, ...flows.map((f) => (byCount ? f.n : f.total)));
  const width = (f) => (byCount ? Math.max(1.6, (WMAX * f.n) / vmax) : f.total ? Math.max(1.6, (WMAX * f.total) / vmax) : 0);
  const parts = [HATCH];

  // Company chips: dot area by degree; benched companies muted (D34).
  let chipsBottom = 0;
  CHAIN.forEach((l, i) => {
    const x0 = cw * i + 6;
    parts.push(`<text class="layer" x="${f1(x0)}" y="14">${esc(idx.layers[l].label)}</text>`);
    const cs = data.companies.filter((c) => c.layer === l).sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0) || a.name.localeCompare(b.name));
    let y = 36;
    if (!cs.some((c) => deg[c.id])) {
      parts.push(`<text class="bench" x="${f1(x0)}" y="${y}">tracked, no</text><text class="bench" x="${f1(x0)}" y="${y + 14}">sourced flows yet</text>`);
      y += 34;
    }
    for (const c of cs) {
      const k = deg[c.id] || 0;
      const href = `#/company/${esc(c.id)}${opts.qs || ""}`;
      if (k) parts.push(`<a href="${href}" class="chip-a">${tip(c.name, plural(k, "deal", "deals"))}<circle cx="${f1(x0 + 4)}" cy="${y - 4}" r="${f1(2.2 + 1.1 * Math.sqrt(k))}" fill="${col(l)}"/><text class="chip" x="${f1(x0 + 12)}" y="${y}">${esc(c.name)}</text></a>`);
      else parts.push(`<a href="${href}" class="chip-a">${tip(c.name, "No sourced deal yet")}<text class="bench" x="${f1(x0 + 12)}" y="${y}">${esc(c.name)}</text></a>`);
      y += 19;
    }
    chipsBottom = Math.max(chipsBottom, y);
  });

  const isUp = (f) => CHAIN.indexOf(f.to) < CHAIN.indexOf(f.from);
  const depthOf = (f) => Math.min(150, 14 + 0.26 * Math.abs(cx[f.to] - cx[f.from]));
  const chainFlows = flows.filter((f) => f.from !== "capital" && f.to !== "capital");
  const upMax = Math.max(40, ...chainFlows.filter(isUp).map((f) => depthOf(f) + width(f)));
  const lowMax = Math.max(40, ...chainFlows.filter((f) => !isUp(f)).map((f) => depthOf(f) + width(f)));
  const y0 = chipsBottom + 26 + upMax;
  const railY = y0 + lowMax + 34;
  parts.push(`<line x1="0" x2="${W}" y1="${f1(y0)}" y2="${f1(y0)}" stroke="var(--ink-2)"/>`);
  parts.push(`<text class="lab" x="0" y="${f1(y0 - upMax + 4)}">paying suppliers, right to left</text>`);
  parts.push(`<text class="lab" x="0" y="${f1(y0 + lowMax - 2)}">investing, left to right</text>`);

  const labels = [];
  const ribbonLink = (f) => `#/${opts.page || ""}${opts.qsWith ? opts.qsWith("rib", opts.rib === f.key ? "" : f.key) : ""}`;
  const ribbonTip = (f) => tip(`${idx.layers[f.from].label} to ${idx.layers[f.to].label}: ${plural(f.n, "deal", "deals")}`,
    f.total ? `${money(f.total)} in announced ceilings, ${f.paid} paid${f.contingent ? `; ${plural(f.contingent, "guarantee", "guarantees")} not in the width` : ""}` : "No amount disclosed");
  const dim = (f) => (opts.rib && opts.rib !== f.key ? ' opacity=".25"' : "");

  for (const f of [...chainFlows].sort((a, b) => Math.abs(cx[b.to] - cx[b.from]) - Math.abs(cx[a.to] - cx[a.from]))) {
    let a = cx[f.from], z = cx[f.to];
    if (f.from === f.to) { a -= 18; z += 18; }
    const up = isUp(f), depth = depthOf(f), w = width(f);
    let g = "";
    if (!w) g = `<path d="${arc(a, z, y0, depth, up)}" fill="none" stroke="${col(f.from)}" stroke-width="1" stroke-dasharray="2 3"/>`;
    else {
      const wc = byCount ? w : (w * f.cash) / f.total, wh = w - wc;
      if (wh > 0.05) g += `<path d="${arc(a, z, y0, depth + wc / 2, up)}" fill="none" stroke="url(#h-${fam(f.from)})" stroke-width="${f1(wh)}"/>`;
      if (wc > 0.05) g += `<path d="${arc(a, z, y0, depth - wh / 2, up)}" fill="none" stroke="${col(f.from)}" stroke-width="${f1(wc)}"/>`;
      // A wider invisible stroke makes thin ribbons easy to click.
      g += `<path d="${arc(a, z, y0, depth, up)}" fill="none" stroke="transparent" stroke-width="${f1(Math.max(12, w + 6))}"/>`;
    }
    parts.push(`<a href="${ribbonLink(f)}" class="rib"${dim(f)}>${ribbonTip(f)}${g}</a>`);
    if ((byCount ? f.n >= 5 : f.total >= 20e9)) labels.push([(a + z) / 2, y0 + (up ? -1 : 1) * (depth + w / 2 + 8) + (up ? 0 : 10), f]);
  }
  for (const l of CHAIN) {
    const k = layerDeg[l] || 0;
    parts.push(k ? `<circle cx="${f1(cx[l])}" cy="${f1(y0)}" r="${f1(3 + 1.6 * Math.sqrt(k))}" fill="${col(l)}" stroke="var(--paper)" stroke-width="2"/>`
      : `<circle cx="${f1(cx[l])}" cy="${f1(y0)}" r="3" fill="var(--paper)" stroke="var(--muted)"/>`);
  }
  // Capital rail with ribbons rising into the layers it funds.
  parts.push(`<line x1="0" x2="${W}" y1="${f1(railY)}" y2="${f1(railY)}" stroke="var(--cap)" stroke-width="3"/>`);
  const capCos = data.companies.filter((c) => c.layer === "capital").sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0) || a.name.localeCompare(b.name));
  parts.push(`<text class="layer" x="0" y="${f1(railY + 20)}">${esc(idx.layers.capital.label)}</text>`);
  let rx = 64;
  for (const c of capCos) {
    const t = c.name, w = t.length * 6.2 + 14;
    parts.push(`<a href="#/company/${esc(c.id)}${opts.qs || ""}" class="chip-a">${tip(t, plural(deg[c.id] || 0, "deal", "deals"))}<text class="${deg[c.id] ? "chip" : "bench"}" x="${f1(rx)}" y="${f1(railY + 20)}">${esc(t)}</text></a>`);
    rx += w;
  }
  for (const f of flows.filter((f) => f.from === "capital" || f.to === "capital")) {
    const other = f.from === "capital" ? f.to : f.from;
    if (!(other in cx)) continue;
    const x = cx[other] + (f.from === "capital" ? 14 : -14), w = width(f), h = railY - y0 - 8;
    let g = "";
    if (!w) g = `<line x1="${f1(x)}" x2="${f1(x)}" y1="${f1(railY)}" y2="${f1(y0 + 8)}" stroke="${col(f.from)}" stroke-width="1" stroke-dasharray="2 3"/>`;
    else {
      const wc = byCount ? w : (w * f.cash) / f.total, wh = w - wc;
      if (wc > 0.05) g += `<rect x="${f1(x - w / 2)}" y="${f1(y0 + 8)}" width="${f1(wc)}" height="${f1(h)}" fill="${col(f.from)}"/>`;
      if (wh > 0.05) g += `<rect x="${f1(x - w / 2 + wc)}" y="${f1(y0 + 8)}" width="${f1(wh)}" height="${f1(h)}" fill="url(#h-${fam(f.from)})"/>`;
    }
    g += `<rect x="${f1(x - 7)}" y="${f1(y0 + 8)}" width="14" height="${f1(h)}" fill="transparent"/>`;
    parts.push(`<a href="${ribbonLink(f)}" class="rib"${dim(f)}>${ribbonTip(f)}${g}</a>`);
    if (byCount ? f.n >= 5 : f.total >= 20e9) labels.push([x + w / 2 + 4, railY - 10, f, "start"]);
  }
  const placed = [];
  for (const [x, y0l, f, anchor] of labels.sort((a, b) => a[1] - b[1])) {
    let y = y0l;
    while (placed.some(([px, py]) => Math.abs(x - px) < 100 && Math.abs(y - py) < 16)) y += 16;
    placed.push([x, y]);
    const v = byCount ? plural(f.n, "deal", "deals") : money(f.total);
    parts.push(`<text class="n halo" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor || "middle"}">${esc(v)}${byCount ? "" : `<tspan class="lab" dx="4">${plural(f.n, "deal", "deals")}</tspan>`}</text>`);
  }
  return `<svg viewBox="0 0 ${W} ${Math.round(railY + 30)}" role="img" aria-label="The AI value chain on one line: payments to suppliers arc above, investment arcs below, Capital along the bottom">${parts.join("")}</svg>`;
}

// ---------- Loops ----------

// Two companies: A left, B right, top arcs A to B, bottom arcs B to A, one arc per deal.
// Three companies: a triangle with one curved arc per deal.
export function loopDiagram(ctx, v, opts = {}) {
  const { idx } = ctx;
  const big = !!opts.big, W = opts.W || 340, fs = big ? 1.25 : 1;
  const scale = opts.scaleMax || 250e9, wmax = opts.wmax || 14;
  const wOf = (d) => (hasAmount(d) ? Math.max(basisStyle(d) === "paid" ? 2 : 5, (wmax * highEnd(d)) / scale) : 0);
  const name = (c) => idx.companies[c].name;
  if (v.cos.length === 2) {
    const [a, b] = v.cos, pad = big ? 96 : 78, xa = pad, xb = W - pad;
    const side = (p) => v.deals.filter((d) => d.payer === p).sort((x, y) => highEnd(x) - highEnd(y));
    const stack = (ds, up) => {
      const marks = [], labs = [];
      let depth = 18 * fs;
      for (const d of ds) {
        const w = wOf(d);
        depth += w / 2;
        const p = arc(xa, xb, 0, depth, up);
        marks.push(`<g>${dealTip(ctx, d)}${mark(p, idx.companies[d.payer].layer, w, d)}</g>`);
        labs.push(label(W / 2, up ? -depth - w / 2 - 3 : depth + w / 2 + 13 * fs, d, "middle", Math.round(13 * fs)));
        depth += w / 2 + 15 * fs;
      }
      return { marks, labs, depth };
    };
    const t = stack(side(a), true), btm = stack(side(b), false);
    const yc = t.depth + 18, H = yc + btm.depth + 8;
    const ends = [[xa, a, "end"], [xb, b, "start"]].map(([x, c, anc]) =>
      `<circle cx="${x}" cy="0" r="${f1(4.5 * fs)}" fill="${col(idx.companies[c].layer)}"/><text class="layer" x="${x + (anc === "end" ? -9 : 9)}" y="4" text-anchor="${anc}"${big ? ' style="font-size:15px"' : ""}>${esc(name(c))}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${Math.round(H)}" role="img" aria-label="${esc(v.loop.name)}">${HATCH}<g transform="translate(0 ${f1(yc)})">${t.marks.join("")}${btm.marks.join("")}${t.labs.join("")}${btm.labs.join("")}${ends}</g></svg>`;
  }
  // Triangle: first company top left, second top right, third at the bottom.
  const H = big ? 330 : 250, P = {};
  const pts = [[W * 0.2, 46], [W * 0.8, 46], [W * 0.5, H - 46]];
  v.cos.slice(0, 3).forEach((c, i) => { P[c] = pts[i]; });
  const pairs = {};
  for (const d of v.deals) (pairs[d.payer + ">" + d.payee] ||= []).push(d);
  const marks = [], labs = [];
  for (const ds of Object.values(pairs)) {
    ds.sort((x, y) => highEnd(x) - highEnd(y));
    let bend = 16;
    for (const d of ds) {
      const [x1, y1] = P[d.payer], [x2, y2] = P[d.payee], w = wOf(d);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const nx = dy / len, ny = -dx / len; // left of travel, so the two directions part
      bend += w / 2;
      const c1 = [mx + nx * bend * 1.6, my + ny * bend * 1.6];
      const p = `M${f1(x1)} ${f1(y1)} C${f1(c1[0])} ${f1(c1[1])} ${f1(c1[0])} ${f1(c1[1])} ${f1(x2)} ${f1(y2)}`;
      marks.push(`<g>${dealTip(ctx, d)}${mark(p, idx.companies[d.payer].layer, w, d)}</g>`);
      labs.push(label(mx + nx * (bend * 1.2 + 10), my + ny * (bend * 1.2 + 10) + 4, d, "middle", Math.round(12 * fs)));
      bend += w / 2 + 14;
    }
  }
  const ends = v.cos.slice(0, 3).map((c) => { const [x, y] = P[c]; const below = y > H / 2;
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4.5 * fs)}" fill="${col(idx.companies[c].layer)}"/><text class="layer" x="${f1(x)}" y="${f1(below ? y + 22 : y - 12)}" text-anchor="middle">${esc(name(c))}</text>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(v.loop.name)}">${HATCH}${marks.join("")}${labs.join("")}${ends}</svg>`;
}

// Stacked bars on one scale, one per company, segmented by deal. A comparison, never a net.
export function loopBars(ctx, v, W = 640) {
  const { idx } = ctx;
  const rows = v.cos.map((c, i) => {
    const ds = v.deals.filter((d) => d.payer === c && hasAmount(d)).sort((x, y) => highEnd(y) - highEnd(x));
    const promised = ds.length && ds.every((d) => d.amount_basis !== "paid");
    const lab = v.cos.length === 2 && i === 1 ? `${idx.companies[c].name} ${promised ? "promised back" : "paid back"}` : `${idx.companies[c].name} put in`;
    return { c, ds, lab, none: v.deals.filter((d) => d.payer === c && !hasAmount(d)).length };
  });
  const vmax = Math.max(1, ...rows.map((r) => r.ds.reduce((t, d) => t + highEnd(d), 0)));
  return rows.map((r) => {
    let x = 0;
    const segs = r.ds.map((d) => {
      const w = (W * highEnd(d)) / vmax, layer = idx.companies[d.payer].layer, st = basisStyle(d);
      const k = st === "contingent" ? "var(--muted)" : col(layer);
      let s = st === "paid" ? `<rect x="${f1(x)}" y="0" width="${f1(Math.max(1, w - 2))}" height="22" fill="${k}"/>`
        : `<rect x="${f1(x + 0.75)}" y="0.75" width="${f1(Math.max(1, w - 3.5))}" height="20.5" fill="none" stroke="${k}" stroke-width="1.5"${st === "cap" ? ' stroke-dasharray="5 3"' : ""}/>`;
      if (st !== "paid" && d.paid_to_date_usd) s += `<rect x="${f1(x + 2.5)}" y="2.5" width="${f1(Math.max(0, (w - 7) * Math.min(1, d.paid_to_date_usd / highEnd(d))))}" height="17" fill="${k}"/>`;
      const out = `<g>${dealTip(ctx, d)}${s}${w > 70 ? label(x, 40, d, "start") : ""}</g>`;
      x += w;
      return out;
    }).join("");
    const none = r.none ? `<span class="meta"> plus ${plural(r.none, "deal", "deals")} with no amount</span>` : "";
    return `<p class="meta barlab">${esc(r.lab)}${none}</p>${r.ds.length ? `<svg class="bar" viewBox="0 0 ${W} 46" role="img" aria-label="${esc(r.lab)}">${HATCH}${segs}</svg>` : ""}`;
  }).join("");
}

// ---------- Company card: money in on the left, money out on the right, top 5 each ----------

export function companyDiagram(ctx, id, inn, out) {
  const { idx } = ctx;
  const W = 640, cx = W / 2, top5 = (ds) => ds.slice(0, 5);
  const li = top5(inn), lo = top5(out), rows = Math.max(li.length, lo.length, 1);
  const H = 26 + rows * 34, cy = H / 2;
  const vmax = Math.max(1, ...[...li, ...lo].map(highEnd));
  const wOf = (d) => (hasAmount(d) ? Math.max(basisStyle(d) === "paid" ? 2 : 5, (12 * highEnd(d)) / vmax) : 0);
  const side = (ds, left) => ds.map((d, i) => {
    const other = left ? d.payer : d.payee, y = 20 + i * 34 + (rows - ds.length) * 17;
    const x = left ? 150 : W - 150;
    const p = left ? `M${x} ${y} C${f1((x + cx) / 2)} ${y} ${f1((x + cx) / 2)} ${f1(cy)} ${cx - 8} ${f1(cy)}`
      : `M${cx + 8} ${f1(cy)} C${f1((x + cx) / 2)} ${f1(cy)} ${f1((x + cx) / 2)} ${y} ${x} ${y}`;
    const o = idx.companies[other];
    return `<g>${dealTip(ctx, d)}${mark(p, idx.companies[d.payer].layer, wOf(d), d)}</g>`
      + `<a href="#/company/${esc(other)}${ctx.qs}" class="chip-a"><text class="chip" x="${left ? x - 8 : x + 8}" y="${y - 3}" text-anchor="${left ? "end" : "start"}">${esc(o.name)}</text></a>`
      + label(left ? x - 8 : x + 8, y + 12, d, left ? "end" : "start", 12);
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Largest deals in and out">${HATCH}${side(li, true)}${side(lo, false)}<circle cx="${cx}" cy="${f1(cy)}" r="8" fill="${col(idx.companies[id].layer)}"/>`
    + `<text class="lab" x="150" y="${H - 2}" text-anchor="end">money in</text><text class="lab" x="${W - 150}" y="${H - 2}">money out</text></svg>`;
}

// ---------- Money flows (13d): layer level by default, a layer opens to its companies ----------

// opts: { open: Set of layers shown as companies, lit: Set of deal ids or null, focus, qsWith(key, value), qs, na, w }
export function flowsChart(ctx, deals, opts) {
  const { idx, data } = ctx;
  const used = new Set(deals.flatMap((d) => [idx.companies[d.payer].layer, idx.companies[d.payee].layer]));
  const cols = CHAIN.filter((l) => used.has(l) || !["systems", "applications"].includes(l));
  const W = 1080, cw = W / cols.length;
  const cx = Object.fromEntries(cols.map((l, i) => [l, cw * i + cw / 2]));
  const unitOf = (c) => (opts.open.has(idx.companies[c].layer) ? c : "L:" + idx.companies[c].layer);
  // Largest deal, then degree, orders companies inside an open layer.
  const big = {}, deg = {};
  for (const d of deals) for (const c of [d.payer, d.payee]) { big[c] = Math.max(big[c] || 0, d.contingent ? 0 : highEnd(d)); deg[c] = (deg[c] || 0) + 1; }
  const members = (l) => data.companies.filter((c) => c.layer === l && deg[c.id]).sort((a, b) => (big[b.id] || 0) - (big[a.id] || 0) || deg[b.id] - deg[a.id] || a.name.localeCompare(b.name));
  const rowH = 24;
  const stackN = Math.max(1, ...cols.filter((l) => opts.open.has(l)).map((l) => members(l).length));
  // Bundles: one line per pair of units, width by announced ceilings (D33) or by count.
  const bundles = new Map();
  for (const d of deals) {
    if (!hasAmount(d) && !opts.na) continue;
    const a = unitOf(d.payer), b = unitOf(d.payee);
    if (a === b) continue;
    const k = a + ">" + b;
    if (!bundles.has(k)) bundles.set(k, { a, b, deals: [], total: 0, paid: 0 });
    const g = bundles.get(k);
    g.deals.push(d);
    if (!d.contingent && hasAmount(d)) g.total += highEnd(d);
    if (d.amount_basis === "paid") g.paid++;
  }
  const list = [...bundles.values()];
  const byCount = opts.w === "count";
  const vmax = Math.max(1, ...list.map((g) => (byCount ? g.deals.length : g.total)));
  const width = (g) => (byCount ? 1.4 + (10 * g.deals.length) / vmax : g.total ? 1.4 + 10 * Math.sqrt(g.total / vmax) : 0);
  const layerOfUnit = (u) => (u.startsWith("L:") ? u.slice(2) : idx.companies[u].layer);
  const upSpace = 150, lowSpace = 150;
  const midY = 40 + upSpace + (stackN * rowH) / 2;
  const railY = midY + (stackN * rowH) / 2 + lowSpace + 20;
  const pos = {};
  for (const l of cols) {
    if (opts.open.has(l)) {
      const ms = members(l);
      ms.forEach((c, i) => { pos[c.id] = [cx[l], midY + (i - (ms.length - 1) / 2) * rowH]; });
    } else pos["L:" + l] = [cx[l], midY];
  }
  const capOpen = opts.open.has("capital");
  const caps = capOpen ? members("capital") : [];
  caps.forEach((c, i) => { pos[c.id] = [70 + (i * (W - 140)) / Math.max(1, caps.length - 1), railY]; });
  const parts = [HATCH];
  cols.forEach((l) => {
    const on = opts.open.has(l);
    parts.push(`<a href="#/flows${opts.qsWith("open", on ? [...opts.open].filter((x) => x !== l) : [...opts.open, l])}" class="chip-a">${tip(idx.layers[l].label, on ? "Close to the layer" : "Open to its companies")}<text class="layer" x="${f1(cx[l])}" y="18" text-anchor="middle">${esc(idx.layers[l].label)}${on ? " −" : " +"}</text></a>`);
  });
  const lit = opts.lit;
  const edges = [];
  for (const g of list.sort((x, y) => width(y) - width(x))) {
    const la = layerOfUnit(g.a), lb = layerOfUnit(g.b);
    const fromCap = la === "capital", toCap = lb === "capital";
    let p1 = pos[g.a], p2 = pos[g.b];
    if (fromCap && !p1) p1 = [cx[lb] + 12, railY];
    if (toCap && !p2) p2 = [cx[la] - 12, railY];
    if (!p1 || !p2) continue;
    const w = width(g);
    const on = !lit || g.deals.some((d) => lit.has(d.id));
    let path;
    if (fromCap || toCap) {
      const my = (p1[1] + p2[1]) / 2;
      path = `M${f1(p1[0])} ${f1(p1[1])} C${f1(p1[0])} ${f1(my)} ${f1(p2[0])} ${f1(my)} ${f1(p2[0])} ${f1(p2[1])}`;
    } else {
      const up = CHAIN.indexOf(lb) < CHAIN.indexOf(la) || (la === lb && p2[1] < p1[1]);
      const depth = Math.min(upSpace - 10, 18 + 0.2 * Math.abs(p2[0] - p1[0]) + (la === lb ? 20 : 0)) * 1.33 * (up ? -1 : 1);
      const ex = la === lb ? 26 : 0;
      path = `M${f1(p1[0])} ${f1(p1[1])} C${f1(p1[0] + ex)} ${f1(p1[1] + depth)} ${f1(p2[0] + ex)} ${f1(p2[1] + depth)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    const lab = (u) => (u.startsWith("L:") ? idx.layers[u.slice(2)].label : idx.companies[u].name);
    const head = `${lab(g.a)} to ${lab(g.b)}: ${plural(g.deals.length, "deal", "deals")}`;
    const second = g.deals.length === 1 ? `${amountText(g.deals[0])}, ${LABEL.basis[g.deals[0].amount_basis].toLowerCase()}, ${LABEL.confidence[g.deals[0].confidence].toLowerCase()}`
      : g.total ? `${money(g.total)} in announced ceilings, ${g.paid} paid` : "No amount disclosed";
    const stroke = !w ? `stroke="${col(la)}" stroke-width="1" stroke-dasharray="2 3"` : `stroke="${col(la)}" stroke-width="${f1(w)}"`;
    const target = g.a.startsWith("L:") ? `#/flows${opts.qsWith("open", [...new Set([...opts.open, la, lb])])}` : `#/flows${opts.qsWith("focus", g.a)}`;
    edges.push(`<a href="${target}" class="edge${on ? (lit ? " lit" : "") : " faded"}">${tip(head, second)}<path d="${path}" fill="none" ${stroke} opacity="${w ? ".8" : ".7"}"/><path d="${path}" fill="none" stroke="transparent" stroke-width="${f1(Math.max(10, w + 6))}"/></a>`);
    if (lit && on) {
      const mid = [(p1[0] + p2[0]) / 2, fromCap || toCap ? (p1[1] + p2[1]) / 2 : (p1[1] + p2[1]) / 2 + (CHAIN.indexOf(lb) < CHAIN.indexOf(la) ? -1 : 1) * Math.min(upSpace - 10, 18 + 0.2 * Math.abs(p2[0] - p1[0]))];
      const d0 = g.deals.length === 1 ? g.deals[0] : null;
      edges.push(d0 ? label(mid[0], mid[1] + 4, d0, "middle", 12) : `<text class="n halo" x="${f1(mid[0])}" y="${f1(mid[1] + 4)}" text-anchor="middle">${g.total ? esc(money(g.total)) : ""}<tspan class="lab" dx="4">${plural(g.deals.length, "deal", "deals")}</tspan></text>`);
    }
  }
  parts.push(...edges);
  // Nodes on top of the lines.
  for (const [u, [x, y]] of Object.entries(pos)) {
    const layer = layerOfUnit(u);
    if (layer === "capital") continue;
    const faded = lit && !(u.startsWith("L:") ? false : opts.litNodes?.has(u));
    if (u.startsWith("L:")) {
      parts.push(`<a href="#/flows${opts.qsWith("open", [...opts.open, layer])}" class="chip-a${lit ? " faded" : ""}">${tip(idx.layers[layer].label, "Open to its companies")}<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="${col(layer)}" stroke="var(--paper)" stroke-width="2"/></a>`);
    } else {
      const c = idx.companies[u], isF = u === opts.focus;
      parts.push(`<a href="#/flows${opts.qsWith("focus", isF ? "" : u)}" class="chip-a${faded ? " faded" : ""}">${tip(c.name, isF ? "Clear the trace" : "Trace its money")}<circle cx="${f1(x)}" cy="${f1(y)}" r="${isF ? 7 : 5}" fill="${col(layer)}" stroke="var(--paper)" stroke-width="2"/><text class="chip halo${isF ? " strong" : ""}" x="${f1(x + 9)}" y="${f1(y + 4)}">${esc(c.name.length > 16 ? c.name.slice(0, 15) + "." : c.name)}</text></a>`);
    }
  }
  parts.push(`<line x1="0" x2="${W}" y1="${f1(railY)}" y2="${f1(railY)}" stroke="var(--cap)" stroke-width="3"/>`);
  parts.push(`<a href="#/flows${opts.qsWith("open", capOpen ? [...opts.open].filter((x) => x !== "capital") : [...opts.open, "capital"])}" class="chip-a">${tip(idx.layers.capital.label, capOpen ? "Close to the layer" : "Open to its companies")}<text class="layer" x="0" y="${f1(railY + 20)}">${esc(idx.layers.capital.label)}${capOpen ? " −" : " +"}</text></a>`);
  for (const c of caps) {
    const [x] = pos[c.id], isF = c.id === opts.focus, faded = lit && !opts.litNodes?.has(c.id);
    parts.push(`<a href="#/flows${opts.qsWith("focus", isF ? "" : c.id)}" class="chip-a${faded ? " faded" : ""}">${tip(c.name, isF ? "Clear the trace" : "Trace its money")}<circle cx="${f1(x)}" cy="${f1(railY)}" r="5" fill="var(--cap)" stroke="var(--paper)" stroke-width="2"/><text class="chip" x="${f1(x)}" y="${f1(railY + 20)}" text-anchor="middle">${esc(c.name)}</text></a>`);
  }
  return `<svg viewBox="0 0 ${W} ${Math.round(railY + 30)}" role="img" aria-label="Money flows between layers${opts.open.size ? " and companies" : ""}">${parts.join("")}</svg>`;
}
