#!/usr/bin/env python3
"""Repo checks that run the same way in the sandbox, in CI and on the laptop.

Standard library only. Checks:
1. No em-dash character in any tracked text file (decision D12).
2. Every .json file parses.
3. Every record in data/<folder>/*.json matches its schema in schema/, using a small
   JSON Schema subset (see check_schema).
4. Cross-record rules: ids match file names and are unique, every reference points at
   a real record, filed and company_stated claims cite the right kind of source,
   low is not above high, one deal is one edge (no duplicate payer, payee, type, date),
   and every loop is closed (each company in it both pays and receives).

Usage:
  python3 scripts/validate.py              run the checks on the repo
  python3 scripts/validate.py --self-test  prove the checks catch known bad fixtures
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM_DASH = chr(0x2014)
TEXT_EXT = {".md", ".py", ".json", ".yml", ".yaml", ".html", ".css", ".js", ".txt", ".csv"}


def tracked_files():
    try:
        out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
        return [p for p in out.stdout.splitlines() if p]
    except (OSError, subprocess.CalledProcessError):
        files = []
        for base, dirs, names in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d != ".git"]
            files += [os.path.relpath(os.path.join(base, n), ROOT) for n in names]
        return files


def check_em_dashes(paths):
    errors = []
    for rel in paths:
        if os.path.splitext(rel)[1].lower() not in TEXT_EXT and os.path.basename(rel) != "CLAUDE.md":
            continue
        try:
            with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
                for n, line in enumerate(fh, 1):
                    if EM_DASH in line:
                        errors.append(f"{rel}:{n}: em-dash found (D12)")
        except (UnicodeDecodeError, FileNotFoundError):
            continue
    return errors


FOLDERS = {
    "companies": "company", "deals": "deal", "loops": "loop",
    "sources": "source", "events": "event", "financials": "financial",
}

TYPES = {
    "object": dict, "array": list, "string": str, "boolean": bool,
    "integer": int, "number": (int, float), "null": type(None),
}


def check_schema(value, schema, path="$"):
    """Validate a subset of JSON Schema: type, required, properties,
    additionalProperties (false only), enum, pattern, minimum, maximum, items, minItems."""
    errs = []
    t = schema.get("type")
    if t:
        allowed = t if isinstance(t, list) else [t]
        ok = any(
            isinstance(value, TYPES[a]) and not (a in ("integer", "number") and isinstance(value, bool))
            for a in allowed
        )
        if not ok:
            return [f"{path}: expected {t}, got {type(value).__name__}"]
    if "enum" in schema and value not in schema["enum"]:
        errs.append(f"{path}: {value!r} not in {schema['enum']}")
    if isinstance(value, str) and "pattern" in schema and not re.search(schema["pattern"], value):
        errs.append(f"{path}: {value!r} does not match {schema['pattern']}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errs.append(f"{path}: {value} below minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errs.append(f"{path}: {value} above maximum {schema['maximum']}")
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errs.append(f"{path}: missing required field '{key}'")
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in props:
                    errs.append(f"{path}: unexpected field '{key}'")
        for key, sub in props.items():
            if key in value:
                errs += check_schema(value[key], sub, f"{path}.{key}")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errs.append(f"{path}: fewer than {schema['minItems']} items")
        if "items" in schema:
            for i, item in enumerate(value):
                errs += check_schema(item, schema["items"], f"{path}[{i}]")
    return errs


def load_json(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return json.load(fh)


def check_json_and_records(paths):
    errors = []
    parsed = {}
    for rel in paths:
        if rel.endswith(".json") and not rel.startswith("tests/fixtures/bad/"):
            try:
                parsed[rel] = load_json(rel)
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                errors.append(f"{rel}: invalid JSON ({exc})")
    records = {kind: {} for kind in FOLDERS.values()}
    for rel, record in parsed.items():
        parts = rel.split("/")
        if len(parts) != 3 or parts[0] != "data" or parts[1] not in FOLDERS:
            continue
        kind = FOLDERS[parts[1]]
        schema_rel = f"schema/{kind}.schema.json"
        if schema_rel in parsed:
            errors += [f"{rel}: {e}" for e in check_schema(record, parsed[schema_rel])]
        rid = record.get("id") if isinstance(record, dict) else None
        if rid != parts[2][:-5]:
            errors.append(f"{rel}: id {rid!r} does not match file name")
        if rid in records[kind]:
            errors.append(f"{rel}: duplicate {kind} id {rid!r}")
        records[kind][rid] = (rel, record)
    return errors + check_references(records)


def check_references(records):
    errors = []
    companies, deals, sources = records["company"], records["deal"], records["source"]

    def need(rel, kind, ref, pool):
        if ref not in pool:
            errors.append(f"{rel}: unknown {kind} {ref!r}")

    for kind, pool in records.items():
        for rel, rec in pool.values():
            if not isinstance(rec, dict):
                continue
            for sid in rec.get("sources", []):
                need(rel, "source", sid, sources)
            low, high = rec.get("amount_usd_low", rec.get("value_usd_low")), rec.get("amount_usd_high", rec.get("value_usd_high"))
            if isinstance(low, (int, float)) and isinstance(high, (int, float)) and low > high:
                errors.append(f"{rel}: low is above high")
            kinds = {sources[s][1].get("kind") for s in rec.get("sources", []) if s in sources}
            if rec.get("confidence") == "filed" and "filing" not in kinds:
                errors.append(f"{rel}: confidence filed needs a filing source")
            if rec.get("confidence") == "company_stated" and not kinds & {"filing", "company", "government"}:
                errors.append(f"{rel}: confidence company_stated needs a company or filing source")
    edges = {}
    for rel, d in deals.values():
        need(rel, "company", d.get("payer"), companies)
        need(rel, "company", d.get("payee"), companies)
        if d.get("payer") == d.get("payee"):
            errors.append(f"{rel}: payer and payee are the same")
        key = (d.get("payer"), d.get("payee"), d.get("type"), d.get("announced"))
        if key in edges:
            errors.append(f"{rel}: same edge as {edges[key]} (one deal is one edge)")
        edges[key] = rel
        if d.get("syndicate_total") and "amount_usd_high" not in d and "amount_usd_low" not in d:
            errors.append(f"{rel}: syndicate_total needs an amount (D25)")
    for rel, loop in records["loop"].values():
        pays, gets = set(), set()
        for did in loop.get("deals", []):
            need(rel, "deal", did, deals)
            if did in deals:
                pays.add(deals[did][1].get("payer"))
                gets.add(deals[did][1].get("payee"))
        if pays != gets:
            errors.append(f"{rel}: not a loop, every company must both pay and receive in its deals")
    for rel, ev in records["event"].values():
        for cid in ev.get("companies", []):
            need(rel, "company", cid, companies)
        if "deal" in ev:
            need(rel, "deal", ev["deal"], deals)
    for rel, fin in records["financial"].values():
        need(rel, "company", fin.get("company"), companies)
    return errors


def self_test():
    """Good fixtures must pass the fixture schema; every bad fixture must fail."""
    fx = os.path.join(ROOT, "tests", "fixtures")
    schema = load_json("tests/fixtures/schema.json")
    failures = []
    for kind in ("good", "bad"):
        for name in sorted(os.listdir(os.path.join(fx, kind))):
            rel = f"tests/fixtures/{kind}/{name}"
            text = open(os.path.join(ROOT, rel), encoding="utf-8").read()
            try:
                errs = check_schema(json.loads(text), schema)
            except json.JSONDecodeError as exc:
                errs = [f"invalid JSON ({exc})"]
            if EM_DASH in text:
                errs.append("em-dash found")
            if kind == "good" and errs:
                failures.append(f"{rel} should pass but failed: {errs}")
            if kind == "bad" and not errs:
                failures.append(f"{rel} should fail but passed")
            print(f"  {kind:4} {name}: {'caught ' + errs[0] if errs else 'ok'}")
    return failures


def main():
    if "--self-test" in sys.argv:
        failures = self_test()
        for f in failures:
            print("FAIL", f)
        print("self-test", "failed" if failures else "passed")
        return 1 if failures else 0
    paths = [p for p in tracked_files() if not p.startswith("tests/fixtures/bad/")]
    errors = check_em_dashes(paths) + check_json_and_records(paths)
    for e in errors:
        print("ERROR", e)
    print(f"validate: {len(paths)} files checked, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
