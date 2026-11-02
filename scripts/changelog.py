#!/usr/bin/env python3
"""Print one week's changelog entry, every figure counted from the records.

Standard library only. The week is the ISO week of data/state.json's as_of date, or the one
given as --week 2026-W44. The entry gives the dataset's size at the end of that week and lists
each dated change (data/events) that falls inside it, with the change's own one-line summary.
Paste the output at the top of CHANGELOG.md; the Monday review does this each week (P16).

Args: [--week YYYY-Www] [--first]   (--first adds the launch note to the first entry)
"""

import glob
import json
import os
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIND = {
    "new_deal": "New deal", "status_change": "Status", "basis_change": "Now paid", "amount_change": "Amount",
    "filing": "Filing", "correction": "Correction", "new_company": "New company",
}


def load(folder):
    out = []
    for path in sorted(glob.glob(os.path.join(ROOT, "data", folder, "*.json"))):
        with open(path, encoding="utf-8") as fh:
            out.append(json.load(fh))
    return out


def fmt(d):
    return f"{d.day} {d.strftime('%b %Y')}"


def week_of(arg, as_of):
    if arg:
        y, w = arg.split("-W")
        start = date.fromisocalendar(int(y), int(w), 1)
    else:
        start = as_of - timedelta(days=as_of.weekday())
    return start, start + timedelta(days=6)


def entry(week_arg=None, first=False):
    with open(os.path.join(ROOT, "data", "state.json"), encoding="utf-8") as fh:
        as_of = date.fromisoformat(json.load(fh)["as_of"])
    start, end = week_of(week_arg, as_of)
    companies, deals, loops, sources, events = (load(f) for f in ("companies", "deals", "loops", "sources", "events"))
    shown = [d for d in deals if d["confidence"] != "rumored"]
    paid = sum(d["amount_basis"] == "paid" for d in shown)
    dealt = {c for d in shown for c in (d["payer"], d["payee"])}
    names = {c["id"]: c["name"] for c in companies}
    by_id = {d["id"]: d for d in deals}
    week = sorted((e for e in events if start.isoformat() <= e["date"] <= end.isoformat()), key=lambda e: (e["date"], e["id"]))
    iso = start.isocalendar()
    lines = [f"## Week {iso[1]}, {fmt(start)} to {fmt(end)} (data as of {fmt(as_of)})", ""]
    if first:
        lines += ["First entry: the dataset the site launches with.", ""]
    lines += [
        f"- {len(companies)} companies, {len(dealt)} with at least one sourced deal.",
        f"- {len(deals)} deals: {len(shown)} sourced ({paid} paid, {len(shown) - paid} committed) and "
        f"{len(deals) - len(shown)} rumored, hidden by default.",
        f"- {len(loops)} loops and {len(sources)} sources.",
        "",
    ]
    if week:
        lines += [f"Changes this week ({len(week)}):", ""]
        for e in week:
            d = by_id.get(e.get("deal"), {})
            pair = f"{names.get(d.get('payer'), '')} to {names.get(d.get('payee'), '')}" if d else ", ".join(names.get(c, c) for c in e.get("companies", []))
            lines.append(f"- {e['date']} · {KIND.get(e['kind'], e['kind'])} · {pair}: {e['summary'].rstrip('.')}. ({e['confidence']})")
    else:
        lines.append("No changes this week.")
    return "\n".join(lines) + "\n"


def main():
    args = sys.argv[1:]
    week = args[args.index("--week") + 1] if "--week" in args else None
    sys.stdout.write(entry(week, "--first" in args))


if __name__ == "__main__":
    main()
