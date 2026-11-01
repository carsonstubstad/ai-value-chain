// SVG builders for the round 6 design (mockups/round6): the sankey and its phone ledger, loop
// diagrams and the company in and out diagram. Pure functions returning strings.

import { esc, money, amountText, highEnd, hasAmount, basisStyle, flowWord, MARK, LABEL, TYPE_SHORT, FAMILY } from "./lib.js";

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

// One deal drawn along a path by basis (D50): paid solid, committed outline (caps and ranges too,
// named in the label), paid to date as a fill inside the outline, guarantees as a grey outline, no amount dotted.
export function mark(path, layer, w, d) {
  const c = col(layer);
  if (!w) return `<path d="${path}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2 3"/>`;
  const st = basisStyle(d);
  if (st === "paid") return `<path d="${path}" fill="none" stroke="${c}" stroke-width="${f1(w)}"/>`;
  w = Math.max(w, 5);
  const k = st === "contingent" ? "var(--muted)" : c;
  let s = `<path d="${path}" fill="none" stroke="${k}" stroke-width="${f1(w)}"/>`
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

// ---------- The sankey (round 6, D50): payers on the left, payees on the right ----------

// Ribbon height = cash plus announced ceilings (D33's sum of high ends), 2px floor; with w=count,
// height = deals. Colour = payer family. Committed = outlined band with a light fill; paid = a solid
// band along the top edge to the paid share. Guarantees are left out of widths. No hatching, no dashes.
// opts: { open: Set of "L:layer" or "R:layer" shown as companies, lit: company id, w, rib,
//         ribLink(e), nodeLink(side, row), H }
export const LABEL_MIN = 5e9;

export function sankeyEdges(ctx, deals, open = new Set(), byCount = false) {
  const { idx } = ctx;
  const unit = (side, c) => {
    const l = idx.companies[c].layer;
    return open.has(`${side}:${l}`) ? c : l;
  };
  const m = new Map();
  for (const d of deals) {
    const cont = !!d.contingent, amt = hasAmount(d) && !cont;
    const src = unit("L", d.payer), dst = unit("R", d.payee), k = src + ">" + dst;
    if (!m.has(k)) m.set(k, { key: k, src, dst, from: idx.companies[d.payer].layer, to: idx.companies[d.payee].layer, deals: [], v: 0, paid: 0, ceil: 0, n: 0, paidN: 0 });
    const e = m.get(k);
    e.deals.push(d);
    e.n++;
    if (d.amount_basis === "paid") e.paidN++;
    if (byCount) continue;
    if (!amt) continue;
    e.v += highEnd(d);
    if (d.amount_kind !== "one_time") e.ceil += highEnd(d);
    e.paid += d.amount_basis === "paid" ? highEnd(d) : d.paid_to_date_usd || 0;
  }
  const out = [...m.values()];
  if (byCount) for (const e of out) { e.v = e.n; e.paid = e.paidN; }
  return out;
}

const edgeWord = (e) => (e.ceil > 0 ? "ceilings" : e.v > 0 && e.paid >= e.v ? "paid" : "committed");
export const edgeLabel = (e, byCount) => (byCount ? plural(e.n, "deal", "deals") : `${money(e.v)} ${edgeWord(e)} · ${plural(e.n, "deal", "deals")}`);

export function sankey(ctx, deals, opts = {}) {
  const { idx } = ctx;
  const open = opts.open || new Set(), byCount = opts.w === "count";
  const W = 1080, NODE_W = 12, GAP = 16, MINW = 2, leftX = 176, rightX = 896;
  const all = sankeyEdges(ctx, deals, open, byCount);
  const edges = all.filter((e) => e.v > 0);
  const name = (u) => (idx.layers[u] ? idx.layers[u].label : idx.companies[u].name);
  const layerOf = (u) => (idx.layers[u] ? u : idx.companies[u].layer);
  const rows = (side) => {
    const r = new Map();
    for (const e of edges) {
      const u = side === "L" ? e.src : e.dst;
      if (!r.has(u)) r.set(u, { id: u, layer: layerOf(u), label: name(u), company: !idx.layers[u], v: 0, edges: [] });
      r.get(u).v += e.v;
      r.get(u).edges.push(e);
    }
    // Payers ranked by what they pay, payees by what they are paid: loop pairs then run as parallel bands.
    return [...r.values()].sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
  };
  const L = rows("L"), R = rows("R");
  if (!edges.length) return "";
  const nRows = Math.max(L.length, R.length);
  const H = Math.max(opts.H || 700, 460 + GAP * (nRows - 1));
  const total = Math.max(L.reduce((t, r) => t + r.v, 0), R.reduce((t, r) => t + r.v, 0));
  const k = (H - 40 - GAP * (nRows - 1)) / total;
  const wpx = (v) => Math.max(MINW, v * k);
  const place = (rs) => { let y = 20; for (const r of rs) { r.h = r.edges.reduce((t, e) => t + wpx(e.v), 0); r.y = y; y += r.h + GAP; } };
  place(L); place(R);
  const yL = new Map(L.map((r) => [r.id, r])), yR = new Map(R.map((r) => [r.id, r]));
  // Inside a node, order ribbons by the other end, to limit crossings.
  for (const r of L) { r.edges.sort((a, b) => yR.get(a.dst).y - yR.get(b.dst).y); let y = r.y; for (const e of r.edges) { e.sy = y; y += wpx(e.v); } }
  for (const r of R) { r.edges.sort((a, b) => yL.get(a.src).y - yL.get(b.src).y); let y = r.y; for (const e of r.edges) { e.dy = y; y += wpx(e.v); } }
  const x0 = leftX + NODE_W, x1 = rightX, mx = (x0 + x1) / 2;
  const band = (ya, yb, w) => `M${x0} ${f1(ya)} C${mx} ${f1(ya)} ${mx} ${f1(yb)} ${x1} ${f1(yb)} L${x1} ${f1(yb + w)} C${mx} ${f1(yb + w)} ${mx} ${f1(ya + w)} ${x0} ${f1(ya + w)} Z`;
  const line = (ya, yb) => `M${x0} ${f1(ya)} C${mx} ${f1(ya)} ${mx} ${f1(yb)} ${x1} ${f1(yb)}`;
  const lit = opts.lit, rib = opts.rib;
  const parts = [], labels = [];
  for (const e of [...edges].sort((a, b) => b.v - a.v)) {
    const w = wpx(e.v), c = col(e.from), ya = e.sy, yb = e.dy;
    const on = lit ? e.deals.some((d) => d.payer === lit || d.payee === lit) : rib ? e.key === rib : true;
    const cls = `rib edge${lit || rib ? (on ? " lit" : " faded") : ""}`;
    let g;
    if (w <= 3) g = `<path d="${line(ya + w / 2, yb + w / 2)}" fill="none" stroke="${c}" stroke-width="${f1(w)}"/>`;
    else {
      g = `<path d="${band(ya, yb, w)}" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="1.2"/>`;
      if (e.paid > 0) g += `<path d="${band(ya, yb, w * Math.min(1, e.paid / e.v))}" fill="${c}"/>`;
    }
    // A wider invisible stroke makes thin ribbons easy to point at.
    g += `<path d="${line(ya + w / 2, yb + w / 2)}" fill="none" stroke="transparent" stroke-width="${f1(Math.max(10, w))}"/>`;
    const head = `${name(e.src)} pays ${name(e.dst)}, ${byCount ? plural(e.n, "deal", "deals") : `${money(e.v)} ${edgeWord(e)}`}`;
    const paidBit = byCount ? `${e.paidN} paid` : `${e.paidN} paid${e.paid > 0 && e.paid < e.v ? `, ${money(e.paid)} of it paid to date` : ""}`;
    const cont = e.deals.filter((d) => d.contingent).length;
    const second = byCount ? paidBit : `${plural(e.n, "deal", "deals")}, ${paidBit}${cont ? `; ${plural(cont, "guarantee", "guarantees")} not in the width` : ""}`;
    parts.push(`<a href="${opts.ribLink ? opts.ribLink(e) : "#/flows"}" class="${cls}">${tip(head, second)}${g}</a>`);
    if (byCount ? e.n < 3 : e.v < LABEL_MIN) continue;
    const txt = edgeLabel(e, byCount);
    if (w >= 12) labels.push({ x: mx, y: (ya + yb) / 2 + w / 2 + 4, t: txt, anchor: "middle", col: "mid", on });
    else labels.push({ x: x1 - 10, y: yb + w / 2 + 4, t: txt, anchor: "end", col: "end", on });
  }
  // Sweep labels 16px apart within each column, then keep the stack inside the frame.
  for (const cn of ["mid", "end"]) {
    const ls = labels.filter((l) => l.col === cn).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ls.length; i++) if (ls[i].y - ls[i - 1].y < 16) ls[i].y = ls[i - 1].y + 16;
    for (let i = ls.length - 1; i >= 0; i--) {
      const limit = i === ls.length - 1 ? H - 24 : ls[i + 1].y - 16;
      if (ls[i].y > limit) ls[i].y = limit;
    }
  }
  for (const l of labels) parts.push(`<text class="small halo" x="${f1(l.x)}" y="${f1(l.y)}" text-anchor="${l.anchor}"${l.on ? "" : ' opacity=".3"'}>${esc(l.t)}</text>`);
  const node = (side, r) => {
    const x = side === "L" ? leftX : rightX;
    const tx = side === "L" ? leftX - 8 : rightX + NODE_W + 8;
    const faded = lit && r.company && r.id !== lit && !r.edges.some((e) => e.deals.some((d) => d.payer === lit || d.payee === lit));
    const t = r.company ? tip(r.label, r.id === lit ? "Clear the trace" : "Trace its money") : tip(r.label, open.has(`${side}:${r.id}`) ? "Close to the layer" : "Open to its companies");
    const href = opts.nodeLink ? opts.nodeLink(side, r) : "#/flows";
    return `<a href="${href}" class="chip-a node${faded ? " faded" : ""}">${t}<rect x="${x}" y="${f1(r.y)}" width="${NODE_W}" height="${f1(Math.max(r.h, 2))}" fill="${col(r.layer)}"/>`
      + `<rect x="${side === "L" ? 0 : rightX}" y="${f1(r.y - 4)}" width="${side === "L" ? leftX + NODE_W : W - rightX}" height="${f1(Math.max(r.h, 14) + 4)}" fill="transparent"/>`
      + `<text class="${r.company ? "chip" : "layer"} halo${r.id === lit ? " strong" : ""}" x="${tx}" y="${f1(r.y + Math.min(r.h, 14) / 2 + 4)}"${side === "L" ? ' text-anchor="end"' : ""}>${esc(r.label)}</text></a>`;
  };
  for (const r of L) parts.push(node("L", r));
  for (const r of R) parts.push(node("R", r));
  // An open layer gets a bracket with its name beside its companies.
  for (const side of ["L", "R"]) {
    const rs = side === "L" ? L : R;
    for (const l of new Set(rs.filter((r) => r.company).map((r) => r.layer))) {
      const xs = rs.filter((r) => r.company && r.layer === l);
      const y0 = Math.min(...xs.map((r) => r.y)), y1 = Math.max(...xs.map((r) => r.y + r.h));
      const bx = side === "R" ? rightX + NODE_W + 92 : leftX - 96;
      parts.push(`<line x1="${bx}" x2="${bx}" y1="${f1(y0)}" y2="${f1(y1)}" stroke="var(--rule)"/><text class="layer halo" x="${side === "R" ? bx + 6 : bx - 6}" y="${f1((y0 + y1) / 2 + 4)}"${side === "L" ? ' text-anchor="end"' : ""}>${esc(idx.layers[l].label)}</text>`);
    }
  }
  parts.push(`<text class="lab" x="${x0}" y="${H - 2}" text-anchor="end">pays</text><text class="lab" x="${x1}" y="${H - 2}">is paid</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Who pays whom, by layer">${parts.join("")}</svg>`;
}

// ---------- The phone ledger: one row per layer pair, bars on a shared scale ----------

export function ledger(ctx, flows, opts = {}) {
  const { idx } = ctx;
  const byCount = opts.w === "count";
  const val = (f) => (byCount ? f.n : f.total);
  const rows = flows.filter((f) => val(f) > 0).sort((a, b) => val(b) - val(a) || a.key.localeCompare(b.key));
  if (!rows.length) return "";
  const vmax = Math.max(...rows.map(val));
  const keys = new Set(rows.map((f) => f.key));
  return `<ul class="ledger">${rows.map((f) => {
    const w = Math.max(0.4, (100 * val(f)) / vmax);
    const pw = byCount ? (100 * f.paid) / vmax : (100 * f.paidAmt) / vmax;
    const c = col(f.from);
    const both = opts.both !== false && keys.has(f.to + ">" + f.from);
    const bar = `<svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="4" width="${w.toFixed(2)}" height="14" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="1" vector-effect="non-scaling-stroke"/>${pw > 0 ? `<rect x="0" y="4" width="${Math.min(w, pw).toFixed(2)}" height="14" fill="${c}"/>` : ""}</svg>`;
    const lab = byCount ? `<span class="num">${plural(f.n, "deal", "deals")}</span>` : `<span class="num">${money(f.total)}</span> <span class="lw">${flowWord(f)} · ${plural(f.n, "deal", "deals")}</span>`;
    return `<li${both ? ' class="both"' : ""}><a class="pair" href="${opts.link ? opts.link(f) : "#/flows"}"><span class="dot ${fam(f.from)}"></span>${esc(idx.layers[f.from].label)} <span class="to">pays</span> ${esc(idx.layers[f.to].label)}</a>`
      + `<span class="barrow"><span class="bar">${bar}</span><span class="blabel">${lab}</span></span></li>`;
  }).join("")}</ul>`;
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
      const out = `<g>${dealTip(ctx, d)}${s}${w > 70 || r.ds.length === 1 ? label(x, 40, d, "start") : ""}</g>`;
      x += w;
      return out;
    }).join("");
    if (!r.ds.length) return `<p class="meta barlab">${esc(idx.companies[r.c].name)}: ${plural(r.none, "deal", "deals")}${v.cos.length === 2 && r.c === v.cos[1] ? " back" : " out"}, no amount disclosed</p>`;
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
