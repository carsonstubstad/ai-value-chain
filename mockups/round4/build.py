#!/usr/bin/env python3
"""Round 4 design mockups: the A plus A pick restyled (blue ramp, one pop color, control vocabulary, loop rings, chain wheel), built from site/data/bundle.json with the standard library only.

Writes static HTML pages next to this file. Nothing under site/, data/ or scripts/ is touched.
Run from the repo root: python3 mockups/round3/build.py
"""
import json, math, os, re, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BUNDLE = os.path.join(ROOT, "site", "data", "bundle.json")
FONTS = "../../site/fonts/"

b = json.load(open(BUNDLE))
C = {c["id"]: c for c in b["companies"]}
D = {d["id"]: d for d in b["deals"]}
S = {s["id"]: s for s in b["sources"]}
LAYERS = OrderedDict((l["id"], l) for l in b["taxonomy"]["layers"])
CHAIN = [l for l in LAYERS]  # taxonomy order, Capital last
FAMILY = {"equipment": "hw", "chip_design": "hw", "foundry": "hw", "memory": "hw", "systems": "hw",
          "power": "infra", "data_centers": "infra", "hyperscale": "infra", "labs": "model", "applications": "model", "capital": "cap"}
MARK = {"filed": "F", "company_stated": "S", "reported": "R", "rumored": "?"}
TYPE_SHORT = {"equity_investment": "equity", "warrant_or_equity_grant": "warrant", "jv_contribution": "JV stake", "acquisition": "acquisition",
              "debt_or_gpu_backed_loan": "loan", "guarantee_or_backstop": "guarantee", "purchase_commitment": "purchase", "capacity_lease": "compute lease",
              "cloud_credits": "cloud credits", "power_supply_agreement": "power deal", "revenue_share": "revenue share", "government_grant_or_incentive": "grant"}
KIND = {"cap": "", "multi_year_total": "multi-year", "annual_run_rate": "per year", "one_time": "", "undisclosed": ""}
AS_OF = b["state"]["as_of"]
STATE = b["state"]["text"]

# ---------- helpers that mirror site/js/lib.js ----------

def esc(s):
    return str(s if s is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def money(v):
    if v >= 1e9:
        n = v / 1e9
        return "$" + (f"{n:.0f}" if v >= 1e11 else f"{n:.1f}".rstrip("0").rstrip(".")) + "B"
    return "$" + f"{v / 1e6:.0f}" + "M"

def hi(d):
    return d.get("amount_usd_high") or d.get("amount_usd_low") or 0

def has_amount(d):
    return d.get("amount_usd_high") is not None or d.get("amount_usd_low") is not None

def is_range(d):
    return d.get("amount_usd_low") is None or d.get("amount_usd_high") is None or d["amount_usd_low"] != d["amount_usd_high"] or d.get("amount_kind") == "cap"

def amount_text(d):
    lo, h = d.get("amount_usd_low"), d.get("amount_usd_high")
    if lo is None and h is None:
        return "undisclosed"
    tag = " (syndicate total)" if d.get("syndicate_total") else ""
    if lo is None:
        return "up to " + money(h) + tag
    if h is None:
        return "over " + money(lo) + tag
    return (money(lo) if lo == h else money(lo) + " to " + money(h)) + tag

def amount_label(d):
    """Amount, with the kind in words (the brief: caps and multi-year go in the label text)."""
    if d.get("paid_to_date_usd") and hi(d):
        return f"{money(d['paid_to_date_usd'])} of {money(hi(d))} paid"
    a = amount_text(d)
    k = KIND.get(d.get("amount_kind") or "", "")
    return f"{a}, {k}" if k else a

def basis(d):
    if d.get("contingent"):
        return "contingent"
    if d["amount_basis"] == "paid":
        return "paid"
    return "committed"

def fmt_date(iso):
    y, m, dd = iso.split("-")
    return f"{int(dd)} {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(m)-1]} {y}"

def iso_week(iso):
    import datetime
    return datetime.date.fromisoformat(iso).isocalendar()[1]

def src_url(d):
    return S.get(d["sources"][0], {}).get("url", "") if d.get("sources") else ""

def src_label(d):
    s = S.get(d["sources"][0], {}) if d.get("sources") else {}
    return s.get("publisher") or s.get("label") or "source"

VISIBLE = [d for d in b["deals"] if d["confidence"] != "rumored" and d["payer"] in C and d["payee"] in C]

def layer_flows(deals):
    m = OrderedDict()
    for d in deals:
        a, c = C[d["payer"]]["layer"], C[d["payee"]]["layer"]
        f = m.setdefault((a, c), {"from": a, "to": c, "deals": [], "cash": 0.0, "ceil": 0.0, "paid_amt": 0.0, "paid_n": 0, "contingent": 0, "noamt": 0})
        f["deals"].append(d)
        if d["amount_basis"] == "paid":
            f["paid_n"] += 1
        if d.get("contingent"):
            f["contingent"] += 1
            continue
        if not has_amount(d):
            f["noamt"] += 1
            continue
        if d.get("amount_kind") == "one_time":
            f["cash"] += hi(d)
        else:
            f["ceil"] += hi(d)
        if d["amount_basis"] == "paid":
            f["paid_amt"] += hi(d)
        elif d.get("paid_to_date_usd"):
            f["paid_amt"] += d["paid_to_date_usd"]
    out = []
    for f in m.values():
        f["n"] = len(f["deals"])
        f["total"] = f["cash"] + f["ceil"]
        f["key"] = f["from"] + ">" + f["to"]
        out.append(f)
    out.sort(key=lambda f: (-f["total"], -f["n"], f["key"]))
    return out

def flow_word(f):
    """What the width is made of: ceilings when any cap or multi-year total is in it, else paid or committed."""
    if f["ceil"] > 0:
        return "ceilings"
    if f["paid_amt"] >= f["total"] and f["total"] > 0:
        return "paid"
    return "committed"

def flow_label(f):
    return f"{money(f['total'])} {flow_word(f)} · {f['n']} deal{'s' if f['n'] != 1 else ''}"

FLOWS = layer_flows(VISIBLE)
AMT_FLOWS = [f for f in FLOWS if f["total"] > 0]
NOAMT_FLOWS = [f for f in FLOWS if f["total"] == 0]

def loop_view(l):
    deals = [D[i] for i in l["deals"] if D[i]["confidence"] != "rumored"]
    cos = []
    for d in deals:
        for c in (d["payer"], d["payee"]):
            if c not in cos:
                cos.append(c)
    equity = {"equity_investment", "warrant_or_equity_grant", "jv_contribution"}
    first = next((c for c in cos if any(d["payer"] == c and d["type"] in equity for d in deals)), cos[0])
    order = [first] + [c for c in cos if c != first]
    put = [d for d in deals if d["payer"] == first]
    back = [d for d in deals if d["payer"] != first]
    size = lambda ds: sum(hi(d) for d in ds if not d.get("contingent"))
    return {"loop": l, "deals": deals, "cos": order, "put": put, "back": back, "put_amt": size(put), "back_amt": size(back),
            "size": size(deals), "cont": [d for d in deals if d.get("contingent")]}

LOOPS = sorted((loop_view(l) for l in b["loops"]), key=lambda v: (-v["back_amt"], -v["put_amt"], v["loop"]["name"]))
TOP3 = sorted(LOOPS, key=lambda v: (-v["size"], v["loop"]["name"]))[:3]
EVENTS = sorted([e for e in b["events"] if e["deal"] in D], key=lambda e: (e["date"], e["id"]), reverse=True)
TOP10 = sorted([d for d in VISIBLE if has_amount(d) and not d.get("contingent")], key=lambda d: (-hi(d), d["id"]))[:10]
PAID = [d for d in VISIBLE if d["amount_basis"] == "paid"]

def col(layer):
    return f"var(--{FAMILY[layer]})"

# ---------- the three findings (real, sourced, one figure, one link each) ----------

labs_hyp = next(f for f in FLOWS if f["key"] == "labs>hyperscale")
amazon_openai = D["amazon-openai-equity-2026-02"]
ms_openai = next(v for v in LOOPS if v["loop"]["id"] == "microsoft-openai")
assert all(d["type"] in {"equity_investment", "warrant_or_equity_grant"} for d in PAID), "finding 2 no longer holds"
assert max(PAID, key=hi)["id"] == amazon_openai["id"]
assert LOOPS[0] is ms_openai
FINDINGS = [
    {"fig": money(labs_hyp["total"]), "text": f"Labs promise clouds the chain's largest flow: {labs_hyp['n']} deals of announced ceilings, none recorded as paid.",
     "link": "#/flows?rib=labs>hyperscale", "evid": "ribbon labs > hyperscale"},
    {"fig": money(hi(amazon_openai)), "text": f"All {len(PAID)} paid deals are equity stakes; the largest is Amazon's stake in OpenAI, filed.",
     "link": "#/company/openai", "evid": "deal amazon-openai-equity-2026-02"},
    {"fig": money(ms_openai["back_amt"]), "text": "The largest loop is Microsoft and OpenAI: Azure promised back against $13B of investment, none recorded as paid.",
     "link": "#/loops#loop-microsoft-openai", "evid": "loop microsoft-openai"},
]
for f in FINDINGS:
    assert len(f["text"].split()) <= 20, f["text"]

# ---------- shared CSS: the site's tokens and type (site/css/site.css), plus mockup components ----------

CSS = """
@font-face { font-family: "Newsreader"; font-weight: 400; src: url("%(f)snewsreader-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Newsreader"; font-weight: 500; src: url("%(f)snewsreader-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Newsreader"; font-weight: 600; src: url("%(f)snewsreader-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; src: url("%(f)sibm-plex-sans-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; src: url("%(f)sibm-plex-sans-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 600; src: url("%(f)sibm-plex-sans-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; src: url("%(f)sibm-plex-mono-latin-400-normal.woff2") format("woff2"); }
:root { color-scheme: light;
  --paper: #f6f7f9; --wash: #e9eef6; --ink: #0d1b2e; --ink-2: #44536a; --muted: #6b7a8f; --rule: #d5dbe5; --link: #0d1b2e; --pop: #c8410b; --onpop: #ffffff; --paid: #c8410b;
  --hw: #0f3d8a; --infra: #2f7fd8; --model: #62a8e8; --cap: #7d8ba0;
  --serif: "Newsreader", Georgia, serif; --sans: "IBM Plex Sans", system-ui, Arial, sans-serif; --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark;
  --paper: #0f1722; --wash: #18233a; --ink: #e6ebf2; --ink-2: #b3bfd0; --muted: #8a9ab0; --rule: #273347; --link: #e6ebf2; --pop: #ff8a5b; --onpop: #0f1722; --paid: #ff8a5b;
  --hw: #4a86e3; --infra: #86b3f0; --model: #bcd4f7; --cap: #9aa8bd; } }
:root[data-theme="dark"] { color-scheme: dark;
  --paper: #0f1722; --wash: #18233a; --ink: #e6ebf2; --ink-2: #b3bfd0; --muted: #8a9ab0; --rule: #273347; --link: #e6ebf2; --pop: #ff8a5b; --onpop: #0f1722; --paid: #ff8a5b;
  --hw: #4a86e3; --infra: #86b3f0; --model: #bcd4f7; --cap: #9aa8bd; }
* { box-sizing: border-box } html { -webkit-text-size-adjust: 100% }
body { margin: 0; background: var(--paper); color: var(--ink); overflow-x: hidden; font: 400 15px/1.5 var(--sans); font-variant-numeric: lining-nums tabular-nums }
a { color: var(--link); text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 3px; text-decoration-thickness: 1px }
a:hover { text-decoration-color: var(--pop); text-decoration-thickness: 2px }
a:focus-visible, button:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--pop); outline-offset: 2px }
.wrap { max-width: 1128px; margin: 0 auto; padding: 0 max(24px, env(safe-area-inset-right, 0px)) 64px max(24px, env(safe-area-inset-left, 0px)) }
.col { max-width: 640px } section { margin-top: 56px }
.top { border-bottom: 1px solid var(--rule) }
.navin { max-width: 1128px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 4px 20px; align-items: baseline; padding: 12px max(24px, env(safe-area-inset-right, 0px)) 10px max(24px, env(safe-area-inset-left, 0px)) }
.navin a { font-size: 14px; color: var(--ink-2); text-decoration: none; padding: 2px 0; border-bottom: 2px solid transparent }
.navin a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--pop) }
.navin .brand { font: 500 17px/1 var(--serif); color: var(--ink); margin-right: 8px; display: inline-flex; align-items: center; gap: 8px; border-bottom: 0 }
.navin .brand svg { width: 18px; height: 18px }
.seg { margin-left: auto; display: inline-flex; border: 1px solid var(--rule); font: 12px var(--mono) }
.seg a { padding: 3px 9px; border: 0; color: var(--muted); font: inherit } .seg a + a { border-left: 1px solid var(--rule) }
.seg a[aria-current="true"] { background: var(--ink); color: var(--paper) }
/* Controls: chips for filters, one primary button per page, a bordered select */
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: 0 0 24px; font-size: 13px; color: var(--ink-2) }
.chip { font: 500 13px/1 var(--sans); color: var(--ink-2); background: transparent; border: 1px solid var(--rule); padding: 7px 11px; cursor: pointer; min-height: 30px }
.chip[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink) }
.chip:hover { border-color: var(--ink-2) }
.btn { font: 600 13px/1 var(--sans); color: var(--onpop); background: var(--pop); border: 1px solid var(--pop); padding: 8px 14px; cursor: pointer; min-height: 32px }
.btn.quiet { color: var(--ink); background: transparent; border-color: var(--ink) }
.sel { font: 13px var(--sans); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); padding: 7px 28px 7px 10px; min-height: 30px; position: relative; display: inline-block }
.sel::after { content: ""; position: absolute; right: 10px; top: 11px; width: 6px; height: 6px; border-right: 1.5px solid var(--ink-2); border-bottom: 1.5px solid var(--ink-2); transform: rotate(45deg) }
.cgap { flex-basis: 100% }
.count { margin-left: auto; font: 12px var(--mono); color: var(--muted) }
.search { font: 13px var(--sans); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); padding: 7px 10px; min-height: 30px; width: 12rem }
/* Tooltip: two lines, the item first */
.tip { position: absolute; background: var(--ink); color: var(--paper); font: 12px/1.4 var(--sans); padding: 6px 9px; max-width: 260px; pointer-events: none }
.tip b { font: 600 13px var(--serif) }
.tip::after { content: ""; position: absolute; left: 14px; bottom: -5px; width: 10px; height: 10px; background: var(--ink); transform: rotate(45deg) }
.rows li:hover, .ledger li:hover, .brow:hover > summary { background: var(--wash) }
.things .fig { color: var(--pop) }
.evlink { font: 12px var(--mono); color: var(--muted) }
.mast, .meta, .foot, .mk, .ev, .n2, .rmeta { font: 400 12px/1.4 var(--mono); color: var(--muted); letter-spacing: .01em }
.mast { margin: 0; padding: 20px 0 10px; border-bottom: 1px solid var(--ink) }
h1 { font: 500 44px/1.05 var(--serif); letter-spacing: -.01em; margin: 32px 0 12px; text-wrap: balance }
.state { font: 400 22px/1.35 var(--serif); margin: 0 0 8px; text-wrap: pretty }
h2 { font: 500 22px/1.2 var(--serif); margin: 0 0 12px } h3 { font: 500 18px/1.2 var(--serif); margin: 0 0 2px }
.num { font: 600 15px/1.2 var(--serif); color: var(--ink) } .meta { margin: 0 0 12px }
.caveat { font-size: 13px; color: var(--ink-2); margin: 0 0 8px } .legend { font-size: 12px; color: var(--ink-2); margin: 8px 0 0 }
.to { color: var(--muted) } .sep { color: var(--rule); padding: 0 8px }
.fig { margin: 0; overflow-x: auto } .fig svg { display: block; width: 100%; height: auto }
svg text { font-family: var(--sans); fill: var(--ink) } svg .lab { font-size: 12px; fill: var(--ink-2) } svg .layer { font-size: 12px; font-weight: 600; fill: var(--ink) }
svg .chip { font-size: 11px; fill: var(--ink) } svg .n { font-family: var(--serif); font-weight: 600; font-size: 13px; fill: var(--ink) }
svg .mk { font-family: var(--mono); font-size: 11px; fill: var(--muted) } svg .small { font-size: 11px; fill: var(--ink-2) }
svg .halo { paint-order: stroke; stroke: var(--paper); stroke-width: 4px; stroke-linejoin: round }
.rows { list-style: none; margin: 0; padding: 0 }
.rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 2px 16px; padding: 7px 0; border-bottom: 1px solid var(--rule); align-items: baseline }
.rows li:first-child { border-top: 1px solid var(--rule) } .rows .ty { font-size: 13px; color: var(--ink-2) } .rows .amt { white-space: nowrap; text-align: right }
.rows .num { font-size: 17px } .rows .frow { grid-template-columns: minmax(0, 1fr) auto } .rows .crow { grid-template-columns: 14px minmax(0, 1fr); gap: 10px; font-size: 14px }
.rows .crow .num { font-size: 15px } .mk { margin-left: 4px }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: currentColor; margin-right: 8px; vertical-align: 1px }
.shape { display: inline-block; width: 10px; height: 10px; border: 1.5px solid var(--ink-2); vertical-align: -1px; margin-right: 6px } .shape.paid { background: var(--paid); border-color: var(--paid) }
.shape.committed { border-color: var(--ink-2) }
.hw { color: var(--hw) } .infra { color: var(--infra) } .model { color: var(--model) } .cap { color: var(--cap) }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 40px } .n2 { margin-left: 6px }
.loops { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px } .loop .line { margin: 0 0 6px; font-size: 14px; color: var(--ink-2) } .loop svg { width: 100%; height: auto; display: block }
.foot { margin-top: 64px; padding-top: 10px; border-top: 1px solid var(--rule) } .foot p { margin: 0 }
/* Three things to know: the figure hangs in the margin, the finding sits in the text column, the evidence link is mono */
.things { list-style: none; margin: 28px 0 0; padding: 0; max-width: 760px }
.things li { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 4px 20px; padding: 14px 0; border-top: 1px solid var(--rule); align-items: baseline }
.things li:last-child { border-bottom: 1px solid var(--rule) }
.things .fig { font: 600 30px/1 var(--serif); letter-spacing: -.01em; margin: 0; overflow: visible }
.things .ev { grid-column: 2; margin: 0 }
.things .ev a { color: var(--muted) }
/* Ledger rows (Overview B and the phone form of A) */
.ledger { list-style: none; margin: 0; padding: 0 }
.ledger li { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 0 16px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--rule) }
.ledger li:first-child { border-top: 1px solid var(--rule) }
.ledger .pair { font-size: 14px; line-height: 1.3 } .ledger .bar { height: 22px; width: 100% }
.ledger .bar svg { display: block; width: 100%; height: 22px; overflow: visible }
.ledger .barrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center } .ledger .blabel { white-space: nowrap }
.ledger li.both { border-left: 2px solid var(--ink); padding-left: 10px }
.ledgerkey { margin: 8px 0 0 }
.phone-only { display: none }
.sheet { font-size: 12px; color: var(--ink-2); margin: 6px 0 0 }
@media (max-width: 720px) {
  .wrap { padding: 0 max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px)) }
  .navin { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); gap: 4px 14px }
  h1 { font-size: 32px; margin-top: 24px } .state { font-size: 19px } section { margin-top: 40px }
  .loops, .two { grid-template-columns: 1fr; gap: 32px } .seg { margin-left: 0 }
  .rows li { grid-template-columns: minmax(0, 1fr) auto } .rows .ty { grid-row: 2; grid-column: 1 }
  .things li { grid-template-columns: 1fr; gap: 2px } .things .fig { font-size: 26px } .things .ev { grid-column: 1 }
  .ledger li { grid-template-columns: 1fr; gap: 4px; padding: 10px 0 } .ledger .barrow { grid-template-columns: 1fr } .ledger .blabel { order: -1; text-align: left; white-space: normal }
  .desk-only { display: none } .phone-only { display: block }
}
""".replace("%(f)s", FONTS)

def page(title, current, body, extra_css="", note=""):
    nav = [("Overview", "#/"), ("Money flows", "#/flows"), ("Loops", "#/loops"), ("Companies", "#/companies"), ("What changed", "#/changes")]
    links = "".join(f'<a href="{h}"{" aria-current=\"page\"" if n == current else ""}>{n}</a>' for n, h in nav)
    theme = '<span class="seg" role="group" aria-label="Theme"><a href="#" aria-current="true">Auto</a><a href="#">Light</a><a href="#">Dark</a></span>'
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title><style>{CSS}{extra_css}</style></head>
<body><nav class="top"><div class="navin"><a class="brand" href="#/">{wheel_mark()}AI Value Chain</a>{links}{theme}</div></nav>
<main class="wrap">{body}
<footer class="foot"><p>{len(b['companies'])} companies · {len(b['deals'])} deals · {len(b['sources'])} sources · not investment advice · <a href="https://github.com/carsonstubstad/ai-value-chain">code and data</a></p></footer>
</main>{f'<!-- {note} -->' if note else ''}</body></html>"""

def masthead():
    return f'<p class="mast">AI Value Chain · Week {iso_week(AS_OF)} · data as of {fmt_date(AS_OF)}</p>'

def things():
    items = "".join(f'<li><p class="fig">{esc(f["fig"])}</p><p style="margin:0">{esc(f["text"])}</p><p class="ev"><a href="{esc(f["link"])}">{esc(f["evid"])}</a></p></li>' for f in FINDINGS)
    return f'<section aria-label="Three things to know" style="margin-top:36px"><h2>Three things to know</h2><ul class="things">{items}</ul></section>'

def company_link(cid):
    return f'<a href="#/company/{cid}">{esc(C[cid]["name"])}</a>'

def dot(cid):
    return f'<span class="dot {FAMILY[C[cid]["layer"]]}" aria-hidden="true"></span>'

def amount_link(d):
    sh = f'<span class="shape {basis(d)}" aria-hidden="true"></span>'
    return f'{sh}<a class="num" href="{esc(src_url(d))}">{esc(amount_label(d))}</a><span class="mk">{MARK[d["confidence"]]}</span>'

def deal_row(d, other=None):
    who = f'{dot(other)}{company_link(other)}' if other else f'{dot(d["payer"])}{company_link(d["payer"])} <span class="to">to</span> {company_link(d["payee"])}'
    return f'<li title="{esc(d["summary"])}"><span>{who}</span><span class="ty">{TYPE_SHORT[d["type"]]}</span><span class="amt">{amount_link(d)}</span></li>'

def change_row(e):
    d = D[e["deal"]]
    what = {"basis_change": "now paid" if d["amount_basis"] == "paid" else "basis changed", "status_change": "now " + d["status"], "filing": "now filed", "new_deal": "new", "amount_change": "amount updated"}.get(e["kind"], "updated")
    glyph = ' <span class="shape committed"></span><span class="to">to</span><span class="shape paid"></span>' if e["kind"] == "basis_change" and d["amount_basis"] == "paid" else ""
    return f'<li class="crow">{dot(d["payer"])}<span>{company_link(d["payer"])} <span class="to">to</span> {company_link(d["payee"])}, <a class="num" href="{esc(S.get(e["sources"][0], {}).get("url", ""))}">{esc(amount_text(d))}</a> {TYPE_SHORT[d["type"]]}: {what}{glyph}</span></li>'

def what_changed(n=5):
    return f'<section class="col"><h2><a href="#/changes">What changed</a></h2><ul class="rows">{"".join(change_row(e) for e in EVENTS[:n])}</ul></section>'

def top10():
    pairs = {}
    for d in TOP10:
        pairs[d["payer"] + d["payee"]] = pairs.get(d["payer"] + d["payee"], 0) + 1
    rows = "".join(f'<li class="frow"><span>{company_link(d["payer"])} <span class="to">to</span> {company_link(d["payee"])}{f" <span class=\"mk\">{d['announced'][:4]}</span>" if pairs[d["payer"] + d["payee"]] > 1 else ""}</span><span class="amt">{amount_link(d)}</span></li>' for d in TOP10)
    return f'<section class="col"><h2>Top 10 flows</h2><ul class="rows">{rows}</ul></section>'

KEY = '<p class="legend">Width: announced ceilings, not cash · solid: paid · outline: committed · F filed, S stated, R reported</p>'

# ---------- loop ring (small icon and the overview mini) ----------

def ring(v, W=300, big=False):
    """Two companies as dots, one arc per deal above (A pays B) and below (B pays A). Width = amount on the loop's own scale, solid = paid."""
    a, bb = v["cos"][0], v["cos"][1] if len(v["cos"]) > 1 else v["cos"][0]
    H = 170 if big else 64
    x0, x1, cy = 70, W - 70, H / 2
    vmax = max([hi(d) for d in v["deals"] if not d.get("contingent")] + [1])
    def arcs(ds, up):
        out = []
        for i, d in enumerate(sorted(ds, key=lambda d: -hi(d))):
            w = 0.9 if not has_amount(d) else max(1.5, 14 * hi(d) / vmax)
            bulge = ((26 if big else 18) + i * (17 if big else 9)) * (-1 if up else 1)
            p = f"M{x0} {cy} C{x0 + 60} {cy + bulge} {x1 - 60} {cy + bulge} {x1} {cy}"
            k = "var(--muted)" if d.get("contingent") else col(C[d["payer"]]["layer"])
            dash = ' stroke-dasharray="2 3"' if not has_amount(d) else ""
            if basis(d) == "paid":
                out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}"/>')
            else:
                out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}" opacity=".35"{dash}/><path d="{p}" fill="none" stroke="{k}" stroke-width="1"{dash}/>')
                if d.get("paid_to_date_usd"):
                    out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}" stroke-dasharray="{(x1 - x0) * d['paid_to_date_usd'] / hi(d):.0f} 999"/>')
            if big:
                out.append(f'<text class="n halo" x="{(x0 + x1) / 2:.0f}" y="{cy + bulge + (-5 if up else 12):.0f}" text-anchor="middle" style="font-size:12px">{esc(amount_label(d))}<tspan class="mk" dx="4">{MARK[d["confidence"]]}</tspan></text>')
        return "".join(out)
    labels = (f'<text class="layer halo" x="{x0 - 8}" y="{cy + 4}" text-anchor="end">{esc(C[a]["name"])}</text><text class="layer halo" x="{x1 + 8}" y="{cy + 4}">{esc(C[bb]["name"])}</text>') if big else ""
    return f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{esc(v["loop"]["name"])}">{arcs(v["put"], True)}{arcs(v["back"], False)}<circle cx="{x0}" cy="{cy}" r="4" fill="{col(C[a]["layer"])}"/><circle cx="{x1}" cy="{cy}" r="4" fill="{col(C[bb]["layer"])}"/>{labels}</svg>'

def ring_icon_r3(v):
    """Row icon for the Loops page: 28 by 18, one arc above and one below, solid when paid."""
    a, bb = v["cos"][0], v["cos"][1] if len(v["cos"]) > 1 else v["cos"][0]
    up = "paid" if any(basis(d) == "paid" for d in v["put"]) else "committed"
    dn = "paid" if any(basis(d) == "paid" for d in v["back"]) else "committed"
    def arc(bulge, k, st):
        return f'<path d="M4 9 C10 {9 + bulge} 18 {9 + bulge} 24 9" fill="none" stroke="{k}" stroke-width="{"2.5" if st == "paid" else "1"}"/>'
    return f'<svg width="28" height="18" viewBox="0 0 28 18" aria-hidden="true">{arc(-8, col(C[a]["layer"]), up)}{arc(8, col(C[bb]["layer"]), dn)}<circle cx="4" cy="9" r="2.5" fill="{col(C[a]["layer"])}"/><circle cx="24" cy="9" r="2.5" fill="{col(C[bb]["layer"])}"/></svg>'

def loops_mini():
    minis = "".join(f'<div class="loop"><h3><a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></h3>{ring(v, 300, True)}</div>' for v in TOP3)
    return f'<section><h2>Three largest loops</h2><div class="loops">{minis}</div></section>'

# ---------- Overview A hero: the bipartite sankey ----------

def sankey(flows, W=1080, H=700, left_x=176, right_x=896, expand=None, lit=None):
    """Payer layers in a left column, payee layers in a right column. Ribbon height = cash plus announced ceilings.
    Solid = paid (drawn as a solid band along the top edge of the ribbon, to the paid share), outline = committed.
    expand = (side, layer): that layer is shown as its companies on that side. lit = company id whose ribbons stay dark."""
    NODE_W, GAP, MINW = 12, 16, 2.0
    def node_key(side, cid_or_layer):
        return side + ":" + cid_or_layer
    # rows: left and right, in chain order, Capital last; an expanded layer becomes company rows in order of total
    def rows_for(side):
        rows = OrderedDict()
        for f in flows:
            lay = f["from"] if side == "L" else f["to"]
            for d in f["deals"]:
                if expand and expand[0] == side and expand[1] == lay:
                    cid = d["payer"] if side == "L" else d["payee"]
                    rows.setdefault(cid, {"id": cid, "layer": lay, "label": C[cid]["name"], "company": True, "v": 0.0})
                else:
                    rows.setdefault(lay, {"id": lay, "layer": lay, "label": LAYERS[lay]["label"], "company": False, "v": 0.0})
        return list(rows.values())
    # edges at the drawn granularity
    edges = {}
    for f in flows:
        for d in f["deals"]:
            if d.get("contingent") or not has_amount(d):
                continue
            src = d["payer"] if expand and expand[0] == "L" and expand[1] == f["from"] else f["from"]
            dst = d["payee"] if expand and expand[0] == "R" and expand[1] == f["to"] else f["to"]
            e = edges.setdefault((src, dst), {"src": src, "dst": dst, "v": 0.0, "paid": 0.0, "n": 0, "ceil": 0.0, "layer": f["from"], "deals": []})
            e["v"] += hi(d); e["n"] += 1; e["deals"].append(d)
            if d.get("amount_kind") != "one_time":
                e["ceil"] += hi(d)
            e["paid"] += hi(d) if d["amount_basis"] == "paid" else (d.get("paid_to_date_usd") or 0)
    # deals with no amount still count in n
    for f in flows:
        for d in f["deals"]:
            if d.get("contingent") or has_amount(d):
                continue
            src = d["payer"] if expand and expand[0] == "L" and expand[1] == f["from"] else f["from"]
            dst = d["payee"] if expand and expand[0] == "R" and expand[1] == f["to"] else f["to"]
            if (src, dst) in edges:
                edges[(src, dst)]["n"] += 1
    edges = [e for e in edges.values() if e["v"] > 0]
    L, R = rows_for("L"), rows_for("R")
    for e in edges:
        for r in L:
            if r["id"] == e["src"]:
                r["v"] += e["v"]
        for r in R:
            if r["id"] == e["dst"]:
                r["v"] += e["v"]
    # payers ranked by what they pay, payees by what they are paid: the loop pairs then run as parallel bands
    L = sorted([r for r in L if r["v"] > 0], key=lambda r: (-r["v"], r["label"]))
    R = sorted([r for r in R if r["v"] > 0], key=lambda r: (-r["v"], r["label"]))
    total = max(sum(r["v"] for r in L), sum(r["v"] for r in R))
    k = (H - 40 - GAP * (max(len(L), len(R)) - 1)) / total  # px per dollar
    def wpx(v):
        return max(MINW, v * k)
    def place(rows, order_fn):
        y = 20
        for r in rows:
            r["edges"] = sorted([e for e in edges if order_fn(e) == r["id"]], key=lambda e: 0)
            r["h"] = sum(wpx(e["v"]) for e in r["edges"])
            r["y"] = y
            y += r["h"] + GAP
        return y - GAP + 20
    place(L, lambda e: e["src"]); place(R, lambda e: e["dst"])
    yL = {r["id"]: r for r in L}; yR = {r["id"]: r for r in R}
    # order ribbons within a node by the other end's y, to limit crossings
    for r in L:
        r["edges"].sort(key=lambda e: yR[e["dst"]]["y"])
    for r in R:
        r["edges"].sort(key=lambda e: yL[e["src"]]["y"])
    for rows_, key in ((L, "sy"), (R, "dy")):
        for r in rows_:
            y = r["y"]
            for e in r["edges"]:
                e[key] = y; y += wpx(e["v"])
    x0, x1 = left_x + NODE_W, right_x
    mx = (x0 + x1) / 2
    out = []
    labels = []
    for e in sorted(edges, key=lambda e: -e["v"]):
        w = wpx(e["v"]); ya, yb = e["sy"], e["dy"]
        k_ = col(e["layer"])
        faded = lit and not any(d["payer"] == lit or d["payee"] == lit for d in e["deals"])
        op = ' opacity=".18"' if faded else ""
        if w <= 3:
            p = f"M{x0} {ya + w / 2:.1f} C{mx:.0f} {ya + w / 2:.1f} {mx:.0f} {yb + w / 2:.1f} {x1} {yb + w / 2:.1f}"
            out.append(f'<path d="{p}" fill="none" stroke="{k_}" stroke-width="{w:.1f}"{op}/>')
        else:
            band = f"M{x0} {ya:.1f} C{mx:.0f} {ya:.1f} {mx:.0f} {yb:.1f} {x1} {yb:.1f} L{x1} {yb + w:.1f} C{mx:.0f} {yb + w:.1f} {mx:.0f} {ya + w:.1f} {x0} {ya + w:.1f} Z"
            out.append(f'<path d="{band}" fill="{k_}" fill-opacity=".08" stroke="{k_}" stroke-width="1.2"{op}/>')
            if e["paid"] > 0:
                pw = w * min(1, e["paid"] / e["v"])
                solid = f"M{x0} {ya:.1f} C{mx:.0f} {ya:.1f} {mx:.0f} {yb:.1f} {x1} {yb:.1f} L{x1} {yb + pw:.1f} C{mx:.0f} {yb + pw:.1f} {mx:.0f} {ya + pw:.1f} {x0} {ya + pw:.1f} Z"
                out.append(f'<path d="{solid}" fill="{k_}"{op}/>')
        word = "ceilings" if e["ceil"] > 0 else ("paid" if e["paid"] >= e["v"] else "committed")
        txt = f'{money(e["v"])} {word} · {e["n"]} deal{"s" if e["n"] != 1 else ""}'
        if w >= 12:
            labels.append({"x": mx, "y": (ya + yb) / 2 + w / 2 + 4, "t": txt, "anchor": "middle", "col": "mid", "faded": faded})
        else:
            labels.append({"x": x1 - 10, "y": yb + w / 2 + 4, "t": txt, "anchor": "end", "col": "end", "faded": faded})
    # sweep labels apart within each column
    for colname in ("mid", "end"):
        ls = sorted([l for l in labels if l["col"] == colname], key=lambda l: l["y"])
        for i in range(1, len(ls)):
            if ls[i]["y"] - ls[i - 1]["y"] < 16:
                ls[i]["y"] = ls[i - 1]["y"] + 16
        # keep the stack inside the frame, pushing upward from the bottom edge
        for i in range(len(ls) - 1, -1, -1):
            limit = (H - 24) if i == len(ls) - 1 else ls[i + 1]["y"] - 16
            if ls[i]["y"] > limit:
                ls[i]["y"] = limit
    for l in labels:
        out.append(f'<text class="small halo" x="{l["x"]:.0f}" y="{l["y"]:.0f}" text-anchor="{l["anchor"]}"{" opacity=\".3\"" if l["faded"] else ""}>{esc(l["t"])}</text>')
    # nodes and names
    for r in L:
        out.append(f'<rect x="{left_x}" y="{r["y"]:.1f}" width="{NODE_W}" height="{r["h"]:.1f}" fill="{col(r["layer"])}"/>')
        cls = "chip" if r["company"] else "layer"
        out.append(f'<text class="{cls} halo" x="{left_x - 8}" y="{r["y"] + min(r["h"], 14) / 2 + 4:.0f}" text-anchor="end">{esc(r["label"])}</text>')
    for r in R:
        out.append(f'<rect x="{right_x}" y="{r["y"]:.1f}" width="{NODE_W}" height="{r["h"]:.1f}" fill="{col(r["layer"])}"/>')
        cls = "chip" if r["company"] else "layer"
        out.append(f'<text class="{cls} halo" x="{right_x + NODE_W + 8}" y="{r["y"] + min(r["h"], 14) / 2 + 4:.0f}">{esc(r["label"])}</text>')
    if expand:
        side_rows = R if expand[0] == "R" else L
        xs = [r for r in side_rows if r["company"]]
        if xs:
            y0, y1 = xs[0]["y"], xs[-1]["y"] + xs[-1]["h"]
            bx = right_x + NODE_W + 92 if expand[0] == "R" else left_x - 96
            out.append(f'<line x1="{bx}" x2="{bx}" y1="{y0:.0f}" y2="{y1:.0f}" stroke="var(--rule)"/><text class="layer halo" x="{bx + 6}" y="{(y0 + y1) / 2 + 4:.0f}">{esc(LAYERS[expand[1]]["label"])}</text>')
    out.append(f'<text class="lab" x="{left_x + NODE_W}" y="{H - 2}" text-anchor="end">pays</text><text class="lab" x="{right_x}" y="{H - 2}">is paid</text>')
    return f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Who pays whom, by layer">{"".join(out)}</svg>'

# ---------- Overview B hero: the ranked ledger of layer flows ----------

def ledger(flows, scale_max=None, show_both=True):
    vmax = scale_max or max(f["total"] for f in flows)
    keys = {f["key"] for f in flows}
    items = []
    for f in flows:
        w = max(0.4, 100 * f["total"] / vmax)
        pw = 100 * f["paid_amt"] / vmax
        k = col(f["from"])
        both = (f["to"] + ">" + f["from"]) in keys
        lx = w + 1.2
        bar = (f'<svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true" style="height:22px">'
               f'<rect x="0" y="4" width="{w:.2f}" height="14" fill="{k}" fill-opacity=".08" stroke="{k}" stroke-width="1" vector-effect="non-scaling-stroke"/>'
               + (f'<rect x="0" y="4" width="{pw:.2f}" height="14" fill="{k}"/>' if pw > 0 else "") + '</svg>')
        label = f'<span class="num" style="font-size:13px">{money(f["total"])}</span> <span class="mk">{flow_word(f)} · {f["n"]} deal{"s" if f["n"] != 1 else ""}</span>'
        items.append(f'<li{" class=\"both\"" if both and show_both else ""}><span class="pair"><span class="dot {FAMILY[f["from"]]}"></span>{esc(LAYERS[f["from"]]["label"])} <span class="to">pays</span> {esc(LAYERS[f["to"]]["label"])}</span>'
                     f'<span class="barrow"><span class="bar">{bar}</span><span class="blabel">{label}</span></span></li>')
    return f'<ul class="ledger">{"".join(items)}</ul>'

def noamt_line():
    n = sum(f["n"] for f in NOAMT_FLOWS)
    return f'<p class="legend">{len(NOAMT_FLOWS)} more layer pairs state no amount for any of their {n} deals; <a href="#/flows?na=1">see them on Money flows</a>.</p>'

# ---------- Overview C hero: the chord ----------

def chord(flows, W=760, H=600):
    cx, cy, R, TH = 380, 300, 250, 14
    lay_v = OrderedDict()
    for f in flows:
        lay_v[f["from"]] = lay_v.get(f["from"], 0) + f["total"]
        lay_v[f["to"]] = lay_v.get(f["to"], 0) + f["total"]
    lays = [l for l in CHAIN if l in lay_v]
    total = sum(lay_v.values())
    pad = math.radians(3)
    span = 2 * math.pi - pad * len(lays)
    ang = {}
    a = -math.pi / 2
    for l in lays:
        s = span * lay_v[l] / total
        ang[l] = [a, a + s, a]  # start, end, cursor
        a += s + pad
    def pt(theta, r):
        return cx + r * math.cos(theta), cy + r * math.sin(theta)
    def arc(a0, a1, r):
        x0, y0 = pt(a0, r); x1, y1 = pt(a1, r)
        return f"A{r} {r} 0 {1 if a1 - a0 > math.pi else 0} 1 {x1:.1f} {y1:.1f}"
    out = []
    # chords in size order, so the big ones sit under the small ones' labels
    for f in sorted(flows, key=lambda f: -f["total"]):
        s = span * f["total"] / total
        a0 = ang[f["from"]][2]; ang[f["from"]][2] += s
        b0 = ang[f["to"]][2]; ang[f["to"]][2] += s
        r = R - TH - 1
        pa0, pa1, pb0, pb1 = pt(a0, r), pt(a0 + s, r), pt(b0, r), pt(b0 + s, r)
        k = col(f["from"])
        if s * r < 2:
            p = f"M{pa0[0]:.1f} {pa0[1]:.1f} Q{cx} {cy} {pb0[0]:.1f} {pb0[1]:.1f}"
            out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="1.5"/>')
        else:
            p = (f"M{pa0[0]:.1f} {pa0[1]:.1f} {arc(a0, a0 + s, r)} Q{cx} {cy} {pb1[0]:.1f} {pb1[1]:.1f} {arc(b0 + s, b0, r).replace('0 1 ', '0 0 ', 1) if False else ''}")
            # draw the payee end arc backwards: from b0+s to b0
            xb0, yb0 = pb0
            p = f"M{pa0[0]:.1f} {pa0[1]:.1f} {arc(a0, a0 + s, r)} Q{cx} {cy} {pb1[0]:.1f} {pb1[1]:.1f} A{r} {r} 0 0 0 {xb0:.1f} {yb0:.1f} Q{cx} {cy} {pa0[0]:.1f} {pa0[1]:.1f} Z"
            out.append(f'<path d="{p}" fill="{k}" fill-opacity=".10" stroke="{k}" stroke-width="1.2"/>')
            if f["paid_amt"] > 0:
                ps = s * min(1, f["paid_amt"] / f["total"])
                qa1, qb1 = pt(a0 + ps, r), pt(b0 + ps, r)
                p2 = f"M{pa0[0]:.1f} {pa0[1]:.1f} {arc(a0, a0 + ps, r)} Q{cx} {cy} {qb1[0]:.1f} {qb1[1]:.1f} A{r} {r} 0 0 0 {xb0:.1f} {yb0:.1f} Q{cx} {cy} {pa0[0]:.1f} {pa0[1]:.1f} Z"
                out.append(f'<path d="{p2}" fill="{k}"/>')
        if f["total"] >= 20e9:
            # label near the payer end, just inside the ring
            m = a0 + s / 2
            lx, ly = pt(m, r - 44)
            out.append(f'<text class="small halo" x="{lx:.0f}" y="{ly:.0f}" text-anchor="middle">{esc(flow_label(f))}</text>')
    for l in lays:
        a0, a1 = ang[l][0], ang[l][1]
        p0, p1 = pt(a0, R), pt(a1, R); q1, q0 = pt(a1, R - TH), pt(a0, R - TH)
        big = 1 if a1 - a0 > math.pi else 0
        out.append(f'<path d="M{p0[0]:.1f} {p0[1]:.1f} A{R} {R} 0 {big} 1 {p1[0]:.1f} {p1[1]:.1f} L{q1[0]:.1f} {q1[1]:.1f} A{R - TH} {R - TH} 0 {big} 0 {q0[0]:.1f} {q0[1]:.1f} Z" fill="{col(l)}"/>')
        m = (a0 + a1) / 2
        lx, ly = pt(m, R + 14)
        anchor = "middle" if abs(math.cos(m)) < 0.3 else ("start" if math.cos(m) > 0 else "end")
        out.append(f'<text class="layer halo" x="{lx:.0f}" y="{ly + 4:.0f}" text-anchor="{anchor}">{esc(LAYERS[l]["label"])}</text>')
    return f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Two-way flows between layers">{"".join(out)}</svg>'

# ---------- Overview pages ----------

def head(h1, state=None):
    return f'<header class="col"><h1>{esc(h1)}</h1>{f"<p class=\"state\">{esc(state)}</p>" if state else ""}</header>'

def overview_A():
    hero = (f'<section class="hero" aria-label="The chain"><h2>Who pays whom, by layer</h2>'
            f'<div class="desk-only"><figure class="fig">{sankey(AMT_FLOWS)}</figure></div>'
            f'<div class="phone-only">{ledger(AMT_FLOWS)}</div>'
            f'{KEY}</section>')
    body = masthead() + head("Who pays whom to build AI", STATE) + things() + hero + loops_mini() + what_changed() + top10()
    return page("Overview A", "Overview", body, note="Direction A: two-column sankey hero")

def overview_B():
    hero = (f'<section class="hero" aria-label="The chain"><h2>The 14 flows with a stated amount, ranked</h2>'
            f'{ledger(AMT_FLOWS)}{KEY[:-4]} · a left rule marks a pair paying both ways</p></section>')
    body = masthead() + head("Who pays whom to build AI", STATE) + things() + hero + loops_mini() + what_changed() + top10()
    return page("Overview B", "Overview", body, note="Direction B: ranked ledger hero")

def overview_C():
    css = ".chordwrap svg { max-width: 760px; margin: 0 auto } @media (max-width: 720px) { .chordwrap svg { min-width: 0 } }"
    hero = (f'<section class="hero chordwrap" aria-label="The chain"><h2>Who pays whom, both ways</h2><figure class="fig">{chord(AMT_FLOWS)}</figure>'
            f'{KEY[:-4]} · a chord takes the payer\'s color</p></section>')
    body = masthead() + head("Who pays whom to build AI", STATE) + things() + hero + loops_mini() + what_changed() + top10()
    return page("Overview C", "Overview", body, extra_css=css, note="Direction C: chord hero")

# ---------- Loops A: the ranked butterfly ----------

def butterfly(views, W=1080):
    """One row per loop. Put-in bars run left from a center axis, promised-back bars run right. One scale for both sides and all rows.
    Solid = paid, outline = committed with paid-to-date filled. Contingent guarantees are left out and named in the row."""
    NAME_W, AX = 200, 200 + 330  # names column, then 330px for put in; the rest for back
    vmax = max(v["back_amt"] for v in views)
    pxb = (W - AX - 96) / vmax  # px per dollar, leaving room for the side label
    rows = []
    for v in views:
        if v["put_amt"] == 0 and v["back_amt"] == 0:
            rows.append(f'<div class="brow none"><div class="bname">{ring_icon(v)}<a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></div>'
                        f'<p class="meta" style="margin:0">{len(v["deals"])} deals both ways, no amounts disclosed</p></div>')
            continue
        H = 34
        segs = []
        def seg(ds, direction):
            x = AX
            for d in sorted(ds, key=lambda d: -hi(d)):
                if d.get("contingent") or not has_amount(d):
                    continue
                w = max(2, hi(d) * pxb)
                k = col(C[d["payer"]]["layer"])
                x0 = x - w if direction < 0 else x
                if basis(d) == "paid":
                    segs.append(f'<rect x="{x0:.1f}" y="4" width="{max(1, w - 2):.1f}" height="22" fill="{k}"/>')
                else:
                    segs.append(f'<rect x="{x0 + .75:.1f}" y="4.75" width="{max(1, w - 3.5):.1f}" height="20.5" fill="{k}" fill-opacity=".08" stroke="{k}" stroke-width="1.5"/>')
                    if d.get("paid_to_date_usd"):
                        pw = (w - 3.5) * min(1, d["paid_to_date_usd"] / hi(d))
                        px = (x0 + .75 + (w - 3.5) - pw) if direction < 0 else x0 + .75
                        segs.append(f'<rect x="{px:.1f}" y="4.75" width="{pw:.1f}" height="20.5" fill="{k}"/>')
                x += w * direction
            return x
        xl = seg(v["put"], -1); xr = seg(v["back"], 1)
        def side_word(ds):
            ds = [d for d in ds if has_amount(d) and not d.get("contingent")]
            if any(d.get("amount_kind") != "one_time" for d in ds):
                return "ceilings"
            return "paid" if all(basis(d) == "paid" for d in ds) else "committed"
        put_t = money(v["put_amt"]) if v["put_amt"] else "no amount"
        back_t = money(v["back_amt"]) if v["back_amt"] else "no amount"
        pw_ = f'<tspan class="mk" dx="4">{side_word(v["put"])}</tspan>' if v["put_amt"] else ""
        bw_ = f'<tspan class="mk" dx="4">{side_word(v["back"])}</tspan>' if v["back_amt"] else ""
        segs.append(f'<text class="n halo" x="{xl - 6:.0f}" y="19" text-anchor="end">{put_t}</text>' + (f'<text class="mk halo" x="{xl - 6:.0f}" y="31" text-anchor="end">{side_word(v["put"])}</text>' if v["put_amt"] else ""))
        segs.append(f'<text class="n halo" x="{xr + 6:.0f}" y="19">{back_t}{bw_}</text>')
        segs.append(f'<line x1="{AX}" x2="{AX}" y1="0" y2="{H}" stroke="var(--ink)" stroke-width="1"/>')
        svg = f'<svg viewBox="{NAME_W} 0 {W - NAME_W} {H}" class="bbar desk-only" role="img" aria-label="{esc(v["loop"]["name"])}">{"".join(segs)}</svg>'
        def fold(ds, lab, amt):
            x = 0; parts = []
            for d in sorted(ds, key=lambda d: -hi(d)):
                if d.get("contingent") or not has_amount(d):
                    continue
                w = max(0.5, 100 * hi(d) / vmax); k = col(C[d["payer"]]["layer"])
                if basis(d) == "paid":
                    parts.append(f'<rect x="{x:.2f}" y="2" width="{w:.2f}" height="12" fill="{k}"/>')
                else:
                    parts.append(f'<rect x="{x:.2f}" y="2" width="{w:.2f}" height="12" fill="{k}" fill-opacity=".08" stroke="{k}" stroke-width="1" vector-effect="non-scaling-stroke"/>')
                    if d.get("paid_to_date_usd"):
                        parts.append(f'<rect x="{x:.2f}" y="2" width="{w * min(1, d["paid_to_date_usd"] / hi(d)):.2f}" height="12" fill="{k}"/>')
                x += w
            return (f'<p class="meta" style="margin:4px 0 0">{lab} <span class="num" style="font-size:13px">{amt}</span></p>'
                    f'<svg viewBox="0 0 100 16" preserveAspectRatio="none" style="width:100%;height:16px;display:block;overflow:visible">{"".join(parts)}</svg>')
        fold_html = f'<div class="phone-only bfold">{fold(v["put"], "put in", put_t)}{fold(v["back"], "promised or paid back", back_t)}</div>'
        notes = []
        if v["cont"]:
            notes.append(", ".join(amount_text(d) + " guarantee" for d in v["cont"]) + " not counted")
        na = [d for d in v["deals"] if not has_amount(d) and not d.get("contingent")]
        if na:
            notes.append(f'{len(na)} deal{"s" if len(na) > 1 else ""} with no amount')
        extra = f'<span class="meta bnote">{esc(" · ".join(notes))}</span>' if notes else ""
        deals = "".join(deal_row(d) for d in v["deals"])
        rows.append(f'<details class="brow"{" open" if v is views[0] else ""}><summary><div class="bname">{ring_icon(v)}<span>{esc(v["loop"]["name"])}{extra}</span></div>{svg}{fold_html}</summary>'
                    f'<ul class="rows bdeals">{deals}</ul></details>')
    axis = (f'<div class="brow bhead"><div class="bname"><span class="lab"></span></div><svg viewBox="{NAME_W} 0 {W - NAME_W} 18" class="bbar" aria-hidden="true">'
            f'<text class="lab" x="{AX - 8}" y="13" text-anchor="end">put in</text><text class="lab" x="{AX + 8}" y="13">promised or paid back</text>'
            f'<text class="mk" x="{AX + 100e9 * pxb:.0f}" y="13" text-anchor="middle">$100B</text><text class="mk" x="{AX + 200e9 * pxb:.0f}" y="13" text-anchor="middle">$200B</text>'
            f'<text class="mk" x="{AX - 100e9 * pxb:.0f}" y="13" text-anchor="middle">$100B</text></svg></div>')
    return axis + "".join(rows)

LOOPS_CSS = """
.brow { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 0 0; align-items: center; border-bottom: 1px solid var(--rule) }
details.brow { display: block } details.brow summary { display: grid; grid-template-columns: 230px minmax(0, 1fr); align-items: center; list-style: none; cursor: pointer; padding: 6px 0 }
details.brow summary::-webkit-details-marker { display: none }
.bhead { border-bottom: 1px solid var(--ink); padding: 0 } .bhead .bbar { height: 18px }
.bname { display: flex; gap: 10px; align-items: center; font-size: 15px; padding-right: 12px; line-height: 1.25 } .bname a { text-decoration-color: transparent }
.bnote { display: block; font-size: 11px; margin-top: 2px }
.brow, details.brow summary { grid-template-columns: 200px minmax(0, 1fr) }
.bbar { display: block; width: 100%; height: 34px; overflow: visible }
.brow.none { padding: 8px 0 } .brow.none .meta { grid-column: 2 }
.bdeals { margin: 0 0 12px 40px; max-width: 760px } .bdeals li { padding: 5px 0; font-size: 14px } .bdeals .num { font-size: 15px }
@media (max-width: 720px) { .brow, details.brow summary { grid-template-columns: 1fr } .bdeals { margin-left: 0 } .bhead { display: none } .brow.none .meta { grid-column: 1 } .bfold { padding: 0 0 6px } .bbar.desk-only { display: none } }
/* Loops B: the slope */
.slopewrap svg { max-width: 760px }
"""

def loops_A():
    n_deals = len({d["id"] for v in LOOPS for d in v["deals"]})
    body = (masthead() + head("Loops", f"{len(LOOPS)} loops, {n_deals} deals, ranked by what was promised back.")
            + '<p class="caveat">Nets are not shown: caps, ranges and multi-year totals cannot be netted against cash. Guarantees are named but not drawn.</p>'
            + f'<section style="margin-top:28px">{butterfly(LOOPS)}</section>'
            + KEY + '<p class="legend">A row opens to its deals. The icon is the loop: upper arc out, lower arc back, thick when paid.</p>')
    return page("Loops A", "Loops", body, extra_css=LOOPS_CSS, note="Loops A: ranked butterfly")

# ---------- Loops B: the slope ----------

def slope(views, W=760, H=640, phone=False):
    """Left axis: what the investor put in. Right axis: what was promised or paid back. One line per loop; the steeper the line, the bigger the imbalance.
    Dots: solid when that side is fully paid, outline when committed."""
    xl, xr, top, bot = (120, W - 120, 30, H - 130) if phone else (230, W - 230, 30, H - 130)
    vmax = max(max(v["put_amt"], v["back_amt"]) for v in views)
    sc = (bot - top) / vmax
    y = lambda v: bot - v * sc
    out = [f'<line x1="{xl}" x2="{xl}" y1="{top}" y2="{bot}" stroke="var(--rule)"/><line x1="{xr}" x2="{xr}" y1="{top}" y2="{bot}" stroke="var(--rule)"/>']
    for t in (50e9, 100e9, 150e9, 200e9, 250e9):
        if t <= vmax:
            out.append(f'<text class="mk" x="{(xl + xr) / 2:.0f}" y="{y(t) + 4:.0f}" text-anchor="middle" opacity=".7">{money(t)}</text>')
    out.append(f'<text class="lab" x="{xl}" y="{H - 10}" text-anchor="middle">put in</text><text class="lab" x="{xr}" y="{H - 10}" text-anchor="middle">promised or paid back</text>')
    with_amt = [v for v in views if v["put_amt"] or v["back_amt"]]
    ll, rl = [], []
    for v in with_amt:
        a, bb = v["cos"][0], v["cos"][1] if len(v["cos"]) > 1 else v["cos"][0]
        ka, kb = col(C[a]["layer"]), col(C[bb]["layer"])
        y0, y1 = y(v["put_amt"]), y(v["back_amt"])
        out.append(f'<line x1="{xl}" y1="{y0:.1f}" x2="{xr}" y2="{y1:.1f}" stroke="var(--ink-2)" stroke-width="1.2" opacity=".8"/>')
        put_paid = v["put"] and all(basis(d) == "paid" for d in v["put"] if has_amount(d))
        back_paid = v["back"] and all(basis(d) == "paid" for d in v["back"] if has_amount(d))
        out.append(f'<circle cx="{xl}" cy="{y0:.1f}" r="5" fill="{ka if put_paid else "var(--paper)"}" stroke="{ka}" stroke-width="1.5"/>')
        out.append(f'<circle cx="{xr}" cy="{y1:.1f}" r="5" fill="{kb if back_paid else "var(--paper)"}" stroke="{kb}" stroke-width="1.5"/>')
        if phone:
            ll.append({"y": y0, "t": f'{money(v["put_amt"]) if v["put_amt"] else "n/a"}'})
            rl.append({"y": y1, "t": f'{money(v["back_amt"]) if v["back_amt"] else "n/a"} {C[bb]["name"]}'})
        else:
            ll.append({"y": y0, "t": f'{C[a]["name"]} {money(v["put_amt"]) if v["put_amt"] else "undisclosed"}'})
            rl.append({"y": y1, "t": f'{money(v["back_amt"]) if v["back_amt"] else "undisclosed"} {C[bb]["name"]}' + (", then on" if len(v["cos"]) > 2 else "")})
    for ls in (ll, rl):
        ls.sort(key=lambda l: l["y"])
        for i in range(1, len(ls)):
            if ls[i]["y"] - ls[i - 1]["y"] < 15:
                ls[i]["y"] = ls[i - 1]["y"] + 15
        for i in range(len(ls) - 2, -1, -1):
            if ls[i + 1]["y"] - ls[i]["y"] < 15:
                ls[i]["y"] = ls[i + 1]["y"] - 15
    for l in ll:
        out.append(f'<text class="small halo" x="{xl - 12}" y="{l["y"] + 4:.0f}" text-anchor="end">{esc(l["t"])}</text>')
    for l in rl:
        out.append(f'<text class="small halo" x="{xr + 12}" y="{l["y"] + 4:.0f}">{esc(l["t"])}</text>')
    return f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="What went in against what was promised back, one line per loop">{"".join(out)}</svg>'

def loops_B():
    n_deals = len({d["id"] for v in LOOPS for d in v["deals"]})
    rows = "".join(f'<li class="frow"><span style="display:flex;gap:10px;align-items:center">{ring_icon(v)}<a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></span><span class="ty">{esc(v["loop"]["line"])}</span></li>' for v in LOOPS)
    body = (masthead() + head("Loops", f"{len(LOOPS)} loops, {n_deals} deals. Nine have a figure on at least one side.")
            + '<p class="caveat">Nets are not shown: caps, ranges and multi-year totals cannot be netted against cash. Guarantees are left out.</p>'
            + f'<section class="slopewrap" style="margin-top:28px"><h2>What went in, what was promised back</h2><figure class="fig desk-only">{slope(LOOPS)}</figure><figure class="fig phone-only">{slope(LOOPS, 390, 640, True)}</figure>'
            + '<p class="legend">Solid dot: that side is paid · hollow: committed · the steeper the line, the larger the gap between the two sides</p></section>'
            + f'<section><h2>All {len(LOOPS)} loops</h2><ul class="rows" style="max-width:860px">{rows}</ul></section>')
    css = LOOPS_CSS + ".rows .frow { grid-template-columns: 280px minmax(0, 1fr) } .rows .frow .ty { text-align: left } @media (max-width:720px) { .rows .frow { grid-template-columns: 1fr } }"
    return page("Loops B", "Loops", body, extra_css=css, note="Loops B: slope of in against back")

# ---------- Company butterfly (card and trace) ----------

def butterfly_company(cid, W=640):
    inn = sorted([d for d in VISIBLE if d["payee"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))[:5]
    out = sorted([d for d in VISIBLE if d["payer"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))[:5]
    rows = max(len(inn), len(out), 1)
    H = 26 + rows * 36; cx, cy = W / 2, H / 2
    vmax = max([hi(d) for d in inn + out if not d.get("contingent")] + [1])
    parts = []
    def side(ds, left):
        for i, d in enumerate(ds):
            other = d["payer"] if left else d["payee"]
            yy = 20 + i * 36 + (rows - len(ds)) * 18
            x = 150 if left else W - 150
            w = 0 if not has_amount(d) else max(2, 14 * hi(d) / vmax)
            k = "var(--muted)" if d.get("contingent") else col(C[d["payer"]]["layer"])
            p = (f"M{x} {yy} C{(x + cx) / 2:.0f} {yy} {(x + cx) / 2:.0f} {cy:.0f} {cx - 8:.0f} {cy:.0f}" if left
                 else f"M{cx + 8:.0f} {cy:.0f} C{(x + cx) / 2:.0f} {cy:.0f} {(x + cx) / 2:.0f} {yy} {x} {yy}")
            if w == 0:
                parts.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width=".9" stroke-dasharray="2 3"/>')
            elif basis(d) == "paid":
                parts.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}"/>')
            else:
                parts.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}" opacity=".18"/><path d="{p}" fill="none" stroke="{k}" stroke-width="1.2"/>')
                if d.get("paid_to_date_usd"):
                    L = 330
                    parts.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}" stroke-dasharray="{L * d['paid_to_date_usd'] / hi(d):.0f} 999"' + (' transform="" ' if left else '') + '/>')
            parts.append(f'<text class="chip" x="{x - 8 if left else x + 8}" y="{yy - 3}" text-anchor="{"end" if left else "start"}">{esc(C[other]["name"])}</text>')
            parts.append(f'<text class="n halo" x="{x - 8 if left else x + 8}" y="{yy + 12}" text-anchor="{"end" if left else "start"}" style="font-size:12px">{esc(amount_label(d))}<tspan class="mk" dx="4">{MARK[d["confidence"]]}</tspan></text>')
    side(inn, True); side(out, False)
    parts.append(f'<circle cx="{cx}" cy="{cy:.0f}" r="8" fill="{col(C[cid]["layer"])}"/>')
    parts.append(f'<text class="lab" x="150" y="{H - 2}" text-anchor="end">money in</text><text class="lab" x="{W - 150}" y="{H - 2}">money out</text>')
    return f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Largest deals in and out of {esc(C[cid]["name"])}">{"".join(parts)}</svg>', inn, out

def company_card(cid="openai"):
    c = C[cid]
    svg, inn5, out5 = butterfly_company(cid)
    inn = sorted([d for d in VISIBLE if d["payee"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))
    out = sorted([d for d in VISIBLE if d["payer"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))
    loops = [v for v in LOOPS if cid in v["cos"]]
    facts = " · ".join(x for x in [LAYERS[c["layer"]]["label"], c["ownership"], f'HQ {c["hq_country"]}', ", ".join(c.get("tickers", [])), f'checked {fmt_date(c["last_checked"])}'] if x)
    lst = lambda ds, side: f'<ul class="rows">{"".join(deal_row(d, d[side]) for d in ds)}</ul>'
    loopline = "".join(f'<li class="frow"><span style="display:flex;gap:10px;align-items:center">{ring_icon(v)}<a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></span><span class="ty">{esc(v["loop"]["line"])}</span></li>' for v in loops)
    body = (masthead() + f'<header class="col"><h1><span class="dot {FAMILY[c["layer"]]}" style="width:14px;height:14px;margin-right:12px;vertical-align:2px"></span>{esc(c["name"])}</h1><p class="state">{esc(c["one_line"])}</p>'
            f'<p class="meta">{esc(facts)} · <a href="#/flows?focus={cid}">trace its money</a></p></header>'
            f'<figure class="fig" style="max-width:760px;margin-top:8px">{svg}</figure>{KEY}'
            f'<section class="two"><div><h2>Money in <span class="n2">{len(inn)}</span></h2>{lst(inn, "payer")}</div><div><h2>Money out <span class="n2">{len(out)}</span></h2>{lst(out, "payee")}</div></section>'
            f'<section><h2>Loops <span class="n2">{len(loops)}</span></h2><ul class="rows loopl" style="max-width:860px">{loopline}</ul></section>')
    css = ".loopl .frow { grid-template-columns: 280px minmax(0, 1fr) } .loopl .frow .ty { text-align: left } @media (max-width:720px) { .loopl .frow { grid-template-columns: 1fr } }"
    return page(f"{c['name']} card", "Companies", body, extra_css=css, note="Company card")

# ---------- Money flows: the same sankey, Hyperscale opened on the payee side, OpenAI traced ----------

def flows_page():
    svg, inn5, out5 = butterfly_company("openai")
    hero = (f'<section class="hero" aria-label="Money flows"><p class="legend" style="margin:0 0 10px">Trace: <span class="num" style="font-size:14px">OpenAI</span> <span class="sep">|</span> Open: Hyperscale (paid side) <span class="sep">|</span> Width: ceilings · count <span class="sep">|</span> 25 deals with no amount</p>'
            f'<div class="desk-only"><figure class="fig">{sankey(AMT_FLOWS, expand=("R", "hyperscale"), lit="openai")}</figure></div>'
            f'<div class="phone-only">{ledger(AMT_FLOWS, show_both=False)}</div>'
            f'{KEY[:-4]} · dimmed ribbons carry no OpenAI deal · click a layer to open it, a company to trace it</p>{noamt_line()}</section>')
    trace = (f'<section class="col" style="max-width:760px"><h2>OpenAI, money in and out</h2><figure class="fig">{svg}</figure>'
             f'<p class="meta" style="margin-top:6px">Largest five each way. <a href="#/company/openai">Full card</a> · <a href="#/flows">Clear the trace</a></p></section>')
    body = masthead() + head("Tracing OpenAI") + hero + trace
    return page("Money flows", "Money flows", body, note="Money flows: sankey with a layer opened and a company traced")

# ---------- write everything, and count the Overview's visible words ----------

def visible_words(html):
    body = re.sub(r"<svg.*?</svg>", " ", html, flags=re.S)
    body = re.sub(r'<div class="phone-only">.*?</div>', " ", body, flags=re.S)
    body = re.sub(r'<span class="blabel">.*?</span></span>', " ", body, flags=re.S)
    body = re.sub(r'<span class="pair">.*?</span></span>', " ", body, flags=re.S)
    body = re.sub(r"<style.*?</style>|<nav.*?</nav>|<footer.*?</footer>|<title.*?</title>", " ", body, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", body)
    return len([w for w in text.split() if re.search(r"[A-Za-z0-9]", w)])


# ================= Round 4 additions: the ring, the wheel, controls =================

def polar(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)

def arc_path(cx, cy, r, a0, a1):
    """Clockwise arc from a0 to a1 degrees (a1 > a0)."""
    x0, y0 = polar(cx, cy, r, a0); x1, y1 = polar(cx, cy, r, a1)
    return f"M{x0:.1f} {y0:.1f} A{r:.1f} {r:.1f} 0 {1 if a1 - a0 > 180 else 0} 1 {x1:.1f} {y1:.1f}"

def loop_ring(v, size=240, wmax=22, scale_max=250e9, labels=True):
    """The loop as a true ring: companies sit on the circle, every deal is a clockwise arc from payer to payee.
    Width = amount on a shared scale, solid = paid, outline = committed with paid-to-date drawn solid from the start."""
    n = len(v["cos"])
    W = size + (280 if labels else 0)
    cx, cy = W / 2, size / 2
    r = size / 2 - (40 if labels else 4)
    angles = {c: -90 + i * 360 / n for i, c in enumerate(v["cos"])}
    out, labs = [], []
    used = {}  # (payer, payee) -> count, for concentric arcs
    for d in sorted(v["deals"], key=lambda d: -hi(d)):
        a0, a1 = angles[d["payer"]], angles[d["payee"]]
        if a1 <= a0:
            a1 += 360
        k = "var(--muted)" if d.get("contingent") else col(C[d["payer"]]["layer"])
        w = 0.9 if not has_amount(d) else max(1.5, wmax * hi(d) / scale_max)
        i = used.get((d["payer"], d["payee"]), 0); used[(d["payer"], d["payee"])] = i + 1
        rr = r - i * (wmax * 0.55 + 4)
        p = arc_path(cx, cy, rr, a0 + 6, a1 - 6)
        if not has_amount(d):
            out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width=".9" stroke-dasharray="2 3"/>')
        elif basis(d) == "paid":
            out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}"/>')
        else:
            out.append(f'<path d="{p}" fill="none" stroke="{k}" stroke-width="{w:.1f}" opacity=".14"/>')
            out.append(f'<path d="{arc_path(cx, cy, rr + w / 2, a0 + 6, a1 - 6)}" fill="none" stroke="{k}" stroke-width="1.1"/><path d="{arc_path(cx, cy, rr - w / 2, a0 + 6, a1 - 6)}" fill="none" stroke="{k}" stroke-width="1.1"/>')
            if d.get("paid_to_date_usd"):
                frac = min(1, d["paid_to_date_usd"] / hi(d))
                out.append(f'<path d="{arc_path(cx, cy, rr, a0 + 6, a0 + 6 + (a1 - a0 - 12) * frac)}" fill="none" stroke="{k}" stroke-width="{w:.1f}"/>')
        if labels:
            m = (a0 + a1) / 2
            lx, ly = polar(cx, cy, r + wmax / 2 + 10, m)
            anchor = "start" if math.cos(math.radians(m)) > 0.2 else ("end" if math.cos(math.radians(m)) < -0.2 else "middle")
            labs.append({"x": lx, "y": ly, "anchor": anchor, "t": amount_label(d), "mk": MARK[d["confidence"]], "side": anchor})
    if labels:
        for side in ("start", "end", "middle"):
            ls = sorted([l for l in labs if l["side"] == side], key=lambda l: l["y"])
            for i in range(1, len(ls)):
                if ls[i]["y"] - ls[i - 1]["y"] < 15:
                    ls[i]["y"] = ls[i - 1]["y"] + 15
        for l in labs:
            out.append(f'<text class="n halo" x="{l["x"]:.0f}" y="{l["y"] + 4:.0f}" text-anchor="{l["anchor"]}" style="font-size:12px">{esc(l["t"])}<tspan class="mk" dx="4">{l["mk"]}</tspan></text>')
    for c, a in angles.items():
        x, y = polar(cx, cy, r, a)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{5 if labels else 2.5}" fill="{col(C[c]["layer"])}" stroke="var(--paper)" stroke-width="{2 if labels else 1}"/>')
        if labels:
            dy = -12 if math.sin(math.radians(a)) < -0.3 else (20 if math.sin(math.radians(a)) > 0.3 else 4)
            anchor = "middle" if abs(math.cos(math.radians(a))) < 0.3 else ("start" if math.cos(math.radians(a)) > 0 else "end")
            dx = 0 if anchor == "middle" else (10 if anchor == "start" else -10)
            out.append(f'<text class="layer halo" x="{x + dx:.0f}" y="{y + dy:.0f}" text-anchor="{anchor}">{esc(C[c]["name"])}</text>')
    return f'<svg viewBox="0 0 {W} {size}" role="img" aria-label="{esc(v["loop"]["name"])}" style="width:100%;height:auto;max-width:{W}px">{"".join(out)}</svg>'

def ring_icon(v):
    return loop_ring(v, size=22, wmax=4, scale_max=250e9, labels=False).replace('style="width:100%;height:auto;max-width:22px"', 'width="22" height="22" aria-hidden="true"')

def wheel_mark():
    """The site mark: eleven blue segments on a ring, one per layer, Capital in slate."""
    out = []
    n = len(CHAIN)
    for i, l in enumerate(CHAIN):
        a0 = -90 + i * 360 / n
        out.append(f'<path d="{arc_path(9, 9, 6.5, a0 + 4, a0 + 360 / n - 4)}" fill="none" stroke="{col(l)}" stroke-width="3"/>')
    return f'<svg viewBox="0 0 18 18" aria-hidden="true">{"".join(out)}</svg>'

DEALT = {c for d in VISIBLE for c in (d["payer"], d["payee"])}

def wheel(size=640):
    """The chain as a wheel: one arc per layer in chain order, one dot per company, names set along the radius."""
    cx = cy = size / 2
    R = size / 2 - 112
    slots = [(l, [c for c in b["companies"] if c["layer"] == l]) for l in CHAIN]
    total = sum(len(cs) for _, cs in slots)
    pad = 2.6
    a = -90.0
    out = []
    for l, cs in slots:
        span = (360 - pad * len(slots)) * len(cs) / total
        out.append(f'<path d="{arc_path(cx, cy, R, a, a + span)}" fill="none" stroke="{col(l)}" stroke-width="10"/>')
        m = a + span / 2
        lx, ly = polar(cx, cy, R - 22, m)
        anchor = "middle" if abs(math.cos(math.radians(m))) < 0.35 else ("start" if math.cos(math.radians(m)) < 0 else "end")
        out.append(f'<text class="layer halo" x="{lx:.0f}" y="{ly + 4:.0f}" text-anchor="{anchor}" style="font-size:11px">{esc(LAYERS[l]["label"])}</text>')
        for j, c in enumerate(sorted(cs, key=lambda c: (c["id"] not in DEALT, c["name"]))):
            ca = a + span * (j + 0.5) / len(cs)
            x, y = polar(cx, cy, R, ca)
            on = c["id"] in DEALT
            if on:
                out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.4" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.5"/>')
            tx, ty = polar(cx, cy, R + 12, ca)
            flip = math.cos(math.radians(ca)) < 0
            rot = ca + (180 if flip else 0)
            out.append(f'<text class="{"chip" if on else "bench"}" x="{tx:.1f}" y="{ty:.1f}" text-anchor="{"end" if flip else "start"}" dominant-baseline="middle" transform="rotate({rot:.1f} {tx:.1f} {ty:.1f})" style="font-size:10.5px{"" if on else ";fill:var(--muted)"}">{esc(c["name"])}</text>')
        a += span + pad
    out.append(f'<text class="n" x="{cx}" y="{cy - 6}" text-anchor="middle" style="font-size:30px">{len(b["companies"])}</text>')
    out.append(f'<text class="lab" x="{cx}" y="{cy + 14}" text-anchor="middle">companies in {len(CHAIN)} layers</text>')
    out.append(f'<text class="lab" x="{cx}" y="{cy + 32}" text-anchor="middle">{len(DEALT)} with a sourced deal</text>')
    return f'<svg viewBox="0 0 {size} {size}" role="img" aria-label="The chain as a wheel" style="width:100%;height:auto;max-width:{size}px;margin:0 auto;display:block">{"".join(out)}</svg>'

def chips(items, extra=""):
    return "".join(f'<button type="button" class="chip" aria-pressed="{"true" if on else "false"}">{esc(t)}</button>' for t, on in items) + extra

def controls_flows():
    return (f'<div class="controls" role="group" aria-label="Filters">{chips([("Filed", True), ("Stated", True), ("Reported", True), ("Rumors", False)])}'
            f'<span class="sep"></span>{chips([("Committed", True), ("Paid", True)])}'
            f'<span class="sel">OpenAI</span><button type="button" class="btn">Trace</button><a href="#" class="evlink">More filters</a>'
            f'<span class="count">{len(VISIBLE)} of {len(VISIBLE)} deals</span></div>')

def controls_loops():
    return (f'<div class="controls" role="group" aria-label="Filters">{chips([("Filed", True), ("Stated", True), ("Reported", True), ("Rumors", False)])}'
            f'<span class="sep"></span><span class="evlink">Rank by</span>{chips([("promised back", True), ("put in", False), ("deals", False)])}'
            f'<span class="count">{len(LOOPS)} loops</span></div>')

def controls_companies():
    return (f'<div class="controls"><input class="search" type="search" placeholder="Find a company" aria-label="Find a company">'
            f'{chips([("Has a sourced deal", False), ("Public", False), ("Private", False)])}<span class="count">{len(b["companies"])} companies</span></div>')

def loops_mini_r4():
    minis = "".join(f'<div class="loop"><h3><a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></h3>{loop_ring(v, 300)}</div>' for v in TOP3)
    return f'<section><h2>Three largest loops</h2><div class="loops">{minis}</div><p class="legend">Clockwise from the top company: the right arc is what it pays, the left arc what comes back. One scale across the three.</p></section>'

def overview_r4():
    tip = ('<div class="tip" style="left:44%;top:41%"><b>Hyperscale pays Labs, $102B ceilings</b><br>7 deals, 3 paid, $58B of it paid to date</div>')
    hero = (f'<section class="hero" aria-label="The chain"><h2>Who pays whom, by layer</h2>'
            f'<div class="desk-only" style="position:relative"><figure class="fig">{sankey(AMT_FLOWS)}</figure>{tip}</div>'
            f'<div class="phone-only">{ledger(AMT_FLOWS)}</div>{KEY}</section>')
    body = masthead() + head("Who pays whom to build AI", STATE) + things() + hero + loops_mini_r4() + what_changed() + top10()
    return page("Overview", "Overview", body, note="Round 4 Overview: A restyled")

def loops_r4():
    n_deals = len({d["id"] for v in LOOPS for d in v["deals"]})
    rings = "".join(f'<article class="lring" id="loop-{v["loop"]["id"]}"><h3><a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></h3><p class="line">{esc(v["loop"]["line"])}</p>{loop_ring(v, 300)}</article>' for v in LOOPS[:4])
    body = (masthead() + head("Loops", f"{len(LOOPS)} loops, {n_deals} deals, ranked by what was promised back.") + controls_loops()
            + '<p class="caveat">Nets are not shown: caps, ranges and multi-year totals cannot be netted against cash. Guarantees are named but not drawn.</p>'
            + f'<section style="margin-top:28px">{butterfly(LOOPS)}</section>'
            + KEY + '<p class="legend">A row opens to its deals. The icon is the loop: clockwise from the top company, right arc out, left arc back, solid when paid.</p>'
            + f'<section><h2>The four largest, as rings</h2><div class="rings">{rings}</div><p class="legend">One scale across the four. Each ring is one loop; the ring form replaces the arc pairs of round 3.</p></section>')
    css = LOOPS_CSS + ".rings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 48px } .lring h3 { margin-bottom: 2px } .lring .line { font-size: 13px; color: var(--ink-2); margin: 0 0 4px; min-height: 40px } @media (max-width: 720px) { .rings { grid-template-columns: 1fr; gap: 16px } .lring .line { min-height: 0 } }"
    return page("Loops", "Loops", body, extra_css=css, note="Round 4 Loops: butterfly with ring icons, plus the four largest as rings")

def flows_r4():
    svg, inn5, out5 = butterfly_company("openai")
    hero = (f'<section class="hero" aria-label="Money flows">{controls_flows()}'
            f'<p class="legend" style="margin:0 0 10px"><span class="evlink">Open:</span> Hyperscale, paid side <span class="sep"></span><span class="evlink">Width:</span> ceilings <span class="sep"></span>25 deals with no amount</p>'
            f'<div class="desk-only"><figure class="fig">{sankey(AMT_FLOWS, expand=("R", "hyperscale"), lit="openai")}</figure></div>'
            f'<div class="phone-only">{ledger(AMT_FLOWS, show_both=False)}</div>'
            f'{KEY[:-4]} · dimmed ribbons carry no OpenAI deal · click a layer to open it, a company to trace it</p>{noamt_line()}</section>')
    trace = (f'<section class="col" style="max-width:760px"><h2>OpenAI, money in and out</h2><figure class="fig">{svg}</figure>'
             f'<p class="meta" style="margin-top:10px"><a href="#/company/openai" class="btn quiet" style="text-decoration:none">Full card</a> &nbsp; <a href="#/flows" class="evlink">Clear the trace</a></p></section>')
    body = masthead() + head("Tracing OpenAI") + hero + trace
    return page("Money flows", "Money flows", body, note="Round 4 Money flows")

def company_r4(cid="openai"):
    c = C[cid]
    svg, inn5, out5 = butterfly_company(cid)
    inn = sorted([d for d in VISIBLE if d["payee"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))
    out = sorted([d for d in VISIBLE if d["payer"] == cid], key=lambda d: (-(0 if d.get("contingent") else hi(d)), d["id"]))
    loops = [v for v in LOOPS if cid in v["cos"]]
    facts = " · ".join(x for x in [LAYERS[c["layer"]]["label"], c["ownership"], f'HQ {c["hq_country"]}', ", ".join(c.get("tickers", [])), f'checked {fmt_date(c["last_checked"])}'] if x)
    lst = lambda ds, side: f'<ul class="rows">{"".join(deal_row(d, d[side]) for d in ds)}</ul>'
    loopline = "".join(f'<li class="frow"><span style="display:flex;gap:10px;align-items:center">{ring_icon(v)}<a href="#/loops#loop-{v["loop"]["id"]}">{esc(v["loop"]["name"])}</a></span><span class="ty">{esc(v["loop"]["line"])}</span></li>' for v in loops)
    body = (masthead() + f'<header class="col"><h1><span class="dot {FAMILY[c["layer"]]}" style="width:14px;height:14px;margin-right:12px;vertical-align:2px"></span>{esc(c["name"])}</h1><p class="state">{esc(c["one_line"])}</p>'
            f'<p class="meta" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span>{esc(facts)}</span><a href="#/flows?focus={cid}" class="btn" style="text-decoration:none">Trace its money</a></p></header>'
            f'<figure class="fig" style="max-width:760px;margin-top:8px">{svg}</figure>{KEY}'
            f'<section class="two"><div><h2>Money in <span class="n2">{len(inn)}</span></h2>{lst(inn, "payer")}</div><div><h2>Money out <span class="n2">{len(out)}</span></h2>{lst(out, "payee")}</div></section>'
            f'<section><h2>Loops <span class="n2">{len(loops)}</span></h2><ul class="rows loopl" style="max-width:860px">{loopline}</ul></section>')
    css = ".loopl .frow { grid-template-columns: 280px minmax(0, 1fr) } .loopl .frow .ty { text-align: left } @media (max-width:720px) { .loopl .frow { grid-template-columns: 1fr } }"
    return page(f"{c['name']} card", "Companies", body, extra_css=css, note="Round 4 company card")

def companies_r4():
    cols = []
    for l in CHAIN:
        cs = sorted([c for c in b["companies"] if c["layer"] == l], key=lambda c: (c["id"] not in DEALT, c["name"]))
        names = "".join(f'<li class="{"on" if c["id"] in DEALT else "bench"}"><a href="#/company/{c["id"]}">{esc(c["name"])}</a></li>' for c in cs)
        cols.append(f'<div class="lcol"><h3><span class="dot {FAMILY[l]}"></span>{esc(LAYERS[l]["label"])}</h3><ul>{names}</ul></div>')
    body = (masthead() + head("Companies", f"{len(b['companies'])} companies chosen to represent the chain; {len(DEALT)} have at least one sourced deal.") + controls_companies()
            + f'<section class="desk-only" style="margin-top:8px"><figure class="fig">{wheel(680)}</figure><p class="legend">Chain order runs clockwise from Equipment at the top; Capital closes the circle. A dot marks a company with a sourced deal; muted names are tracked but have none yet.</p></section>'
            + f'<section><h2>By layer</h2><div class="dir">{"".join(cols)}</div></section>')
    css = (".dir { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px 32px } .lcol h3 { font-size: 16px; margin-bottom: 6px } .lcol ul { list-style: none; margin: 0; padding: 0 } .lcol li { padding: 3px 0; font-size: 14px }"
           ".lcol .bench a { color: var(--muted) } .lcol a { text-decoration: none } .lcol a:hover { text-decoration: underline }"
           "@media (max-width: 720px) { .dir { grid-template-columns: 1fr 1fr; gap: 16px 20px } }")
    return page("Companies", "Companies", body, extra_css=css, note="Round 4 Companies page with the chain wheel")

PAGES = {"overview.html": overview_r4(), "loops.html": loops_r4(), "flows.html": flows_r4(), "company.html": company_r4("openai"), "companies.html": companies_r4()}
for name, html in PAGES.items():
    assert "\u2014" not in html, name  # no em-dashes anywhere (D12)
    with open(os.path.join(HERE, name), "w") as fh:
        fh.write(html)
    print(f"{name:<18} {len(html):>7} bytes  visible words {visible_words(html)}")
