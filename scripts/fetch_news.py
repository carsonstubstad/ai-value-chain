#!/usr/bin/env python3
"""Gather the week's news candidates for the Monday review (P16, D18).

Runs in GitHub Actions on Sunday night Pacific (the sandbox cannot reach sec.gov). Standard
library only. For every tracked company that files with the SEC it lists the current reports
(8-K, and 6-K for foreign filers) filed in the last eight days, reads each main document and
its press release exhibits as plain text and keeps short passages that name another tracked company or a dollar figure.
It also lists the records that have gone stale (last checked more than taxonomy.stale_days
ago), because the significance rules count a stale record as news to check.

Output is one small JSON file, capped at 30 candidates, ranked so filings that name a tracked
partner come first. Nothing is judged, summarized or written to data/ here: a Duet review on
Monday reads the candidates and opens one pull request with any changes (P16).

Env: SEC_USER_AGENT (Actions secret). Never printed or saved.
Args: output path, or --self-test to check the offline parts.
"""

import glob
import html
import json
import os
import re
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORMS = {"8-K", "8-K/A", "6-K"}
DAYS = 8
CAP = 30
WINDOW = 300
PER_FILING = 3
MONEY = re.compile(r"\$\s?[\d.,]+\s*(billion|million)", re.IGNORECASE)


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


def short_name(company):
    """The name as a filing would write it, without a parenthetical."""
    return re.sub(r"\s*\(.*?\)", "", company.get("name", "")).strip()


def recent_filings(sub, since):
    """Current reports filed on or after `since` (an ISO date), newest first."""
    recent = sub.get("filings", {}).get("recent", {})
    out = []
    for i, form in enumerate(recent.get("form", [])):
        filed = recent["filingDate"][i]
        if form in FORMS and filed >= since:
            out.append({
                "form": form, "filed": filed, "accession": recent["accessionNumber"][i],
                "doc": recent["primaryDocument"][i], "items": recent.get("items", [""] * (i + 1))[i],
            })
    return out


def exhibits(index):
    """The press release exhibits (EX-99) listed in a filing's index.json, at most two."""
    items = index.get("directory", {}).get("item", [])
    names = [i["name"] for i in items if re.search(r"ex-?99", i.get("name", ""), re.IGNORECASE) and i["name"].lower().endswith((".htm", ".html", ".txt"))]
    return sorted(names)[:2]


def find(text, names, own):
    """Tracked partners named in the text (not the filer itself), and short passages around
    each mention, the ones with a dollar figure first."""
    hits, spans = set(), []
    for cid, name in names.items():
        if cid == own or len(name) < 3:
            continue
        for m in re.finditer(r"\b" + re.escape(name) + r"\b", text):
            hits.add(cid)
            spans.append((max(0, m.start() - WINDOW), min(len(text), m.end() + WINDOW)))
    spans.sort()
    merged = []
    for s, e in spans:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    out = [text[s:e].strip() for s, e in merged]
    out = [p for p in out if MONEY.search(p)] + [p for p in out if not MONEY.search(p)]
    return sorted(hits), out[:PER_FILING]


def rank(cands):
    """Partner mentions first, then a dollar figure, newest first within each; capped at CAP."""
    ordered = sorted(cands, key=lambda c: (c["filed"], c["company"]), reverse=True)
    ordered.sort(key=lambda c: (-len(c.get("partners", [])), -int(bool(c.get("money")))))
    return ordered[:CAP]


def stale(records, today, days):
    """Records whose last_checked is more than `days` before today, oldest first."""
    cut = (today - timedelta(days=days)).isoformat()
    out = [{"id": r["id"], "last_checked": r["last_checked"]} for r in records if r.get("last_checked", "9999") < cut]
    return sorted(out, key=lambda r: (r["last_checked"], r["id"]))


def self_test():
    sub = {"filings": {"recent": {
        "form": ["8-K", "10-Q", "6-K", "8-K"], "filingDate": ["2026-11-01", "2026-10-30", "2026-10-28", "2026-10-01"],
        "accessionNumber": ["a-1", "a-2", "a-3", "a-4"], "primaryDocument": ["x.htm", "y.htm", "z.htm", "w.htm"],
        "items": ["1.01,9.01", "", "", "8.01"]}}}
    got = recent_filings(sub, "2026-10-25")
    assert [f["accession"] for f in got] == ["a-1", "a-3"], got
    assert got[0]["items"] == "1.01,9.01"
    names = {"openai": "OpenAI", "amazon": "Amazon", "x": "AI"}
    text = "Amazon agreed with OpenAI to provide $38 billion of capacity. Amazon also said nothing more."
    partners, ps = find(text, names, "amazon")
    assert partners == ["openai"], partners
    assert ps and "$38 billion" in ps[0], ps
    cands = [{"company": "b", "filed": "2026-10-30", "partners": [], "money": True},
             {"company": "a", "filed": "2026-10-31", "partners": ["openai"], "money": False}]
    assert [c["company"] for c in rank(cands)] == ["a", "b"]
    recs = [{"id": "old", "last_checked": "2026-01-01"}, {"id": "new", "last_checked": "2026-10-30"}]
    assert [r["id"] for r in stale(recs, date(2026, 11, 2), 90)] == ["old"]
    assert to_text(b"<p>A&amp;B</p><script>x</script>").strip() == "A&B"
    idx = {"directory": {"item": [{"name": "x.htm"}, {"name": "ex99-1.htm"}, {"name": "a-ex99_2.htm"}, {"name": "ex99-3.jpg"}, {"name": "R1.htm"}]}}
    assert exhibits(idx) == ["a-ex99_2.htm", "ex99-1.htm"], exhibits(idx)
    print("fetch_news self-test passed")


def main():
    if "--self-test" in sys.argv:
        return self_test()
    out_path = sys.argv[1] if len(sys.argv) > 1 else "news.json"
    ua = os.environ.get("SEC_USER_AGENT", "").strip()
    today = datetime.now(timezone.utc).date()
    since = (today - timedelta(days=DAYS)).isoformat()
    companies, deals = load("companies"), load("deals")
    with open(os.path.join(ROOT, "data", "taxonomy.json"), encoding="utf-8") as fh:
        amber = json.load(fh)["stale_days"]["amber"]
    names = {cid: short_name(c) for cid, c in companies.items()}
    result = {
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "since": since, "cap": CAP,
        "stale": {"days": amber, "companies": stale(companies.values(), today, amber), "deals": stale(deals.values(), today, amber)},
        "candidates": [], "errors": {},
    }
    if not ua:
        print("::warning::SEC_USER_AGENT secret is not set; skipping filings.")
        result["errors"]["sec"] = "SEC_USER_AGENT secret not set"
    else:
        cands = []
        for cid, c in sorted(companies.items()):
            cik = c.get("sec_cik")
            if not cik:
                continue
            try:
                sub = json.loads(get(f"https://data.sec.gov/submissions/CIK{cik}.json", ua))
                for f in recent_filings(sub, since):
                    f["company"] = cid
                    f["url"] = (f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/"
                                f"{f['accession'].replace('-', '')}/{f['doc']}")
                    time.sleep(0.3)
                    try:
                        text = to_text(get(f["url"], ua))
                        # The news is usually in the press release exhibit, not the cover document.
                        folder = f["url"].rsplit("/", 1)[0]
                        f["exhibits"] = exhibits(json.loads(get(folder + "/index.json", ua)))
                        for name in f["exhibits"]:
                            time.sleep(0.3)
                            text += " " + to_text(get(f"{folder}/{name}", ua))
                        f["partners"], f["passages"] = find(text, names, cid)
                        f["money"] = bool(MONEY.search(text))
                    except Exception as exc:
                        f["error"] = f"{type(exc).__name__}: {exc}"[:200]
                    cands.append(f)
            except Exception as exc:
                result["errors"][cid] = f"{type(exc).__name__}: {exc}"[:200]
            time.sleep(0.3)
        result["found"] = len(cands)
        result["candidates"] = rank(cands)
        print(f"news: {len(cands)} current reports since {since}, kept {len(result['candidates'])}")
    print(f"stale after {amber} days: {len(result['stale']['companies'])} companies, {len(result['stale']['deals'])} deals")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
