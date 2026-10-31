#!/usr/bin/env python3
"""Find money loops in the deal records and compare them with data/loops (build plan step 9).

Standard library only. A loop is a cycle of companies where money flows out and comes
back: A pays B and B pays A, or A pays B, B pays C and C pays A. Rumored deals and
deals that are terminated or superseded are left out, so a loop never rests on a
rumor. The detected loop lists every remaining deal along the cycle, both ways (D29).

Usage:
  python3 scripts/loops.py          print detected loops and how they match the records
  python3 scripts/loops.py --check  exit 1 if a detected loop has no record, or a
                                    record is missing a deal on its cycle
"""

import itertools
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_LEN = 3
LEFT_OUT_STATUS = {"terminated", "superseded"}


def load(folder):
    path = os.path.join(ROOT, "data", folder)
    out = {}
    for name in sorted(os.listdir(path)):
        if name.endswith(".json"):
            with open(os.path.join(path, name), encoding="utf-8") as fh:
                rec = json.load(fh)
            out[rec["id"]] = rec
    return out


def counted(deal):
    return deal.get("confidence") != "rumored" and deal.get("status") not in LEFT_OUT_STATUS


def find_cycles(deals):
    """Return {frozenset(companies): sorted deal ids} for simple cycles up to MAX_LEN."""
    edges = {}
    for d in deals.values():
        if counted(d):
            edges.setdefault((d["payer"], d["payee"]), []).append(d["id"])
    nodes = sorted({c for pair in edges for c in pair})
    out = {}
    for size in range(2, MAX_LEN + 1):
        for combo in itertools.combinations(nodes, size):
            first, rest = combo[0], combo[1:]
            for order in itertools.permutations(rest):
                ring = (first,) + order
                hops = [(ring[i], ring[(i + 1) % size]) for i in range(size)]
                if all(h in edges for h in hops):
                    key = frozenset(combo)
                    ids = set(out.get(key, []))
                    for h in hops:
                        ids.update(edges[h])
                    out[key] = sorted(ids)
    # A three-company ring that only adds to a two-company loop inside it is still
    # reported, since the third company changes the story.
    return out


def companies_of(loop, deals):
    found = set()
    for did in loop["deals"]:
        if did in deals:
            found.update((deals[did]["payer"], deals[did]["payee"]))
    return frozenset(found)


def main():
    deals, loops = load("deals"), load("loops")
    cycles = find_cycles(deals)
    by_members = {companies_of(l, deals): l for l in loops.values()}
    problems = []
    for members, ids in sorted(cycles.items(), key=lambda kv: sorted(kv[0])):
        name = " / ".join(sorted(members))
        rec = by_members.get(members)
        if rec is None:
            problems.append(f"untagged loop: {name}: {', '.join(ids)}")
            continue
        missing = sorted(set(ids) - set(rec["deals"]))
        if missing:
            problems.append(f"{rec['id']}: missing deals on its cycle: {', '.join(missing)}")
        print(f"ok  {rec['id']} ({rec['flagged_by']}): {len(rec['deals'])} deals")
    for members, rec in by_members.items():
        if members not in cycles and rec["flagged_by"] == "automatic":
            problems.append(f"{rec['id']}: flagged automatic but no cycle found")
        elif members not in cycles:
            print(f"ok  {rec['id']} (hand): not a detected cycle, kept by hand")
    for p in problems:
        print("LOOP", p)
    print(f"loops: {len(cycles)} detected, {len(loops)} records, {len(problems)} problems")
    return 1 if problems and "--check" in sys.argv else 0


if __name__ == "__main__":
    sys.exit(main())
