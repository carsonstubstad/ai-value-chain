#!/usr/bin/env python3
"""Pull the passages of each tracked company's latest SEC reports that mention its deal partners.

Runs in GitHub Actions (the sandbox cannot reach sec.gov). Standard library only.
For every company in data/companies with an sec_cik and at least one open deal, it reads
the newest 10-Q and the newest annual report (10-K, 20-F or 40-F), turns the main
document into plain text and keeps only short passages that name a deal partner or a
deal keyword. Output is one small JSON file for the status sweep (O16); Claude reads
the passages, never the whole filing. Nothing is summarized or guessed here.

Env: SEC_USER_AGENT (Actions secret). Never printed or saved.
Args: output path.
"""

import glob
import html
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORMS = [("10-Q",), ("10-K", "20-F", "40-F")]
CLOSED = {"closed", "terminated", "superseded"}
EXTRA = {"debt_or_gpu_backed_loan": ["delayed draw"], "jv_contribution": ["joint venture"]}
WINDOW = 450
MAX_PASSAGES = 60


def get(url, ua):
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def to_text(raw):
    text = raw.decode("utf-8", "replace")
    text = re.sub(r"(?is)<(script|style|ix:header)[^>]*>.*?</\1>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text)


def load(folder):
    out = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "data", folder, "*.json"))):
        with open(path, encoding="utf-8") as fh:
            rec = json.load(fh)
        out[rec["id"]] = rec
    return out


def terms_by_company(companies, deals):
    """Map each SEC filer to the names and keywords of its open, non-rumored deals."""
    terms = {}
    for d in deals.values():
        if d.get("confidence") == "rumored":
            continue
        if d.get("status") in CLOSED and d.get("amount_basis") == "paid":
            continue
        for me, other in ((d["payer"], d["payee"]), (d["payee"], d["payer"])):
            if not companies.get(me, {}).get("sec_cik"):
                continue
            entry = terms.setdefault(me, {"terms": set(), "deals": set()})
            entry["deals"].add(d["id"])
            if other == "us-government":
                entry["terms"].update(["CHIPS", "Department of Commerce"])
            else:
                name = re.sub(r"\s*\(.*?\)", "", companies.get(other, {}).get("name", "")).strip()
                if name:
                    entry["terms"].add(name)
            entry["terms"].update(EXTRA.get(d.get("type"), []))
    return terms


def passages(text, terms):
    """Short windows around each mention, merged when they overlap. Windows that
    also carry a dollar figure come first, then the rest, each in document order."""
    spans = []
    for term in terms:
        for m in re.finditer(r"\b" + re.escape(term) + r"\b", text, re.IGNORECASE):
            spans.append((max(0, m.start() - WINDOW), min(len(text), m.end() + WINDOW), term))
    spans.sort()
    merged = []
    for start, end, term in spans:
        if merged and start <= merged[-1]["end"]:
            merged[-1]["end"] = max(merged[-1]["end"], end)
            merged[-1]["terms"].add(term)
        else:
            merged.append({"start": start, "end": end, "terms": {term}})
    out = [{"terms": sorted(h["terms"]), "text": text[h["start"]:h["end"]].strip()} for h in merged]
    money = [p for p in out if re.search(r"\$\s?[\d.,]+\s*(billion|million)", p["text"])]
    rest = [p for p in out if p not in money]
    return (money + rest)[:MAX_PASSAGES]


def latest(sub, forms):
    recent = sub.get("filings", {}).get("recent", {})
    for i, form in enumerate(recent.get("form", [])):
        if form in forms:
            return {
                "form": form, "filed": recent["filingDate"][i], "period": recent["reportDate"][i],
                "accession": recent["accessionNumber"][i], "doc": recent["primaryDocument"][i],
            }
    return None


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "filings.json"
    ua = os.environ.get("SEC_USER_AGENT", "").strip()
    result = {"run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "companies": {}}
    if not ua:
        print("::warning::SEC_USER_AGENT secret is not set; skipping filings.")
        result["error"] = "SEC_USER_AGENT secret not set"
    else:
        companies, deals = load("companies"), load("deals")
        for cid, entry in sorted(terms_by_company(companies, deals).items()):
            cik = companies[cid]["sec_cik"]
            rec = {"cik": cik, "terms": sorted(entry["terms"]), "deals": sorted(entry["deals"]), "filings": []}
            try:
                sub = json.loads(get(f"https://data.sec.gov/submissions/CIK{cik}.json", ua))
                for forms in FORMS:
                    f = latest(sub, forms)
                    if not f:
                        continue
                    f["url"] = (f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/"
                                f"{f['accession'].replace('-', '')}/{f['doc']}")
                    time.sleep(0.3)
                    try:
                        text = to_text(get(f["url"], ua))
                        f["chars"] = len(text)
                        f["passages"] = passages(text, entry["terms"])
                    except Exception as exc:
                        f["error"] = f"{type(exc).__name__}: {exc}"[:200]
                    rec["filings"].append(f)
            except Exception as exc:
                rec["error"] = f"{type(exc).__name__}: {exc}"[:200]
            result["companies"][cid] = rec
            print(cid, [(f["form"], f["filed"], len(f.get("passages", []))) for f in rec["filings"]], rec.get("error", ""))
            time.sleep(0.3)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
