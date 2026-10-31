#!/usr/bin/env python3
"""Look up tracked companies in SEC EDGAR and check their website links.

Runs in GitHub Actions. Standard library only. Reads data/companies-list.csv.
Writes one small JSON file: for each company, the SEC match for its candidate
ticker (name, CIK, SIC, incorporation, latest annual report) and the HTTP result
of its website link. Nothing is guessed: a missing match is reported as missing.

Env: SEC_USER_AGENT (Actions secret). Never printed or saved.
Args: output path.
"""

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANNUAL = {"10-K", "20-F", "40-F"}


def get_json(url, ua):
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def check_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ai-value-chain link check)"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {"status": resp.status, "final_url": resp.geturl()}
    except urllib.error.HTTPError as exc:
        return {"status": exc.code, "final_url": exc.geturl()}
    except Exception as exc:
        return {"status": None, "error": f"{type(exc).__name__}: {exc}"[:160]}


def sec_lookup(rows, ua):
    tickers = get_json("https://www.sec.gov/files/company_tickers.json", ua)
    by_ticker = {v["ticker"].upper(): v for v in tickers.values()}
    out = {}
    for row in rows:
        t = row["sec_ticker"].strip().upper()
        if not t:
            continue
        hit = by_ticker.get(t)
        if not hit:
            out[row["id"]] = {"ticker": t, "match": None}
            continue
        cik = str(hit["cik_str"]).zfill(10)
        time.sleep(0.2)
        sub = get_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ua)
        recent = sub.get("filings", {}).get("recent", {})
        annual = next(
            ({"form": f, "filed": d} for f, d in zip(recent.get("form", []), recent.get("filingDate", [])) if f in ANNUAL),
            None,
        )
        out[row["id"]] = {
            "ticker": t, "cik": cik, "sec_name": sub.get("name"), "tickers": sub.get("tickers"),
            "sic": sub.get("sicDescription"), "incorporated": sub.get("stateOfIncorporationDescription"),
            "business_address": (sub.get("addresses", {}).get("business") or {}).get("stateOrCountryDescription"),
            "latest_annual": annual,
        }
    return out


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "companies.json"
    with open(os.path.join(ROOT, "data", "companies-list.csv"), encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    result = {"run_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    ua = os.environ.get("SEC_USER_AGENT", "").strip()
    if ua:
        try:
            result["sec"] = sec_lookup(rows, ua)
        except Exception as exc:
            result["sec_error"] = f"{type(exc).__name__}: {exc}"[:300]
    else:
        print("::warning::SEC_USER_AGENT secret is not set; skipping SEC lookups.")
        result["sec_error"] = "SEC_USER_AGENT secret not set"
    result["websites"] = {row["id"]: dict(url=row["website"], **check_url(row["website"])) for row in rows}
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("sec matches:", len(result.get("sec", {})), "websites checked:", len(result["websites"]))


if __name__ == "__main__":
    main()
