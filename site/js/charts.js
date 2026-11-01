// SVG builders for the round 6 design (mockups/round6): the sankey and its phone ledger, the loop
// racetracks and the company in and out diagram. Pure functions returning strings.

import { esc, money, amountText, highEnd, hasAmount, basisStyle, flowWord, MARK, LABEL, TYPE_SHORT, FAMILY } from "./lib.js";

const f1 = (n) => (Math.round(n * 10) / 10).toString();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fam = (layer) => FAMILY[layer] || "hw";
const col = (layer) => `var(--${fam(layer)})`;
const tip = (a, b) => `<title>${esc(a)}${b ? "\n" + esc(b) : ""}</title>`;

// The first share t of a one-segment cubic path, for paid to date.
function partOf(path, t) {
  const n = path.match(/-?[0-9.]+/g).map(Number);
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p0 = [n[0], n[1]], p1 = [n[2], n[3]], p2 = [n[4], n[5]], p3 = [n[6], n[7]];
  const q0 = L(p0, p1), q1 = L(p1, p2), q2 = L(p2, p3), r0 = L(q0, q1), r1 = L(q1, q2), e = L(r0, r1);
  return `M${p0.map(f1).join(" ")} C${[...q0, ...r0, ...e].map(f1).join(" ")}`;
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

// ---------- Loops: the racetrack (round 6, D52) ----------

// An axis-aligned arrow from (x0, y0) to (x1, y1), w thick, with a head. Returns the outline path.
function arrowPath(x0, y0, x1, y1, w) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, dx = (x1 - x0) / len, dy = (y1 - y0) / len, nx = -dy, ny = dx;
  const head = Math.min(len * 0.45, Math.max(7, Math.min(16, w * 1.2 + 5))), hw = w / 2, hh = hw + head * 0.6;
  const hx = x1 - dx * head, hy = y1 - dy * head;
  const pts = [[x0 + nx * hw, y0 + ny * hw], [hx + nx * hw, hy + ny * hw], [hx + nx * hh, hy + ny * hh], [x1, y1],
    [hx - nx * hh, hy - ny * hh], [hx - nx * hw, hy - ny * hw], [x0 - nx * hw, y0 - ny * hw]];
  return "M" + pts.map((p) => p.map(f1).join(" ")).join(" L") + " Z";
}

// One deal as an arrow (D50): solid = paid; outline with a light fill = committed, with paid to date
// filled from the tail; a dotted hairline with a small open head = no amount; grey = guarantee.
function dealArrow(ctx, d, x0, y0, x1, y1, w, uid) {
  const k = d.contingent ? "var(--muted)" : col(ctx.idx.companies[d.payer].layer);
  if (!hasAmount(d)) {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1, dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    const hp = `M${f1(x1 - dx * 6 - dy * 4)} ${f1(y1 - dy * 6 + dx * 4)} L${f1(x1)} ${f1(y1)} L${f1(x1 - dx * 6 + dy * 4)} ${f1(y1 - dy * 6 - dx * 4)}`;
    return `<path d="M${f1(x0)} ${f1(y0)} L${f1(x1)} ${f1(y1)}" fill="none" stroke="${k}" stroke-width=".9" stroke-dasharray="2 3"/><path d="${hp}" fill="none" stroke="${k}" stroke-width="1"/>`;
  }
  const body = arrowPath(x0, y0, x1, y1, w);
  if (basisStyle(d) === "paid") return `<path d="${body}" fill="${k}"/>`;
  let s = `<path d="${body}" fill="${k}" fill-opacity=".12" stroke="${k}" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (d.paid_to_date_usd && highEnd(d)) {
    const t = Math.min(1, d.paid_to_date_usd / highEnd(d));
    const ex = x0 + (x1 - x0) * t, ey = y0 + (y1 - y0) * t, m = w + 20;
    const rx = Math.min(x0, ex) - (x0 === x1 ? m : 0), ry = Math.min(y0, ey) - (y0 === y1 ? m : 0);
    const rw = Math.abs(ex - x0) + (x0 === x1 ? 2 * m : 0), rh = Math.abs(ey - y0) + (y0 === y1 ? 2 * m : 0);
    s += `<clipPath id="${uid}"><rect x="${f1(rx)}" y="${f1(ry)}" width="${f1(rw)}" height="${f1(rh)}"/></clipPath><path d="${body}" fill="${k}" clip-path="url(#${uid})"/>`;
  }
  return s;
}

// The arrow's label: amount (with caps and multi-year in words), deal type lighter, F/S/R marker.
// The phone form keeps the amount alone.
function trackLabel(d, x, y, anchor, size, short) {
  const { amt, kind } = amountWords(d);
  const a = short ? amt : kind && kind !== "one-time" ? `${amt}, ${kind}` : amt;
  const ty = short ? "" : `<tspan class="lab" dx="5" style="font-weight:400">${esc(TYPE_SHORT[d.type])}</tspan>`;
  return `<text class="n halo" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" style="font-size:${size}px">${esc(a)}${ty}<tspan class="mk" dx="4">${MARK[d.confidence]}</tspan></text>`;
}

// opts: { W, wmax, scaleMax, compact, phone }. Company boxes in a row (two, or three for a ring), money
// clockwise: top arrows out along the row, bottom arrows back. Thickness = amount on one scale per page,
// 1.5px floor. On a phone a three-company ring stacks vertically: down the right side, back up the left.
export function track(ctx, v, opts = {}) {
  const { idx } = ctx;
  const W = opts.W || 1080, wmax = opts.wmax || 26, scale = opts.scaleMax || 250e9, compact = !!opts.compact, phone = !!opts.phone;
  const cos = v.cos, n = cos.length, uid = `t${opts.uid || ""}${v.loop.id.replace(/[^a-z0-9]/gi, "")}`;
  const th = (d) => (!hasAmount(d) ? 0.9 : Math.max(1.5, (wmax * highEnd(d)) / scale));
  const between = (a, b) => v.deals.filter((d) => d.payer === a && d.payee === b).sort((x, y) => highEnd(y) - highEnd(x));
  const fwd = cos.slice(0, -1).map((c, i) => [i, i + 1, between(c, cos[i + 1])]);
  const back = [[n - 1, 0, between(cos[n - 1], cos[0])]];
  const drawn = new Set([...fwd, ...back].flatMap(([, , ds]) => ds.map((d) => d.id)));
  const stray = v.deals.filter((d) => !drawn.has(d.id));
  const out = [];
  const fs = compact ? 11 : 12.5, lh = compact ? 12 : 14;
  const tipFor = (d) => dealTip(ctx, d);
  const box = (c, x, y, bw, bh) => {
    const k = col(idx.companies[c].layer);
    return `<a href="#/company/${esc(c)}${ctx.qs}" class="chip-a">${tip(idx.companies[c].name, "Open the company card")}<rect x="${f1(x)}" y="${f1(y)}" width="${bw}" height="${bh}" rx="3" fill="var(--wash)" stroke="${k}" stroke-width="1.5"/>`
      + `<circle cx="${f1(x + 14)}" cy="${f1(y + bh / 2)}" r="4" fill="${k}"/><text class="layer" x="${f1(x + 26)}" y="${f1(y + bh / 2 + 4)}" style="font-size:${compact || phone ? 12 : 13}px">${esc(idx.companies[c].name)}</text></a>`;
  };
  if (phone && n === 3) {
    const BW = 132, BH = 30, bx = (W - BW) / 2;
    const gapOf = (ds) => Math.max(64, ds.length * (lh + 4) + 28);
    const ys = [8];
    for (const [, , ds] of fwd) ys.push(ys[ys.length - 1] + BH + gapOf(ds));
    const H = ys[n - 1] + BH + 8;
    let xr = bx + BW + 14;
    // Down the right side, one column of arrows per hop, labels to their right.
    for (const [i, j, ds] of fwd) {
      let x = bx + BW + 14, ly = (ys[i] + BH + ys[j]) / 2 - ((ds.length - 1) * (lh + 2)) / 2 + 4;
      for (const [m, d] of ds.entries()) {
        const w = th(d); x += w / 2;
        out.push(`<g>${tipFor(d)}${dealArrow(ctx, d, x, ys[i] + BH / 2, x, ys[j] + BH / 2, w, `${uid}r${i}${m}`)}</g>`);
        x += w / 2 + 6;
      }
      xr = Math.max(xr, x);
      ds.forEach((d, m) => out.push(trackLabel(d, x + 2, ly + m * (lh + 2), "start", 11, true)));
    }
    // Back up the left side.
    for (const [i, j, ds] of back) {
      let x = bx - 14, ly = (ys[j] + ys[i] + BH) / 2 - ((ds.length - 1) * (lh + 2)) / 2 + 4;
      for (const [m, d] of ds.entries()) {
        const w = th(d); x -= w / 2;
        out.push(`<g>${tipFor(d)}${dealArrow(ctx, d, x, ys[i] + BH / 2, x, ys[j] + BH / 2, w, `${uid}l${m}`)}</g>`);
        x -= w / 2 + 6;
      }
      ds.forEach((d, m) => out.push(trackLabel(d, x - 2, ly + m * (lh + 2), "end", 11, true)));
    }
    cos.forEach((c, i) => out.push(box(c, bx, ys[i], BW, BH)));
    return `<svg viewBox="0 0 ${W} ${f1(H)}" role="img" aria-label="${esc(v.loop.name)}">${out.join("")}</svg>`;
  }
  const [BW, BH] = phone ? [n > 2 ? 92 : 112, 30] : compact ? [118, 30] : [150, 36];
  const gap = n > 1 ? (W - n * BW) / (n - 1) : 0;
  const xs = cos.map((c, i) => i * (BW + gap));
  const sideH = (hops) => Math.max(0, ...hops.map(([, , ds]) => ds.reduce((t, d) => t + th(d) + 6 + lh, 0))) + 22;
  const topH = sideH(fwd), botH = sideH(back), by = topH, H = topH + BH + botH + (stray.length ? 18 : 8);
  for (const [i, j, ds] of fwd) {
    const x0 = xs[i] + BW + 6, x1 = xs[j] - 6;
    let y = by - 10;
    for (const [m, d] of ds.entries()) {
      const w = th(d); y -= w / 2;
      out.push(`<g>${tipFor(d)}${dealArrow(ctx, d, x0, y, x1, y, w, `${uid}f${i}${m}`)}</g>`);
      out.push(trackLabel(d, (x0 + x1) / 2, y - w / 2 - 5, "middle", fs, phone));
      y -= w / 2 + 6 + lh;
    }
  }
  for (const [i, j, ds] of back) {
    let x0 = xs[j] + BW / 2, x1 = xs[i] + BW / 2;
    if (n === 2) { x0 = xs[0] + BW + 6; x1 = xs[1] - 6; }
    let y = by + BH + 10;
    for (const [m, d] of ds.entries()) {
      const w = th(d); y += w / 2;
      if (n > 2) {
        // Drop from the last box and rise into the first, so the arrow runs along the bottom.
        const k = d.contingent ? "var(--muted)" : col(idx.companies[d.payer].layer), dash = hasAmount(d) ? "" : ' stroke-dasharray="2 3"';
        out.push(`<path d="M${f1(x1)} ${by + BH} V${f1(y)}" fill="none" stroke="${k}" stroke-width="1"${dash}/><path d="M${f1(x0)} ${by + BH} V${f1(y)}" fill="none" stroke="${k}" stroke-width="1"${dash}/>`);
      }
      out.push(`<g>${tipFor(d)}${dealArrow(ctx, d, x1, y, x0, y, w, `${uid}b${m}`)}</g>`);
      out.push(trackLabel(d, (x0 + x1) / 2, y + w / 2 + lh, "middle", fs, phone));
      y += w / 2 + 6 + lh;
    }
  }
  cos.forEach((c, i) => out.push(box(c, xs[i], by, BW, BH)));
  if (stray.length) out.push(`<text class="lab" x="0" y="${f1(H - 2)}">${plural(stray.length, "deal", "deals")} outside the ring order not drawn</text>`);
  return `<svg viewBox="-2 0 ${W + 4} ${f1(H)}" role="img" aria-label="${esc(v.loop.name)}">${out.join("")}</svg>`;
}

// Row icon: two boxes, an arrow over and an arrow back, thick when paid.
export function trackIcon(ctx, v) {
  const a = v.cos[0], b = v.cos[v.cos.length - 1];
  const ka = col(ctx.idx.companies[a].layer), kb = col(ctx.idx.companies[b].layer);
  const up = v.put.some((d) => basisStyle(d) === "paid"), dn = v.back.some((d) => basisStyle(d) === "paid");
  return `<svg class="ticon" width="30" height="20" viewBox="0 0 30 20" aria-hidden="true"><rect x="1" y="7" width="7" height="7" rx="1.5" fill="${ka}"/><rect x="22" y="7" width="7" height="7" rx="1.5" fill="${kb}"/>`
    + `<path d="M9 5h11" stroke="${ka}" stroke-width="${up ? 2.6 : 1}"/><path d="M18 3l3 2-3 2" fill="none" stroke="${ka}" stroke-width="1.2"/>`
    + `<path d="M21 16H10" stroke="${kb}" stroke-width="${dn ? 2.6 : 1}"/><path d="M12 14l-3 2 3 2" fill="none" stroke="${kb}" stroke-width="1.2"/></svg>`;
}

// ---------- Company card: money in on the left, money out on the right, top 5 each ----------

// As in mockups/round6/build.py: paid is a solid line; committed is a pale band with a thin line
// down its middle, with paid to date drawn solid from the tail; a guarantee in grey; no amount dotted.
function curve(path, k, w, d) {
  if (!w) return `<path d="${path}" fill="none" stroke="${k}" stroke-width=".9" stroke-dasharray="2 3"/>`;
  if (basisStyle(d) === "paid") return `<path d="${path}" fill="none" stroke="${k}" stroke-width="${f1(w)}"/>`;
  let s = `<path d="${path}" fill="none" stroke="${k}" stroke-width="${f1(w)}" opacity=".18"/><path d="${path}" fill="none" stroke="${k}" stroke-width="1.2"/>`;
  const top = highEnd(d);
  if (d.paid_to_date_usd && top) s += `<path d="${partOf(path, Math.min(1, d.paid_to_date_usd / top))}" fill="none" stroke="${k}" stroke-width="${f1(w)}"/>`;
  return s;
}

export function companyDiagram(ctx, id, inn, out) {
  const { idx } = ctx;
  const W = 640, cx = W / 2, top5 = (ds) => ds.slice(0, 5);
  const li = top5(inn), lo = top5(out), rows = Math.max(li.length, lo.length, 1);
  const H = 26 + rows * 36, cy = H / 2;
  const vmax = Math.max(1, ...[...li, ...lo].filter((d) => !d.contingent).map(highEnd));
  const wOf = (d) => (hasAmount(d) ? Math.max(2, (14 * highEnd(d)) / vmax) : 0);
  const side = (ds, left) => ds.map((d, i) => {
    const other = left ? d.payer : d.payee, y = 20 + i * 36 + (rows - ds.length) * 18;
    const x = left ? 150 : W - 150, tx = left ? x - 8 : x + 8, anchor = left ? "end" : "start";
    const p = left ? `M${x} ${y} C${f1((x + cx) / 2)} ${y} ${f1((x + cx) / 2)} ${f1(cy)} ${cx - 8} ${f1(cy)}`
      : `M${cx + 8} ${f1(cy)} C${f1((x + cx) / 2)} ${f1(cy)} ${f1((x + cx) / 2)} ${y} ${x} ${y}`;
    const k = d.contingent ? "var(--muted)" : col(idx.companies[d.payer].layer);
    const { amt, kind } = amountWords(d);
    const words = kind && kind !== "one-time" ? `${amt}, ${kind}` : amt;
    return `<g>${dealTip(ctx, d)}${curve(p, k, wOf(d), d)}</g>`
      + `<a href="#/company/${esc(other)}${ctx.qs}" class="chip-a"><text class="chip" x="${tx}" y="${y - 3}" text-anchor="${anchor}">${esc(idx.companies[other].name)}</text></a>`
      + `<text class="n halo" x="${tx}" y="${y + 12}" text-anchor="${anchor}" style="font-size:12px">${esc(words)}<tspan class="mk" dx="4">${MARK[d.confidence]}</tspan></text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Largest deals in and out">${side(li, true)}${side(lo, false)}<circle cx="${cx}" cy="${f1(cy)}" r="8" fill="${col(idx.companies[id].layer)}"/>`
    + `<text class="lab" x="150" y="${H - 2}" text-anchor="end">money in</text><text class="lab" x="${W - 150}" y="${H - 2}">money out</text></svg>`;
}

// ---------- The chain wheel (Companies page, desktop only) ----------

const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${f1(x0)} ${f1(y0)} A${f1(r)} ${f1(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
}

// One arc per layer in chain order (clockwise from Equipment at the top, Capital closing the circle),
// one dot per company with a sourced deal, names set along the radius and linked to their cards.
// opts: { dealt: Set of company ids, match(c): false dims a name the page's search or chips leave out }
export function wheel(ctx, opts = {}) {
  const { data, idx } = ctx, size = 680, cx = size / 2, cy = size / 2, R = size / 2 - 112, pad = 2.6;
  const dealt = opts.dealt || new Set(), match = opts.match || (() => true);
  const chain = data.taxonomy.layers.map((l) => l.id);
  const slots = chain.map((l) => [l, data.companies.filter((c) => c.layer === l)]).filter(([, cs]) => cs.length);
  const total = slots.reduce((n, [, cs]) => n + cs.length, 0);
  let a = -90;
  const out = [];
  for (const [l, cs] of slots) {
    const span = ((360 - pad * slots.length) * cs.length) / total, m = a + span / 2;
    out.push(`<path d="${arcPath(cx, cy, R, a, a + span)}" fill="none" stroke="${col(l)}" stroke-width="10"/>`);
    const [lx, ly] = polar(cx, cy, R - 22, m), cos = Math.cos((m * Math.PI) / 180);
    out.push(`<text class="layer halo" x="${f1(lx)}" y="${f1(ly + 4)}" text-anchor="${Math.abs(cos) < 0.35 ? "middle" : cos < 0 ? "start" : "end"}" style="font-size:11px">${esc(idx.layers[l].label)}</text>`);
    const sorted = [...cs].sort((p, q) => dealt.has(q.id) - dealt.has(p.id) || p.name.localeCompare(q.name));
    sorted.forEach((c, j) => {
      const ca = a + (span * (j + 0.5)) / cs.length, on = dealt.has(c.id);
      const [x, y] = polar(cx, cy, R, ca), [tx, ty] = polar(cx, cy, R + 12, ca);
      const flip = Math.cos((ca * Math.PI) / 180) < 0, rot = ca + (flip ? 180 : 0);
      if (on) out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.5"/>`);
      out.push(`<a href="#/company/${esc(c.id)}${ctx.qs}" class="chip-a cname${match(c) ? "" : " faded"}"><text class="${on ? "chip" : "bench"}" x="${f1(tx)}" y="${f1(ty)}" text-anchor="${flip ? "end" : "start"}" dominant-baseline="middle" transform="rotate(${f1(rot)} ${f1(tx)} ${f1(ty)})" style="font-size:10.5px">${esc(c.name)}</text></a>`);
    });
    a += span + pad;
  }
  out.push(`<text class="n" x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-size:30px">${total}</text>`);
  out.push(`<text class="lab" x="${cx}" y="${cy + 14}" text-anchor="middle">companies in ${slots.length} layers</text>`);
  out.push(`<text class="lab" x="${cx}" y="${cy + 32}" text-anchor="middle">${dealt.size} with a sourced deal</text>`);
  return `<svg class="wheel" viewBox="0 0 ${size} ${size}" role="img" aria-label="The chain as a wheel">${out.join("")}</svg>`;
}
