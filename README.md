# AI Value Chain Tracker

Who pays whom to build AI. The site maps 47 companies across the AI value chain, from chip equipment to labs and the capital behind them, and the deals that move money between them. Every amount links to its source, says how sure it is, and says whether the money is paid or only committed.

## What is on the site

- **Overview:** the money between layers of the chain, the three largest loops, the companies the most deals run through, what changed and the ten largest flows.
- **Money flows:** every flow between layers; open a layer to see its companies, or trace one company's money in and out.
- **Loops:** pairs and rings of companies where money flows out and back, for example an investment returned as cloud spending.
- **Companies:** the chain as a wheel and a directory by layer, each with a card of its deals.
- **What changed:** each dated change to a record, with the filing or release behind it.
- **Method** and **About the data:** how deals are recorded and sized, and what the files hold.

## How to read it

- Width (or arrow length on a loop) is the amount, sized by the high end of any range.
- Solid is paid; outline is committed, with any share paid to date drawn solid.
- Caps and multi-year totals are ceilings, labeled as such, and never added up as cash.
- Guarantees are drawn grey and never counted. Deals with no dollar figure count in deal counts only.
- F, S and R after an amount mean filed (in a regulatory filing), stated (by the company) and reported (by the press, outlet named). Rumors are kept but hidden by default.

## The data

Every record is one JSON file, checked against a schema:

| Folder | One file per |
| --- | --- |
| `data/companies/` | company: layer, ownership, headquarters, SEC CIK where it files |
| `data/deals/` | deal: payer, payee, type, low and high amount, kind, basis, sourcing, status, dates, sources |
| `data/loops/` | loop found by `scripts/loops.py`, with a one-line explanation |
| `data/sources/` | source: link, publisher, kind, date published and read |
| `data/events/` | dated change to a deal, with its source |

`scripts/bundle.py` writes `site/data/bundle.json` and `site/data/deals.csv` from the records; the site reads only the bundle. Both are on the site's About the data page to download. `CHANGELOG.md` has one entry a week.

Rules the data follows: one deal is one edge; direction follows the money; ranges stay ranges; every figure has a source, a sourcing level, an as-of date and a basis; summaries are written for this project, never copied. Public information only. Not investment advice, and no prices.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step and no third-party requests. Serve the folder over HTTP:

```
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000.

After editing anything in `data/`:

```
python3 scripts/validate.py
python3 scripts/loops.py --check
python3 scripts/bundle.py
node tests/render.mjs
```

CI runs the same checks on every push and pull request, and `tests/browser.mjs` loads every page in Chromium at desktop and phone widths in both themes. Scripts use the Python standard library only.

## Updates

Every Monday at 06:00 UTC, `.github/workflows/fetch.yml` looks up the tracked companies in SEC EDGAR, pulls passages of their latest quarterly and annual reports that name a deal partner, and lists the week's current reports (8-K and 6-K) and any records due a check. Its output goes to the `fetch` branch. A reviewed pull request then updates the records and the changelog; nothing changes on the site without review.

## Credits

- SEC EDGAR for filings, and each company's own releases and pages.
- Fonts: IBM Plex Sans, IBM Plex Mono and Newsreader, under the SIL Open Font License 1.1 (see `site/fonts/`).
- Where a record uses Epoch AI data, the site says: "Includes data from Epoch AI (epoch.ai/data), licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Changes made: filtered and summarized."

How the design was decided is in `decisions.md` and `docs/design-spec.md`.
