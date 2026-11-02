#!/usr/bin/env python3
"""Write site/data/bundle.json and site/data/deals.csv from the records in data/ (P09).

Standard library only. The output is deterministic (sorted ids, no timestamps), so
`--check` can fail CI when someone edits data/ without re-running the bundle.

Usage:
  python3 scripts/bundle.py          write the bundle
  python3 scripts/bundle.py --check  exit 1 if the bundle or the CSV is missing or stale
"""

import csv
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "bundle.json")
CSV_OUT = os.path.join(ROOT, "site", "data", "deals.csv")
CSV_FIELDS = ["id", "payer", "payer_name", "payee", "payee_name", "type", "amount_usd_low", "amount_usd_high", "amount_basis",
              "amount_kind", "contingent", "paid_to_date_usd", "paid_as_of", "confidence", "status", "announced", "as_of",
              "last_checked", "summary", "source_url"]
FOLDERS = ["companies", "deals", "loops", "sources", "events", "financials"]


def load_folder(name):
    folder = os.path.join(ROOT, "data", name)
    if not os.path.isdir(folder):
        return []
    records = []
    for fname in sorted(os.listdir(folder)):
        if fname.endswith(".json"):
            with open(os.path.join(folder, fname), encoding="utf-8") as fh:
                records.append(json.load(fh))
    return sorted(records, key=lambda r: r["id"])


def build():
    with open(os.path.join(ROOT, "data", "taxonomy.json"), encoding="utf-8") as fh:
        bundle = {"taxonomy": json.load(fh)}
    state = os.path.join(ROOT, "data", "state.json")
    if os.path.exists(state):
        with open(state, encoding="utf-8") as fh:
            bundle["state"] = json.load(fh)
    for name in FOLDERS:
        bundle[name] = load_folder(name)
    return bundle


def deals_csv(bundle):
    """One row per deal, rumors included and marked by the confidence column. Amounts stay as
    stored (ranges as low and high, nothing summed); the source is each deal's first source."""
    names = {c["id"]: c["name"] for c in bundle["companies"]}
    urls = {s["id"]: s.get("url", "") for s in bundle["sources"]}
    buf = io.StringIO()
    out = csv.writer(buf, lineterminator="\n")
    out.writerow(CSV_FIELDS)
    num = lambda v: "" if v is None else ("%d" % v if float(v).is_integer() else repr(v))
    for d in bundle["deals"]:
        row = dict(d, payer_name=names.get(d["payer"], ""), payee_name=names.get(d["payee"], ""),
                   source_url=urls.get((d.get("sources") or [""])[0], ""))
        row["contingent"] = "true" if d.get("contingent") else ""
        for k in ("amount_usd_low", "amount_usd_high", "paid_to_date_usd"):
            row[k] = num(d.get(k))
        out.writerow([row.get(k, "") if row.get(k) is not None else "" for k in CSV_FIELDS])
    return buf.getvalue()


def outputs():
    bundle = build()
    return {OUT: json.dumps(bundle, indent=1, ensure_ascii=False, sort_keys=True) + "\n", CSV_OUT: deals_csv(bundle)}


def main():
    files = outputs()
    if "--check" in sys.argv:
        stale = [p for p, text in files.items() if (open(p, encoding="utf-8").read() if os.path.exists(p) else "") != text]
        if stale:
            print("bundle: %s stale; run python3 scripts/bundle.py" % ", ".join(os.path.relpath(p, ROOT) for p in stale))
            return 1
        print("bundle: up to date")
        return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    for path, text in files.items():
        with open(path, "w", encoding="utf-8", newline="") as fh:
            fh.write(text)
        print(f"bundle: wrote {os.path.relpath(path, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
