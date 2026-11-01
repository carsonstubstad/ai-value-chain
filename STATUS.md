# AI Value Chain Tracker: status and design review

As of 1 Nov 2026. Branch `claude/project-thread-6qiz8r`, draft PR #10. Written from the code and data on that branch.

## 1. Answer first

- The data and all five site pages are built. Sessions 1 to 13 of 14 are done, and the site is waiting on Carson's Gate 4 look.
- What's left: Gate 4 (accept the site and merge PR #10), then session 14 (launch pages and the Epoch terms check), then Gate 5 (yes to GitHub Pages).
- GitHub Pages is off. Nothing has been published beyond the public repo itself.
- The record holds 47 companies, 66 deals, 11 loops, 118 sources and 17 dated change events.
- The headline holds up in the data: 56 of the 65 visible deals are commitments (money promised), and 9 are paid.
- Main design risks for a reviewer:
  - The money flows chart is dense.
  - Loop cards feel empty because no loop qualifies for a net figure.
  - Committed versus paid is shown as text only, not drawn in the charts.

## 2. Where the project stands

### Plan and gates

The build runs as 14 bounded sessions with five approval gates. Every merge to main waits for Carson's explicit yes, and Pages stays off until Gate 5.

| Gate | What Carson approved | Decisions |
| --- | --- | --- |
| Gate 1 | Concept note and reconciliation (P01 to P20). News from company newsrooms and 8-Ks first. Weekly cadence. PR #1 merged. | D16 to D20 |
| Gate 2 | "Go with A plus B": the chain rail as the home screen, with a one-sentence state line above it. The flow map becomes the Money flows view. PRs #2 and #3 merged. | D21 to D23 |
| Sessions 5 to 8 | Deal seeding by layer, one merge per session (PRs #4 to #7). Multi-lender loans put the full facility on the lead lender's edge, labeled "syndicate total". | D24 to D27 |
| Gate 3 | "Approve all four": the data accepted after the spot check, the loop rule, PR #8 merged, the status sweep next. | D28 to D31 |
| After Gate 3 | "Yes, run to Gate 4": a filing figure outranks a press release figure (Blackstone-led CoreWeave loan is $7.6B), PR #9 merged, sessions 11 to 13 approved. | D32 |
| Gate 4 (now) | Waiting: accept the site and merge PR #10. | |
| Gate 5 (next) | Waiting: yes to turning on GitHub Pages after session 14. | |

Merged so far: PRs #1 to #9. Open: draft PR #10, the site pages.

### Data, as of 31 Oct 2026

- Companies: 47 across 11 layers, ordered left to right.
  - Equipment 4, chip design 5, foundry 1, memory 3, systems 5, power 4, data centers 6, hyperscale 5, labs 4, applications 4, capital 6.
  - Ownership: 36 public, 9 private, 1 joint venture, 1 government.
  - Headquarters: 35 in the US, the rest in NL, TW, KR, JP, GB, CA, AE and FR.
- Deals: 66, one record per deal, with direction following the money.
  - Sourcing: 27 filed, 35 company-stated, 3 reported, 1 rumored (hidden by default).
  - Basis: 57 committed, 9 paid.
  - Status: 37 signed, 18 announced, 11 closed.
  - Amounts: 15 one-time, 15 caps, 11 multi-year totals, and 25 with no disclosed amount.
  - One deal is a syndicate total.
- Deal types:
  - Equity: 17 equity investments, 6 JV contributions, 3 warrants.
  - Commercial: 13 capacity leases, 13 purchase commitments, 5 power supply agreements, 1 revenue share.
  - Debt and guarantees: 3 guarantees, 1 loan.
  - Public money: 4 government grants.
- Loops: 11, found automatically from every deal that isn't rumored, terminated or superseded.
  - Ten are two-company loops: Amazon and Anthropic, Amazon and OpenAI, AMD and Meta, AMD and OpenAI, Blue Owl and Meta, CoreWeave and OpenAI, Google and Anthropic, Microsoft and Anthropic, Microsoft and OpenAI, NVIDIA and OpenAI.
  - One is a three-company ring: NVIDIA, CoreWeave and OpenAI.
- Sources: 118 in total. 57 regulatory filings, 45 company releases, 10 press reports and 6 government pages.
- Events: 17 dated changes from the spot check and the status sweep. Each is dated to the filing or release that caused it.
- Epoch AI: no Epoch data is in the record yet, so the site shows no Epoch credit. The footer adds the credit automatically if an Epoch source appears.

### Automated checks (all green on the current head)

Run on every push and pull request (check.yml):
- `scripts/validate.py` checks that:
  - no tracked text file has an em-dash
  - every JSON file parses and matches its schema
  - ids are unique and every reference points at a real record
  - filed and company-stated claims cite the right kind of source
  - a low amount is never above the high amount
  - one deal is one edge
  - every loop is closed
- `validate.py --self-test` proves those checks catch known bad fixtures.
- `scripts/loops.py --check` fails on any untagged money loop.
- `scripts/bundle.py --check` fails if the site's data bundle is stale.
- `tests/render.mjs` renders every page and every company card under 14 filter states and fails on a script error, "undefined", "NaN", an em-dash or unbalanced HTML.

When site files change (browser.yml):
- It loads 8 views in real Chromium at desktop (1280 px) and phone (390 px) widths, in light and dark.
- It fails on a script error, sideways page scroll, an empty view or dark mode not applying.
- It tests the main clicks: a filter chip, search, the layer rail, reset, the theme button, the trace picker and a company link.
- It saves screenshots to the `fetch` branch under `screens/`.

### Scheduled jobs

- fetch.yml runs weekly (Monday 06:00 UTC, Sunday night Pacific):
  - It looks up every company in SEC EDGAR and checks its website link.
  - It pulls the passages of each filer's latest 10-Q and annual report that name a deal partner.
  - It writes small filtered files to the `fetch` branch, using the EDGAR identity from the Actions secret SEC_USER_AGENT.
- fetch-probe.yml is the Step 3 test of each source and runs only on demand.
- Not built yet: the weekly news digest (P16), which collects candidates Sunday night and has a Monday review open a pull request. It is planned as part of the first weekly entry in session 14.

### What's left

1. Gate 4: Carson reviews the site locally, then accepts it and approves merging PR #10.
2. Session 14 (light):
   - Method and About the data pages, a README, a changelog and the first weekly entry.
   - Check Epoch AI's terms of use (O12).
   - Remove the unused d3 files, if agreed.
3. Gate 5: Carson's yes to turning on GitHub Pages.
4. Open questions still with Carson:
   - O14: confirm P21 to P23 (company list, schema, loop and ranking rules).
   - O06: paid data stays at $0 for now, to revisit after two months of weekly updates.

## 3. Design and visual breakdown

### Principles the design follows

- Audience: busy professionals and executives. Lead with the answer, keep one idea per screen, and make every number reach its source in two clicks or fewer.
- Color means layer only (P04). How a deal is sourced is shown by shape (solid, striped, outline, dashed), never by color.
- Counts, not sums: caps, ranges and multi-year totals are never added up as cash. Rankings use each company's largest single deal.
- Rumors are hidden by default. Every amount is a link to its source.

### Shell, used on every page

- A sticky top bar holds the wordmark ("AI VALUE CHAIN" in small monospace capitals), the links Overview, Money flows, Loops and What changed, and a theme button on the right. The current page is underlined in the accent color.
- One centered column, at most 1080 px wide, with 24 px gaps between blocks. The page has a 16 px side gutter that respects the phone's safe areas.
- The footer gives counts, the as-of date, "Every amount links to its source", "Not investment advice" and a link to the source code.
- The filter panel sits under each page's own headline, so the answer comes first. It appears on Overview, company cards and Money flows. Loops and What changed have no filters.

### Overview (home)

Order from top to bottom:
1. Eyebrow "AI VALUE CHAIN TRACKER", the headline "Who pays whom to build AI", then the state line in a large serif: "Most of the money tracked so far is promised, not yet paid."
2. Three stat tiles: 56 committed deals, 9 paid deals, 25 deals with no disclosed amount. A note under them says these are counts, not dollar totals.
3. The filter panel.
4. The chain rail: 11 columns from Equipment to Capital. Each has a 4 px top border in its layer color, the layer name, and its company and deal counts. Tapping a column filters the whole page to deals touching that layer, and tapping it again clears the filter. Layers with no companies are dimmed. On a phone the rail scrolls sideways inside itself.
5. "Largest money flows, high end of each deal": the top 15 deals as horizontal bars. Each row shows:
   - Payer to payee (both names link to their cards), with the one-line summary under them.
   - A bar on a linear scale, where the largest high end shown is full width.
   - The amount as a link to its source, for example "$250B, multi-year total" or "up to $105B, cap".
6. Bar encoding:
   - The bar's color is the paying company's layer.
   - Filed is a solid fill. Company-stated is a diagonal hatch. Reported is an outline only.
   - A range or "up to" cap is a dashed outline to the high end. When the range has a low figure, a solid inner bar is drawn to the low end.
   - Deals with no amount get no bar.
   - A legend explains all four styles.
7. Two ranked lists side by side: "Largest single deal paid out" and "Largest single deal received", top 8 each. Each line gives the company, its counterparty and the amount link.

### Company card (one per company, linked from every name)

- A breadcrumb back to Overview.
- A header with a 4 px left border in the company's layer color, containing:
  - the name and a facts row: primary layer (plus secondary layers), ownership, HQ country and tickers
  - the one-line description in serif
  - a freshness line: a dot (green when checked within 90 days, amber after 90, grey after 180), "Checked 31 Oct 2026" and a link to trace its money in Money flows
- The filter panel. If filters hide any of this company's deals, a note says how many, with a reset link.
- Two columns, "Money out: N deals" and "Money in: N deals", largest first. Each deal is a small card containing:
  - a layer dot and the counterparty
  - the deal type, and the amount as a source link on the right
  - the one-line summary
  - grey tags for basis, sourcing, status and announced date
  - a "Notes and sources" fold-out when the deal has notes or more than one source
- "Money loops it is part of", with each loop's one-line explanation.
- "Company sources", such as the EDGAR filing index.

### Money flows (the flow map, direction C from Gate 2)

- A headline, a short explanation, the filter panel, then a "Trace" picker listing all 47 companies.
- The chart is an SVG with 11 layer columns in chain order. Each column has a heading in small monospace capitals over a 3 px line in the layer color.
  - Companies are small rounded squares in their layer color, listed alphabetically in their column, with names to the right. Names longer than 15 characters are cut with a period.
  - Each deal is one curved line from payer to payee, with an arrowhead and both in the payer's layer color.
  - Line width is 1.5 + 9 x sqrt(deal high end / largest deal). A deal with no disclosed amount is a 1-unit hairline.
  - Line style shows sourcing: solid for filed, long dashes for company-stated, short dashes for reported, dots for rumored (only when rumors are turned on).
  - A deal between two companies in the same layer bows out to the right of the column.
  - Lines sit at 55% opacity and go full on hover. Hovering shows a tooltip with the payer, payee, amount, sourcing and basis.
  - Clicking a line opens its source. Clicking a company starts a trace.
- Trace: picking a company highlights every deal downstream (where its money goes, step by step) and upstream (where its money comes from).
  - Everything else fades to 7% opacity, and unrelated companies fade to 25%.
  - Two lists appear below the chart: its direct deals out and in as cards, plus the further companies reachable each way (the first 12, then "N more").
  - A note says the trace shows connection, not money passed through, because amounts are never added along a path.
- The chart scales to the page width on desktop. On a phone it keeps a 960 px minimum and scrolls sideways inside its box, while the page itself never scrolls sideways.
- "All N flows as a list" folds out a plain text list of every deal, as an accessible alternative to the chart.

### Loops

- A headline, "Where money goes out and comes back", and a short explanation of what a loop is.
- Cards in a responsive grid, each at least 30 rem wide, so one or two cards per row. Each card shows:
  - the loop name and its one-line explanation
  - every deal in the loop as a row: layer dot, payer to payee, deal type, the amount as a source link, and tags for basis, sourcing and status
  - a closing line
- Both directions are always shown gross, each deal at its own figure.
- A net figure appears only when the loop has two companies and every deal is a one-time, fixed, disclosed amount. Today none of the 11 loops qualifies, so each card ends with the reason, for example "No net figure, because at least one amount is a range or a cap and at least one deal is spread over years."

### What changed

- A headline, with "Data as of 31 Oct 2026".
- "Changes, newest first": 17 rows. Each has the date in monospace on the left (7 rem column) and on the right:
  - the kind in bold (New deal, Amount changed, Now paid, Status changed, Filing update)
  - the companies as links
  - a one-line summary in my own words, and a "Source" link
- "Newest deals by announcement date": the latest 10 deals with amount links.
- "How fresh the record is": one line saying every record was checked within 90 days, or listing the stale ones.

### Filters (Overview, company card, Money flows)

- A white panel with a hairline border and 6 px radius. Row labels are small monospace capitals. Chips are rounded pills, and a pressed chip inverts to dark on light.
- Rows:
  - Amounts: Committed, Paid, Estimated.
  - Announced: Any time, Last 24 months, Last 12 months.
  - Sourcing: Filed, Company-stated, Reported, Rumored. All but Rumored are on by default.
  - Company: a search box that filters by payer or payee name as you type.
  - "More filters", a fold-out: deal type family, minimum size at the high end ($1B, $10B, $50B, $100B), ownership, HQ region (Americas, Europe, Asia and Middle East). It opens itself and shows "(N on)" when any of these are set.
- A count line: "Showing 65 deals of 65 (rumors hidden by default)", plus the layer if one is picked, plus "Reset filters" when anything differs from the defaults.
- Every filter lives in the page address after the #, so a filtered view can be bookmarked or shared. Links between pages keep the filters.

### Color palette

The page uses CSS variables on :root, redefined for dark mode.

| Token | Light | Dark |
| --- | --- | --- |
| Background | #f4f5f7 | #0e1116 |
| Panel | #ffffff | #161a21 |
| Text | #151a22 | #e5e8ed |
| Muted text | #5b6573 | #98a2b0 |
| Hairline | #d9dde3 | #2a313b |
| Soft fill | #eef0f3 | #1d222a |
| Accent (links) | #2f6fd1 | #5b93ec |

Layer colors (light / dark): Equipment #6b7f99 / #8da0ba, Chip design #2f6fd1 / #5b93ec, Foundry #6a4fc4 / #9178e0, Memory #9a3fb0 / #c26bd6, Systems #c0407a / #e06b9c, Power #d2622a / #ec8650, Data centers #b58a12 / #d8ad3a, Hyperscale #3f8f4a / #62b26d, Labs #11847f / #3cb3ad, Applications #2a8fbf / #55b2de, Capital #8a6a4a / #b8936e.

Freshness dots use green, amber and grey. Note that the accent blue matches the Chip design layer color.

### Typography

- Three families, named in CSS:
  - IBM Plex Sans for body text and headings
  - IBM Plex Mono for labels, amounts and dates
  - Newsreader (serif) for the state line and company one-liners
- No web fonts are loaded, so the site makes no third-party requests. Readers see the fallbacks: Helvetica Neue or Arial, the system monospace (Menlo or similar), and Georgia.
- Sizes:
  - Body 15 px, line height 1.5.
  - H1 1.7 rem (1.4 rem on phones).
  - State line 1.2 to 1.6 rem, scaling with width.
  - Eyebrows 0.72 rem monospace capitals with letter spacing.
  - Amounts are in tabular figures, so digits line up.

### Light and dark

- The theme follows the system setting by default.
- The theme button in the top bar cycles auto, light, dark. The choice is stored on that device only, and the page still works when storage is blocked.
- Every color has a dark variant, layer colors included. Chart labels get a halo in the panel color so they stay readable over lines.

### Phone (390 px wide, checked in Chromium)

- Under 720 px: two-column sections stack, and the stat tiles become one compact row each.
- Under 640 px:
  - Flow rows put the bar under the names.
  - Filter labels sit above their chips, and search goes full width.
  - Change rows stack the date over the text.
  - The wordmark takes its own line in the top bar.
- The chain rail and the flows chart scroll sideways inside their own boxes. The page itself never scrolls sideways, and the browser check enforces that.

### Interactions, in one list

- Tap a layer in the rail to filter. Tap again to clear.
- Tap any filter chip, type in search, or use More filters. The address updates.
- Tap any company name to open its card.
- Tap any amount, chart line or "Source" link to open the original source in a new tab.
- On Money flows, pick a company or tap a node to trace it. Tap again or press Clear to stop.
- Use "Notes and sources" on a deal card to see the record's notes and every source.
- Use the theme button to cycle auto, light, dark.

### Known rough spots

1. The money flows chart is busy around Hyperscale and Labs, where most deals meet. Long-range lines from Capital cross the whole chart. Tracing a company is currently the readable way in.
2. Loop cards never show a net figure, which is correct under the rule but makes the cards feel unfinished.
3. Company records say "Nvidia" while deal summaries and loop names say "NVIDIA". It's a one-line data fix.
4. In a trace, "Further down the chain" reaches most of the map, because the companies are so connected. The list is capped at 12 names, but the message is weak.
5. Committed versus paid is shown only as text tags. P04 called for basis to be encoded by shape, and today shape is used only for sourcing.
6. d3 and d3-sankey are vendored in site/vendor but unused, because the chart is hand-drawn SVG. Proposed: remove them in session 14.
7. The overview's top 15 list includes summaries under each name, which makes rows tall on a phone (the phone overview is about 7,800 px long at 2x).
8. Brand fonts are named but never loaded, so the look depends on each reader's system fonts.
9. The state line is still marked draft in data/state.json.

## 4. Open design questions for a reviewer

1. Should committed versus paid be drawn, not just tagged? For example, a solid bar for paid and an outline for committed, with sourcing moved to a small marker.
2. Money flows: keep one line per deal, or bundle the lines between two companies (with a count) and let the trace reveal individual deals? Is alphabetical node order right, or should nodes sort by deal volume to cut crossings?
3. Loops: is gross-only with a reason line enough, or should each card add a simple two-sided visual (an arrow each way, sized by high end) so the loop reads at a glance?
4. Overview length on a phone: drop the summaries under each flow and keep them on the company card?
5. Stat tiles: is "25 deals with no disclosed amount" the right third tile, or would a sourcing mix (filed vs company-stated) say more?
6. Fonts: load IBM Plex and Newsreader from the repo (self-hosted, no third-party request) or accept system fonts?
7. Accent color: should links use a neutral color so blue is reserved for the Chip design layer?
8. The state line: is "Most of the money tracked so far is promised, not yet paid." the right headline for launch?

## 5. Run it locally, and where things live

First time:

```
git clone https://github.com/carsonstubstad/ai-value-chain.git
cd ai-value-chain
git checkout claude/project-thread-6qiz8r
python3 -m http.server 8000 --directory site
```

Already cloned:

```
cd ai-value-chain
git fetch origin
git checkout claude/project-thread-6qiz8r
git pull
python3 -m http.server 8000 --directory site
```

Open http://localhost:8000, and stop the server with Ctrl+C. Opening index.html straight from disk will not work, because the page fetches its data over HTTP.

Checks you can run on the laptop:

```
python3 scripts/validate.py
python3 scripts/loops.py --check
python3 scripts/bundle.py --check
node tests/render.mjs
```

Key files:
- Site:
  - `site/index.html`: page shell (top bar, view, footer).
  - `site/css/site.css`: all styles, color tokens, dark mode and phone rules.
  - `site/js/app.js`: router, filter wiring and theme button.
  - `site/js/views.js`: one function per page, turning data plus filters into HTML.
  - `site/js/lib.js`: formatting, filters, staleness and trace helpers.
  - `site/data/bundle.json`: all data in one file, written by `scripts/bundle.py`. Never edit by hand.
- Data and rules:
  - `data/companies`, `data/deals`, `data/loops`, `data/sources`, `data/events`: one JSON file per record, the source of truth.
  - `data/taxonomy.json` (layers, deal types, staleness thresholds) and `data/state.json` (the headline line).
  - `schema/`: the six record schemas.
- Docs:
  - `decisions.md`: every settled decision and open question.
  - `docs/build-plan.md`: the 14-session plan and its status.
  - `CLAUDE.md`: the standing rules.
- Automation:
  - `.github/workflows/`: check.yml, browser.yml, fetch.yml, fetch-probe.yml.
  - `scripts/`: validate.py, loops.py, bundle.py, fetch_companies.py, fetch_filings.py, fetch_probe.py.
- Tests: `tests/render.mjs` and `tests/browser.mjs`.
- Design history: `mockups/overview.html`, the three Gate 2 directions.
