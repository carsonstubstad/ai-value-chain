#!/usr/bin/env python3
"""Step 3 capability probe: one small request to each source, filtered output only.

Runs in GitHub Actions (the Duet sandbox cannot reach these hosts). Standard library only.
Writes one small JSON file. Each source reports ok, skipped or error on its own, so one
failure never hides the others and nothing is ever filled with a guess.

Env:
  SEC_USER_AGENT  EDGAR identity header, from the Actions secret. Never printed or saved.
Args:
  output path (default: probe.json)
"""

import csv
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

NVIDIA_CIK = "0001045810"
TIMEOUT = 30


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "ai-value-chain-probe"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.status, resp.read()


def probe_sec():
    ua = os.environ.get("SEC_USER_AGENT", "").strip()
    if not ua:
        print("::warning::SEC_USER_AGENT secret is not set; skipping the SEC fetch.")
        return {"status": "skipped", "reason": "SEC_USER_AGENT secret not set"}
    url = f"https://data.sec.gov/submissions/CIK{NVIDIA_CIK}.json"
    status, body = get(url, {"User-Agent": ua, "Accept-Encoding": "identity"})
    data = json.loads(body)
    recent = data.get("filings", {}).get("recent", {})
    filings = []
    for i in range(min(5, len(recent.get("form", [])))):
        acc = recent["accessionNumber"][i]
        filings.append({
            "form": recent["form"][i],
            "filed": recent["filingDate"][i],
            "url": f"https://www.sec.gov/Archives/edgar/data/{int(NVIDIA_CIK)}/{acc.replace('-', '')}/{recent['primaryDocument'][i]}",
        })
    return {
        "status": "ok", "http": status, "endpoint": url,
        "company": data.get("name"), "cik": data.get("cik"), "tickers": data.get("tickers"),
        "latest_filings": filings,
    }


def probe_gdelt():
    params = {
        "query": '"OpenAI" "Nvidia" sourcelang:english',
        "mode": "artlist", "format": "json", "maxrecords": "10",
        "timespan": "7d", "sort": "datedesc",
    }
    url = "https://api.gdeltproject.org/api/v2/doc/doc?" + urllib.parse.urlencode(params)
    status, body = get(url)
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return {"status": "error", "http": status, "endpoint": url, "reason": body[:200].decode("utf-8", "replace")}
    items = [
        {"title": a.get("title"), "url": a.get("url"), "domain": a.get("domain"), "seen": a.get("seendate")}
        for a in data.get("articles", [])
    ]
    return {"status": "ok", "http": status, "endpoint": url, "count": len(items), "items": items}


def probe_epoch():
    url = "https://epoch.ai/data/data_centers/data_centers.csv"
    status, body = get(url)
    rows = list(csv.reader(io.StringIO(body.decode("utf-8-sig"))))
    header, data = rows[0], rows[1:]
    return {
        "status": "ok", "http": status, "endpoint": url,
        "credit": "Epoch AI, AI data centers dataset",
        "rows": len(data), "columns": header,
        "first_names": [r[0] for r in data[:5] if r],
    }


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "probe.json"
    result = {"run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sources": {}}
    for name, fn in (("sec", probe_sec), ("gdelt", probe_gdelt), ("epoch", probe_epoch)):
        started = time.time()
        try:
            res = fn()
        except Exception as exc:  # report by name, never guess
            res = {"status": "error", "reason": f"{type(exc).__name__}: {exc}"[:300]}
        res["seconds"] = round(time.time() - started, 2)
        result["sources"][name] = res
        print(f"{name}: {res['status']}")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
