"""Build the Gate 4a mockups from site/data/bundle.json (session 13a).

Writes three static pages to mockups/: overview-a.html (chain columns),
overview-b.html (two-way chain line) and loop-card.html. Standard library only.
The pages are design drafts for Carson to pick from; nothing here is used by the
site, and site/js/views.js is untouched. Run: python3 scripts/mockups.py
"""

import collections
import datetime
import html
import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "mockups"

# Layer families (spec section 3). Position names the layer; hue names the family.
FAMILY = {
    "equipment": "hw", "chip_design": "hw", "foundry": "hw", "memory": "hw", "systems": "hw",
    "power": "infra", "data_centers": "infra", "hyperscale": "infra",
    "labs": "model", "applications": "model",
    "capital": "cap",
}
CHAIN = ["equipment", "chip_design", "foundry", "memory", "systems", "power",
         "data_centers", "hyperscale", "labs", "applications"]
CEILING_KINDS = {"cap", "multi_year_total", "annual_run_rate", None}
KIND_WORD = {"one_time": "one-time", "cap": "up to", "multi_year_total": "multi-year",
             "annual_run_rate": "per year", None: "kind not set"}
MARK = {"filed": "F", "company_stated": "S", "reported": "R", "rumored": "?"}
# Paid to date: the 13b schema adds paid_to_date_usd. Until then the two filed
# figures below come from the records' own notes and sources (Microsoft and Amazon 10-Qs).
PAID_TO_DATE = {
    "microsoft-openai-equity-2019": 11.8e9,
    "amazon-anthropic-equity-2026-04": 10e9,
}
TYPE_WORD = {"equity_investment": "equity", "capacity_lease": "compute lease", "purchase_commitment": "purchase",
             "jv_contribution": "JV stake", "power_supply_agreement": "power deal", "government_grant_or_incentive": "grant",
             "warrant_or_equity_grant": "warrant", "guarantee_or_backstop": "guarantee", "debt_or_gpu_backed_loan": "loan",
             "revenue_share": "revenue share"}
RENAME = {"Nvidia": "NVIDIA"}  # decided at Gate 4 brief; the data change lands in 13b


def esc(s):
    return html.escape(str(s), quote=True)


def money(v):
    if v >= 1e9:
        b = v / 1e9
        return "$%sB" % (("%.1f" % b).rstrip("0").rstrip(".") if b < 100 else "%.0f" % b)
    return "$%.0fM" % (v / 1e6)


def high(d):
    """Largest stated figure: the high end, or the low end of an open range ("over $100B")."""
    return max(d.get("amount_usd_high") or 0, d.get("amount_usd_low") or 0)


def is_range(d):
    lo, hi = d.get("amount_usd_low"), d.get("amount_usd_high")
    return lo is None or hi is None or lo != hi


def contingent(d):
    return d["type"] == "guarantee_or_backstop"


def amount_words(d):
    lo, hi = d.get("amount_usd_low"), d.get("amount_usd_high")
    if lo is None and hi is None:
        return "undisclosed"
    if lo is None:
        return "up to " + money(hi)
    if hi is None:
        return "over " + money(lo)
    return money(lo) if lo == hi else money(lo) + " to " + money(hi)


class Data:
    def __init__(self):
        b = json.loads((ROOT / "site/data/bundle.json").read_text())
        self.b = b
        self.co = {c["id"]: c for c in b["companies"]}
        for c in self.co.values():
            c["name"] = RENAME.get(c["name"], c["name"])
        self.deals = [d for d in b["deals"] if d["confidence"] != "rumored"]
        self.dl = {d["id"]: d for d in self.deals}
        self.layers = {l["id"]: l["label"] for l in b["taxonomy"]["layers"]}
        self.deg = collections.Counter()
        for d in self.deals:
            self.deg[d["payer"]] += 1
            self.deg[d["payee"]] += 1
        self.as_of = datetime.date.fromisoformat(b["state"]["as_of"])
        # Layer to layer flows (13b builds these as layer_flows.json).
        flows = collections.defaultdict(list)
        for d in self.deals:
            flows[(self.layer(d["payer"]), self.layer(d["payee"]))].append(d)
        self.flows = []
        for (a, z), ds in flows.items():
            counted = [d for d in ds if not contingent(d)]
            cash = sum(high(d) for d in counted if d.get("amount_kind") == "one_time")
            ceil = sum(high(d) for d in counted if d.get("amount_kind") in CEILING_KINDS)
            self.flows.append({"from": a, "to": z, "deals": ds, "n": len(ds),
                               "cash": cash, "ceil": ceil, "total": cash + ceil,
                               "contingent": len(ds) - len(counted),
                               "paid": sum(d["amount_basis"] == "paid" for d in ds)})
        self.flows.sort(key=lambda f: -f["total"])

    def layer(self, cid):
        return self.co[cid]["layer"]

    def name(self, cid):
        return self.co[cid]["name"]

    def loops_ranked(self):
        def size(l):
            return sum(high(self.dl[x]) for x in l["deals"] if x in self.dl and not contingent(self.dl[x]))
        return sorted(self.b["loops"], key=lambda l: -size(l))


# ---------------------------------------------------------------- shared CSS

CSS = """
@font-face { font-family: "Newsreader"; font-weight: 400; font-display: swap; src: url("../site/fonts/newsreader-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Newsreader"; font-weight: 500; font-display: swap; src: url("../site/fonts/newsreader-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Newsreader"; font-weight: 600; font-display: swap; src: url("../site/fonts/newsreader-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; font-display: swap; src: url("../site/fonts/ibm-plex-sans-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; font-display: swap; src: url("../site/fonts/ibm-plex-sans-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 600; font-display: swap; src: url("../site/fonts/ibm-plex-sans-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; font-display: swap; src: url("../site/fonts/ibm-plex-mono-latin-400-normal.woff2") format("woff2"); }
:root {
  color-scheme: light;
  --paper: #f7f4ee; --ink: #1b1a17; --ink-2: #57534b; --muted: #8c877d; --rule: #ded8cc;
  --link: #3d3a34; --paid: #990f3d;
  --hw: #2a78d6; --infra: #169e6e; --model: #b84a8a; --cap: #c98500;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #16181b; --ink: #ece8e1; --ink-2: #b9b3a8; --muted: #8a857c; --rule: #34373c;
    --link: #d8d3ca; --paid: #e8728f;
    --hw: #4a8fe0; --infra: #249a72; --model: #c46aaa; --cap: #c08000;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #16181b; --ink: #ece8e1; --ink-2: #b9b3a8; --muted: #8a857c; --rule: #34373c;
  --link: #d8d3ca; --paid: #e8728f;
  --hw: #4a8fe0; --infra: #249a72; --model: #c46aaa; --cap: #c08000;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--paper); color: var(--ink);
  font: 400 15px/1.5 "IBM Plex Sans", system-ui, sans-serif; font-variant-numeric: lining-nums tabular-nums; }
.wrap { max-width: 1128px; margin: 0 auto; padding: 0 24px 64px; }
.col { max-width: 640px; }
a { color: var(--link); text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--ink-2); }
.meta, .mast { font: 400 12px/1.4 "IBM Plex Mono", ui-monospace, monospace; color: var(--muted); letter-spacing: .01em; }
.mast { padding: 20px 0 10px; border-bottom: 1px solid var(--ink); display: flex; justify-content: space-between; gap: 16px; }
h1 { font: 500 44px/1.05 "Newsreader", Georgia, serif; letter-spacing: -.01em; margin: 32px 0 12px; }
.state { font: 400 22px/1.35 "Newsreader", Georgia, serif; margin: 0 0 18px; }
h2 { font: 500 22px/1.2 "Newsreader", Georgia, serif; margin: 56px 0 4px; }
.filters { font-size: 13px; color: var(--ink-2); margin: 0 0 24px; }
.filters b { font-weight: 500; color: var(--ink); }
.filters .sep { color: var(--rule); padding: 0 6px; }
.fig { margin: 0; overflow-x: auto; }
.fig svg { display: block; width: 100%; min-width: 960px; height: auto; }
.legend { font-size: 12px; color: var(--ink-2); margin: 6px 0 0; }
.toggle { font-size: 12px; color: var(--ink-2); margin: 0 0 6px; }
.toggle b { font-weight: 600; color: var(--ink); border-bottom: 2px solid var(--ink); }
.num { font-family: "Newsreader", Georgia, serif; font-weight: 600; }
svg text { font-family: "IBM Plex Sans", system-ui, sans-serif; fill: var(--ink); }
svg .lab { font-size: 12px; fill: var(--ink-2); }
svg .layer { font-size: 12px; font-weight: 600; fill: var(--ink); }
svg .bench { font-size: 11px; fill: var(--muted); }
svg .chip { font-size: 11px; }
svg .n { font-family: "Newsreader", Georgia, serif; font-weight: 600; font-size: 13px; fill: var(--ink); }
svg .mk { font-family: "IBM Plex Mono", monospace; font-size: 12px; fill: var(--muted); }
svg .halo { paint-order: stroke; stroke: var(--paper); stroke-width: 4px; stroke-linejoin: round; }
.hw { color: var(--hw); }
.infra { color: var(--infra); }
.model { color: var(--model); }
.cap { color: var(--cap); }
.loops { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 12px; }
.loop h3 { font: 500 18px/1.2 "Newsreader", Georgia, serif; margin: 0 0 2px; }
.loop p { margin: 0 0 6px; font-size: 14px; color: var(--ink-2); }
.loop svg { width: 100%; height: auto; display: block; }
.rows { list-style: none; margin: 8px 0 0; padding: 0; }
.rows li { display: grid; grid-template-columns: 1fr auto; gap: 16px; padding: 7px 0; border-bottom: 1px solid var(--rule); align-items: baseline; }
.rows .amt { white-space: nowrap; }
.rows .num { font-size: 17px; }
.week { font: 400 12px/1.4 "IBM Plex Mono", monospace; color: var(--muted); margin: 10px 0 0; }
.chg li { grid-template-columns: 14px 1fr; gap: 10px; font-size: 14px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.shape { display: inline-block; width: 10px; height: 10px; border: 1.5px solid var(--ink-2); vertical-align: -1px; }
.shape.paid { background: var(--ink-2); }
.shape.cap { border-style: dashed; background: none; }
.foot { margin-top: 48px; padding-top: 10px; border-top: 1px solid var(--rule); }
.caveat { font-size: 13px; color: var(--ink-2); margin: 0 0 20px; }
@media (max-width: 720px) {
  .wrap { padding: 0 16px 48px; }
  h1 { font-size: 32px; }
  .state { font-size: 19px; }
  .loops { grid-template-columns: 1fr; }
  .mast { flex-direction: column; gap: 2px; }
}
"""


def page(title, body):
    return ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            "<title>%s</title>\n<style>%s</style>\n</head>\n<body>\n<div class=\"wrap\">\n%s\n</div>\n</body>\n</html>\n"
            % (esc(title), CSS, body))


def hatch_defs():
    out = []
    for fam in ("hw", "infra", "model", "cap"):
        out.append('<pattern id="h-%s" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                   '<rect width="5" height="5" fill="var(--paper)"/><rect width="2.2" height="5" fill="var(--%s)"/></pattern>' % (fam, fam))
    return "<defs>%s</defs>" % "".join(out)


# ---------------------------------------------------------------- page parts

def masthead(D):
    week = D.as_of.isocalendar()[1]
    return ('<div class="mast"><span>AI Value Chain · Week %d · data as of %s</span>'
            '<span>%%s</span></div>' % (week, D.as_of.strftime("%-d %b %Y")))


STATE_LINE = ("OpenAI and Anthropic have committed to 17 compute deals with clouds and chipmakers; "
              "none is recorded as paid yet.")


def header(D, which):
    return (masthead(D) % ('<span class="mtag">Mockup %s</span>' % which)
            + '<div class="col"><h1>Who pays whom to build AI</h1>'
            + '<p class="state">%s</p>' % esc(STATE_LINE)
            + '<p class="filters"><b>Filed, company-stated, reported</b><span class="sep">|</span>Rumors hidden'
              '<span class="sep">|</span><a href="#">More filters</a></p></div>')


def ribbon_title(D, f):
    head = "%s to %s: %d deal%s" % (D.layers[f["from"]], D.layers[f["to"]], f["n"], "" if f["n"] == 1 else "s")
    if f["total"]:
        line2 = "%s in announced ceilings, %d paid" % (money(f["total"]), f["paid"])
    else:
        line2 = "No amount disclosed"
    if f["contingent"]:
        line2 += "; %d guarantee left out of the width" % f["contingent"]
    return "<title>%s\n%s</title>" % (esc(head), esc(line2))


def width_of(total, wmax, vmax):
    return 0 if not total else max(1.6, wmax * total / vmax)


def chips(D, layer, x0, y0, step=21, wrap_w=88):
    """Company names in a column: dot size by degree (deal count); benched names muted (D34)."""
    cs = sorted((c for c in D.co.values() if c["layer"] == layer), key=lambda c: (-D.deg[c["id"]], c["name"]))
    fam = FAMILY[layer]
    out, y = [], y0
    if not any(D.deg[c["id"]] for c in cs):
        out.append('<text class="bench" x="%.1f" y="%.1f">tracked, no</text>' % (x0, y))
        out.append('<text class="bench" x="%.1f" y="%.1f">sourced flows yet</text>' % (x0, y + 14))
        y += 34
        for c in cs:
            out.append('<text class="bench" x="%.1f" y="%.1f">%s</text>' % (x0, y, esc(c["name"])))
            y += 16
        return "".join(out), y
    for c in cs:
        k = D.deg[c["id"]]
        if k:
            r = 2.2 + 1.1 * math.sqrt(k)
            out.append('<g><title>%s\n%d deal%s</title><circle class="%s" fill="currentColor" cx="%.1f" cy="%.1f" r="%.1f"/>'
                       '<text class="chip" x="%.1f" y="%.1f">%s</text></g>'
                       % (esc(c["name"]), k, "" if k == 1 else "s", fam, x0 + 5, y - 4, r, x0 + 14, y, esc(c["name"])))
        else:
            out.append('<text class="bench" x="%.1f" y="%.1f">%s</text>' % (x0 + 14, y, esc(c["name"])))
        y += step
    return "".join(out), y


def tapered(x1, x2, w, wt, y0, depth):
    """A ribbon below y0 from x1 (payer, width w) to x2 (payee, width wt)."""
    s = 1 if x2 >= x1 else -1
    o1, o2 = x1 - s * w / 2, x2 + s * wt / 2
    i1, i2 = x1 + s * w / 2, x2 - s * wt / 2
    do = depth + (w + wt) / 4
    di = max(4, depth - (w + wt) / 4)
    return ("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f L%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f Z"
            % (o1, y0, o1, y0 + do * 1.33, o2, y0 + do * 1.33, o2, y0,
               i2, y0, i2, y0 + di * 1.33, i1, y0 + di * 1.33, i1, y0))


def hero_a(D):
    """Variant A: 11 columns (Capital last), chips inside, tapered ribbons in one band below."""
    order = CHAIN + ["capital"]
    W, cw = 1080, 1080 / 11
    cx = {l: cw * i + cw / 2 for i, l in enumerate(order)}
    parts = [hatch_defs()]
    ybottom = 0
    for i, l in enumerate(order):
        x0 = cw * i + 4
        fam = FAMILY[l]
        parts.append('<text class="layer" x="%.1f" y="14">%s</text>' % (x0, esc(D.layers[l])))
        parts.append('<rect class="%s" fill="currentColor" x="%.1f" y="22" width="%.1f" height="3"/>' % (fam, x0, cw - 10))
        s, y = chips(D, l, x0, 46)
        parts.append(s)
        ybottom = max(ybottom, y)
    y0 = ybottom + 14
    parts.append('<line x1="0" x2="%d" y1="%.1f" y2="%.1f" stroke="var(--rule)"/>' % (W, y0, y0))
    vmax = max(f["total"] for f in D.flows)
    WMAX = 26
    # Port slots: each column shares its width among the ribbon ends that touch it.
    ends = collections.defaultdict(list)
    subs = []
    for f in D.flows:
        w = width_of(f["total"], WMAX, vmax)
        parts_f = []
        if f["total"]:
            if f["cash"]:
                parts_f.append(("cash", w * f["cash"] / f["total"]))
            if f["ceil"]:
                parts_f.append(("ceil", w * f["ceil"] / f["total"]))
        else:
            parts_f.append(("none", 1.0))
        for kind, ww in parts_f:
            sub = {"f": f, "kind": kind, "w": ww, "wt": ww if kind == "none" else max(1.0, ww * 0.3)}
            subs.append(sub)
            ends[f["from"]].append((sub, "a"))
            ends[f["to"]].append((sub, "z"))
    port = {}
    for l, lst in ends.items():
        def key(item):
            sub, side = item
            other = sub["f"]["to"] if side == "a" else sub["f"]["from"]
            return (cx[other] - cx[l], sub["kind"])
        lst.sort(key=key)
        widths = [(s["w"] if side == "a" else s["wt"]) + 1.2 for s, side in lst]
        x = cx[l] - sum(widths) / 2
        for (sub, side), ww in zip(lst, widths):
            port[(id(sub), side)] = x + ww / 2
            x += ww
    maxdepth = 0
    labels = []
    for sub in sorted(subs, key=lambda s: -abs(cx[s["f"]["to"]] - cx[s["f"]["from"]])):
        f = sub["f"]
        x1, x2 = port[(id(sub), "a")], port[(id(sub), "z")]
        if f["from"] == f["to"]:
            x1, x2 = cx[f["from"]] - 16, cx[f["from"]] + 16
        span = abs(x2 - x1)
        depth = min(300, 16 + 0.3 * span)
        maxdepth = max(maxdepth, depth + 20)
        fam = FAMILY[f["from"]]
        if sub["kind"] == "none":
            d = "M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" % (x1, y0, x1, y0 + depth * 1.33, x2, y0 + depth * 1.33, x2, y0)
            parts.append('<path class="%s" d="%s" fill="none" stroke="currentColor" stroke-width="0.9" stroke-dasharray="2 3" opacity=".7">%s</path>'
                         % (fam, d, ribbon_title(D, f)))
        else:
            fill = "var(--%s)" % fam if sub["kind"] == "cash" else "url(#h-%s)" % fam
            parts.append('<path d="%s" fill="%s" stroke="var(--%s)" stroke-width=".6" opacity=".92">%s</path>'
                         % (tapered(x1, x2, sub["w"], sub["wt"], y0, depth), fill, fam, ribbon_title(D, f)))
        if sub["kind"] != "none" and f["total"] >= 20e9 and sub is next(s for s in subs if s["f"] is f):
            labels.append(((x1 + x2) / 2, y0 + depth + (sub["w"] + sub["wt"]) / 4 + 15, f))
    placed = []
    for x, y, f in sorted(labels, key=lambda t: t[1]):
        while any(abs(x - px) < 100 and abs(y - py) < 16 for px, py in placed):
            y += 16
        placed.append((x, y))
        parts.append('<text class="n halo" x="%.1f" y="%.1f" text-anchor="middle">%s'
                     '<tspan class="lab" dx="4">%d deal%s</tspan></text>'
                     % (x, y, money(f["total"]), f["n"], "" if f["n"] == 1 else "s"))
    H = y0 + maxdepth + 10
    return ('<svg viewBox="0 0 %d %.0f" role="img" aria-label="The AI value chain in eleven layers with money flows between them">%s</svg>'
            % (W, H, "".join(parts)))


def arc_band(x1, x2, y0, depth, up):
    s = -1 if up else 1
    return ("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f"
            % (x1, y0, x1, y0 + s * depth * 1.33, x2, y0 + s * depth * 1.33, x2, y0))


def hero_b(D):
    """Variant B: ten layers on one line; paying suppliers arcs above, investing arcs below,
    Capital as a rail along the bottom with ribbons rising into the layers it funds."""
    W, cw = 1080, 1080 / 10
    cx = {l: cw * i + cw / 2 for i, l in enumerate(CHAIN)}
    parts = [hatch_defs()]
    ybottom = 0
    for i, l in enumerate(CHAIN):
        x0 = cw * i + 6
        parts.append('<text class="layer" x="%.1f" y="14">%s</text>' % (x0, esc(D.layers[l])))
        s, y = chips(D, l, x0, 36, step=19)
        parts.append(s)
        ybottom = max(ybottom, y)
    vmax = max(f["total"] for f in D.flows)
    WMAX = 22
    up_depth = 0
    for f in D.flows:
        if f["from"] in cx and f["to"] in cx and CHAIN.index(f["to"]) < CHAIN.index(f["from"]):
            up_depth = max(up_depth, min(150, 14 + 0.26 * abs(cx[f["to"]] - cx[f["from"]])) + WMAX)
    y0 = ybottom + 24 + up_depth
    parts.append('<line x1="0" x2="%d" y1="%.1f" y2="%.1f" stroke="var(--ink-2)" stroke-width="1"/>' % (W, y0, y0))
    parts.append('<text class="lab" x="0" y="%.1f">paying suppliers, right to left</text>' % (y0 - up_depth + 4))
    deg_layer = collections.Counter()
    for d in D.deals:
        deg_layer[D.layer(d["payer"])] += 1
        deg_layer[D.layer(d["payee"])] += 1
    low_depth = 0
    rail_y = None
    arcs, labels = [], []
    rises = [f for f in D.flows if f["from"] == "capital" or f["to"] == "capital"]
    for f in sorted(D.flows, key=lambda f: -abs(cx.get(f["to"], 0) - cx.get(f["from"], 0))):
        if f in rises:
            continue
        a, z = cx[f["from"]], cx[f["to"]]
        if f["from"] == f["to"]:
            a, z = a - 18, a + 18
        up = CHAIN.index(f["to"]) < CHAIN.index(f["from"])
        depth = min(150, 14 + 0.26 * abs(z - a))
        if not up:
            low_depth = max(low_depth, depth + WMAX)
        fam = FAMILY[f["from"]]
        path = arc_band(a, z, y0, depth, up)
        w = width_of(f["total"], WMAX, vmax)
        if not w:
            arcs.append('<path class="%s" d="%s" fill="none" stroke="currentColor" stroke-width=".9" stroke-dasharray="2 3" opacity=".7">%s</path>'
                        % (fam, path, ribbon_title(D, f)))
            continue
        wc = w * f["cash"] / f["total"]
        wh = w - wc
        # Two concentric strokes: the cash part inside, the ceiling part (hatched) outside.
        if wh:
            arcs.append('<path d="%s" fill="none" stroke="url(#h-%s)" stroke-width="%.1f">%s</path>'
                        % (arc_band(a, z, y0, depth + wc / 2, up), fam, wh, ribbon_title(D, f)))
        if wc:
            arcs.append('<path d="%s" fill="none" stroke="var(--%s)" stroke-width="%.1f">%s</path>'
                        % (arc_band(a, z, y0, depth - wh / 2, up), fam, wc, ribbon_title(D, f)))
        if f["total"] >= 20e9:
            ly = y0 + (-1 if up else 1) * (depth + w / 2 + 8) + (0 if up else 10)
            labels.append('<text class="n halo" x="%.1f" y="%.1f" text-anchor="middle">%s<tspan class="lab" dx="4">%d deal%s</tspan></text>'
                          % ((a + z) / 2, ly, money(f["total"]), f["n"], "" if f["n"] == 1 else "s"))
    parts.extend(arcs)
    for l in CHAIN:
        r = 3 + 1.6 * math.sqrt(deg_layer[l])
        if deg_layer[l]:
            parts.append('<circle class="%s" fill="currentColor" cx="%.1f" cy="%.1f" r="%.1f" stroke="var(--paper)" stroke-width="2"/>'
                         % (FAMILY[l], cx[l], y0, r))
        else:
            parts.append('<circle cx="%.1f" cy="%.1f" r="3" fill="var(--paper)" stroke="var(--muted)"/>' % (cx[l], y0))
    rail_y = y0 + low_depth + 34
    parts.append('<text class="lab" x="0" y="%.1f">investing, left to right</text>' % (y0 + low_depth - 2))
    parts.append('<line class="cap" stroke="currentColor" x1="0" x2="%d" y1="%.1f" y2="%.1f" stroke-width="3"/>' % (W, rail_y, rail_y))
    capnames = sorted((c for c in D.co.values() if c["layer"] == "capital"), key=lambda c: -D.deg[c["id"]])
    parts.append('<text class="layer" x="0" y="%.1f">Capital</text>' % (rail_y + 20))
    parts.append('<text class="chip" x="62" y="%.1f">%s</text>' % (rail_y + 20, esc(" · ".join(c["name"] for c in capnames))))
    # Rising ribbons: from the rail to each funded layer, offset so they do not sit on the node.
    for f in rises:
        other = f["to"] if f["from"] == "capital" else f["from"]
        if other not in cx:
            continue
        x = cx[other] + (14 if f["from"] == "capital" else -14)
        w = width_of(f["total"], WMAX, vmax)
        fam = FAMILY[f["from"]]
        if not w:
            parts.append('<line class="%s" stroke="currentColor" x1="%.1f" x2="%.1f" y1="%.1f" y2="%.1f" stroke-width=".9" stroke-dasharray="2 3" opacity=".7">%s</line>'
                         % (fam, x, x, rail_y, y0 + 8, ribbon_title(D, f)))
            continue
        wc = w * f["cash"] / f["total"]
        wh = w - wc
        if wc:
            parts.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="var(--%s)">%s</rect>'
                         % (x - w / 2, y0 + 8, wc, rail_y - y0 - 8, fam, ribbon_title(D, f)))
        if wh:
            parts.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#h-%s)" stroke="var(--%s)" stroke-width=".6">%s</rect>'
                         % (x - w / 2 + wc, y0 + 8, wh, rail_y - y0 - 8, fam, fam, ribbon_title(D, f)))
        if f["total"] >= 20e9:
            labels.append('<text class="n halo" x="%.1f" y="%.1f">%s<tspan class="lab" dx="4">%d deals</tspan></text>'
                          % (x + w / 2 + 4, rail_y - 10, money(f["total"]), f["n"]))
    parts.extend(labels)
    H = rail_y + 30
    return ('<svg viewBox="0 0 %d %.0f" role="img" aria-label="The AI value chain on one line with money flows above and below">%s</svg>'
            % (W, H, "".join(parts)))


# ---------------------------------------------------------------- loops

def deal_style(d):
    if contingent(d):
        return "contingent"
    if d["amount_basis"] == "paid":
        return "paid"
    if d.get("amount_kind") == "cap" or is_range(d):
        return "cap"
    return "committed"


def arc_marks(path, fam, w, style, frac):
    """Basis by shape (D36): paid solid, committed outline, cap or range dashed outline,
    paid to date a fill inside the outline, contingent a grey outline."""
    if not w:
        return '<path d="%s" fill="none" class="%s" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>' % (path, fam)
    if style == "paid":
        return '<path d="%s" fill="none" stroke="var(--%s)" stroke-width="%.1f"/>' % (path, fam, w)
    w = max(w, 5)
    col = "var(--muted)" if style == "contingent" else "var(--%s)" % fam
    dash = ' stroke-dasharray="5 3"' if style == "cap" else ""
    s = ('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f"%s/>'
         '<path d="%s" fill="none" stroke="var(--paper)" stroke-width="%.1f"/>'
         '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity=".14"/>'
         % (path, col, w, dash, path, w - 2.6, path, col, w - 2.6))
    if frac:
        s += '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f"/>' % (part_of(path, frac), col, w - 2.6)
    return s


def part_of(path, t):
    """The first share t of a one-segment cubic path (de Casteljau split), for paid to date."""
    n = [float(x) for x in re.findall(r"-?[0-9.]+", path)]
    p0, p1, p2, p3 = (n[0], n[1]), (n[2], n[3]), (n[4], n[5]), (n[6], n[7])
    lerp = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    q0, q1 = lerp(p0, p1), lerp(p1, p2)
    q2 = lerp(p2, p3)
    r0, r1 = lerp(q0, q1), lerp(q1, q2)
    e = lerp(r0, r1)
    return "M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" % (p0 + q0 + r0 + e)


def loop_side(D, deals_ab):
    return sorted(deals_ab, key=lambda d: -high(d))


def arc_label(d):
    pt = PAID_TO_DATE.get(d["id"])
    if pt and high(d):
        return "%s of %s paid" % (money(pt), money(high(d))), "", MARK[d["confidence"]]
    amt = amount_words(d)
    kind = "" if amt == "undisclosed" else " " + KIND_WORD[d.get("amount_kind")]
    if amt.startswith("up to") and kind == " up to":
        kind = ""
    return amt, kind.strip(), MARK[d["confidence"]]


def loop_svg(D, loop, W=340, scale_max=250e9, wmax=14, big=False):
    ids = [x for x in loop["deals"] if x in D.dl]
    cos = []
    for x in ids:
        for c in (D.dl[x]["payer"], D.dl[x]["payee"]):
            if c not in cos:
                cos.append(c)
    if len(cos) != 2:
        return None  # triangles are drawn in 13c
    # A is the side that put money in first (equity), so the top arc reads A to B.
    a, b = cos
    if not any(D.dl[x]["payer"] == a and D.dl[x]["type"] in ("equity_investment", "warrant_or_equity_grant") for x in ids):
        a, b = b, a
    pad = 96 if big else 78
    xa, xb = pad, W - pad
    fs = 1.25 if big else 1
    top = loop_side(D, [D.dl[x] for x in ids if D.dl[x]["payer"] == a])
    bot = loop_side(D, [D.dl[x] for x in ids if D.dl[x]["payer"] == b])

    def stack(ds, up):
        out, labels, depth = [], [], 18 * fs
        for d in reversed(ds):  # smallest innermost
            w = wmax * high(d) / scale_max if high(d) else 0
            style = deal_style(d)
            if w and style != "paid":
                w = max(w, 5)
            depth += w / 2
            path = arc_band(xa, xb, 0, depth, up)
            frac = PAID_TO_DATE.get(d["id"], 0) / high(d) if high(d) else 0
            out.append(arc_marks(path, FAMILY[D.layer(d["payer"])], w, style, frac))
            amt, kind, mk = arc_label(d)
            labels.append((depth, w, amt, kind, mk))
            depth += w / 2 + 15 * fs
        return out, labels, depth

    t_out, t_lab, t_depth = stack(top, True)
    b_out, b_lab, b_depth = stack(bot, False)
    yc = t_depth + 18
    H = yc + b_depth + 8
    g = []
    for s in t_out + b_out:
        g.append(s)
    body = '<g transform="translate(0 %.1f)">%s' % (yc, "".join(g))
    for depth, w, amt, kind, mk in t_lab:
        body += ('<text class="n halo" x="%.1f" y="%.1f" text-anchor="middle" style="font-size:%.0fpx">%s'
                 '<tspan class="lab" dx="4">%s</tspan><tspan class="mk" dx="4">%s</tspan></text>'
                 % (W / 2, -depth - w / 2 - 3, 13 * fs, esc(amt), esc(kind), mk))
    for depth, w, amt, kind, mk in b_lab:
        body += ('<text class="n halo" x="%.1f" y="%.1f" text-anchor="middle" style="font-size:%.0fpx">%s'
                 '<tspan class="lab" dx="4">%s</tspan><tspan class="mk" dx="4">%s</tspan></text>'
                 % (W / 2, depth + w / 2 + 13 * fs, 13 * fs, esc(amt), esc(kind), mk))
    for x, c, anchor in ((xa, a, "end"), (xb, b, "start")):
        body += '<circle class="%s" fill="currentColor" cx="%.1f" cy="0" r="%.1f"/>' % (FAMILY[D.layer(c)], x, 4.5 * fs)
        body += ('<text class="layer" x="%.1f" y="4" text-anchor="%s" style="font-size:%.0fpx">%s</text>'
                 % (x + (-9 if anchor == "end" else 9), anchor, 12 * fs, esc(D.name(c))))
    body += "</g>"
    return ('<svg viewBox="0 0 %d %.0f" role="img" aria-label="%s">%s%s</svg>'
            % (W, H, esc(loop["name"]), hatch_defs(), body)), a, b, top, bot


LOOP_LINES = {
    # One line each, 15 words or fewer, single sourced figures only (never summed).
    "microsoft-openai": "Microsoft has funded $11.8B of $13B; OpenAI promised $250B of Azure back.",
    "amazon-openai": "Amazon paid $50B into OpenAI; OpenAI promised $38B, then $100B, back in AWS compute.",
    "amazon-anthropic": "Amazon has paid $8B and committed up to $25B more; Anthropic promised over $100B back.",
    "nvidia-openai": "NVIDIA plans up to $100B into OpenAI; OpenAI promised 10 GW of NVIDIA systems.",
}


def loops_section(D):
    top3 = []
    for l in D.loops_ranked():
        if l["id"] in LOOP_LINES:
            r = loop_svg(D, l)
            if r:
                top3.append((l, r[0]))
        if len(top3) == 3:
            break
    cards = "".join('<div class="loop"><h3><a href="loop-card.html">%s</a></h3><p>%s</p>%s</div>'
                    % (esc(l["name"]), esc(LOOP_LINES[l["id"]]), svg) for l, svg in top3)
    n_deals = len({x for l in D.b["loops"] for x in l["deals"]})
    return ('<h2>Three largest loops</h2><p class="meta">%d loops, %d deals</p>'
            '<div class="loops">%s</div>' % (len(D.b["loops"]), n_deals, cards))


def changes_section(D):
    week = D.as_of.isocalendar()[1]
    evs = sorted(D.b["events"], key=lambda e: (e["date"], e["id"]), reverse=True)
    evs = [e for e in evs if datetime.date.fromisoformat(e["date"]).isocalendar()[1] == week][:5]
    rows = []
    for e in evs:
        d = D.dl.get(e.get("deal"))
        if not d:
            continue
        fam = FAMILY[D.layer(d["payer"])]
        what = {"basis_change": "now paid" if d["amount_basis"] == "paid" else "basis changed",
                "status_change": "now " + d["status"], "filing": "now filed",
                "new_deal": "new", "amount_change": "amount updated"}[e["kind"]]
        glyph = ""
        if e["kind"] == "basis_change" and d["amount_basis"] == "paid":
            glyph = ' <span class="shape"></span> <span class="meta">to</span> <span class="shape paid"></span>'
        rows.append('<li title="%s"><span class="dot %s"></span><span>%s <span class="meta">to</span> %s, '
                    '<span class="num">%s</span> %s: %s%s</span></li>'
                    % (esc(e["summary"]), fam, esc(D.name(d["payer"])), esc(D.name(d["payee"])),
                       esc(amount_words(d)), esc(TYPE_WORD[d["type"]]), what, glyph))
    return ('<h2>What changed</h2><p class="week">Week %d</p><ul class="rows chg">%s</ul>' % (week, "".join(rows)))


def top_flows(D):
    ds = sorted((d for d in D.deals if high(d) and not contingent(d)), key=lambda d: (-high(d), d["id"]))[:10]
    rows = []
    pairs = collections.Counter((d["payer"], d["payee"]) for d in ds)
    for d in ds:
        st = deal_style(d)
        year = ' <span class="meta">%s</span>' % d["announced"][:4] if pairs[(d["payer"], d["payee"])] > 1 else ""
        shape = {"paid": "shape paid", "cap": "shape cap"}.get(st, "shape")
        rows.append('<li><span>%s <span class="meta">to</span> %s</span><span class="amt"><span class="%s"></span> '
                    '<span class="num">%s</span> <span class="meta">%s</span></span></li>'
                    % (esc(D.name(d["payer"])), esc(D.name(d["payee"])) + year,
                       shape, esc(amount_words(d)), MARK[d["confidence"]]))
    return '<h2>Top 10 flows</h2><ul class="rows col">%s</ul>' % "".join(rows)


def footer():
    return ('<p class="meta foot">F filed · S company-stated · R reported · '
            'solid paid, outline committed, dashed up to · <a href="#">Method and sources</a></p>')


def overview(D, which, hero, legend):
    body = (header(D, which)
            + '<p class="toggle">Width: <b>announced ceilings, not cash</b><span class="sep" style="color:var(--rule);padding:0 6px">|</span>deal count</p>'
            + '<figure class="fig">%s</figure>' % hero
            + '<p class="legend">%s</p>' % legend
            + loops_section(D) + changes_section(D) + top_flows(D) + footer())
    return page("Overview mockup %s, AI Value Chain" % which, body)


def loop_card(D):
    l = next(x for x in D.b["loops"] if x["id"] == "amazon-openai")
    svg, a, b, top, bot = loop_svg(D, l, W=640, scale_max=100e9, wmax=22, big=True)
    vmax = max(sum(high(d) for d in top), sum(high(d) for d in bot))
    BW = 640

    def bar(label, ds):
        x, segs = 0.0, []
        for d in ds:
            w = BW * high(d) / vmax
            st = deal_style(d)
            fam = FAMILY[D.layer(d["payer"])]
            if st == "paid":
                segs.append('<rect x="%.1f" y="0" width="%.1f" height="22" fill="var(--%s)"/>' % (x, w - 2, fam))
            else:
                dash = ' stroke-dasharray="5 3"' if st == "cap" else ""
                segs.append('<rect x="%.1f" y="0.75" width="%.1f" height="20.5" fill="none" stroke="var(--%s)" stroke-width="1.5"%s/>'
                            % (x + .75, w - 3.5, fam, dash))
            amt, kind, mk = arc_label(d)
            segs.append('<text class="n" x="%.1f" y="40">%s<tspan class="lab" dx="4">%s</tspan><tspan class="mk" dx="4">%s</tspan></text>'
                        % (x, esc(amt), esc(kind), mk))
            x += w
        return ('<p class="meta" style="margin:16px 0 4px">%s</p><svg viewBox="0 0 %d 46" style="width:100%%;height:auto;display:block">%s</svg>'
                % (esc(label), BW, "".join(segs)))

    body = (masthead(D) % '<span class="mtag">Loop card mockup</span>'
            + '<div class="col"><h1>Loops</h1>'
            + '<p class="state">11 loops, 30 deals, OpenAI on 6, Anthropic on 3.</p>'
            + '<p class="caveat">Nets are not shown: caps, ranges and multi-year totals cannot be netted against cash.</p>'
            + '<div class="loop"><h3>%s</h3><p>%s</p>%s' % (esc(l["name"]), esc(LOOP_LINES[l["id"]]), svg)
            + bar("%s put in" % D.name(a), top) + bar("%s promised back" % D.name(b), bot)
            + '</div></div>' + footer())
    return page("Loop card mockup, AI Value Chain", body)


def visible_words(htmltext):
    """Words a reader sees outside the charts (D39 counts these against the 250 budget)."""
    t = re.sub(r"<head>.*?</head>", " ", htmltext, flags=re.S)
    t = re.sub(r'<span class="mtag">.*?</span>', " ", t)
    t = re.sub(r"<svg.*?</svg>", " ", t, flags=re.S)
    t = re.sub(r"<title>.*?</title>", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return sum(1 for w in html.unescape(t).split() if re.search(r"[A-Za-z0-9]", w))


def main():
    D = Data()
    leg_a = "Tapers toward who gets paid · color: payer's layer family · hatched: caps and multi-year totals · dotted: undisclosed"
    leg_b = "Above: paying suppliers · below: investing · color: payer's layer family · hatched: caps and multi-year totals · dotted: undisclosed"
    pages = {
        "overview-a.html": overview(D, "A", hero_a(D), leg_a),
        "overview-b.html": overview(D, "B", hero_b(D), leg_b),
        "loop-card.html": loop_card(D),
    }
    OUT.mkdir(exist_ok=True)
    for name, text in pages.items():
        (OUT / name).write_text(text)
        print("%s: %d bytes, %d visible words outside charts" % (name, len(text), visible_words(text)))


if __name__ == "__main__":
    main()
