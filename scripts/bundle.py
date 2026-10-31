#!/usr/bin/env python3
"""Write site/data/bundle.json from the records in data/ (P09).

Standard library only. The output is deterministic (sorted ids, no timestamps), so
`--check` can fail CI when someone edits data/ without re-running the bundle.

Usage:
  python3 scripts/bundle.py          write the bundle
  python3 scripts/bundle.py --check  exit 1 if the bundle is missing or stale
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "bundle.json")
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
    return json.dumps(bundle, indent=1, ensure_ascii=False, sort_keys=True) + "\n"


def main():
    text = build()
    if "--check" in sys.argv:
        current = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if current != text:
            print("bundle: site/data/bundle.json is stale; run python3 scripts/bundle.py")
            return 1
        print("bundle: up to date")
        return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(f"bundle: wrote {os.path.relpath(OUT, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
