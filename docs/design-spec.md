# Design spec (round 6, as built in sessions 14a to 14e, with the round 7 changes from 14f)

This is the reference for how the site looks and why. It is rewritten from `mockups/round6/spec.md` and `mockups/round6/HANDOFF.md` and describes what is built on the branch. Decisions D48 to D56 in `decisions.md` settle it, with the round 7 review (`mockups/round7/REVIEW.md`) applied in session 14f; P04 (color means layer) and P23 (no netting, counts not sums of caps) still hold. The mockups stay in `mockups/round6/` (the `png/` folder has the reference screenshots).

## 1. Tokens

Hex values live only in the three token blocks at the top of `site/css/site.css`; the render test fails on a hex color anywhere else.

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| paper | #fafaf9 | #17191c | page; a hair off white in light, charcoal in dark |
| wash | #f0f1f0 | #212429 | row hover, company boxes, open rows |
| ink | #16202e | #ebedef | text, figures and links (D49: links are ink) |
| ink-2 | #46505f | #b6bcc5 | secondary text, chart labels |
| muted | #5c6677 | #8f98a6 | metadata, F/S/R markers, benched names, guarantees |
| rule | #e2e3e4 | #2e3237 | hairlines, chip borders, link underline |
| hw / infra / model | #0f3d8a / #2f7fd8 / #5aa0e6 | #3f7fe0 / #7fb0f2 / #bcd4f7 | the chain on one blue ramp, by position |
| cap | #7d8ba0 | #93a3b8 | Capital, slate |
| pop | #cc3215 | #ff6a3d | vermilion, the only accent |
| pop-2 | #a8280f | #d9512a | the primary button's bottom edge |

Families: hardware (Equipment, Chip design, Foundry, Memory, Systems), infrastructure (Power, Data centers, Hyperscale), models (Labs, Applications), Capital. A mark takes its payer's family color. The palette validator passes both ramps in ordinal mode on both papers.

Theme: a three-way segment (Auto, Light, Dark) in the nav. Auto follows the system; a pick is kept on this device only.

## 2. The pop, three places only (D49, round 7)

1. The one primary button per page and the active nav underline.
2. The paid square in lists and the "now paid" glyph in What changed.
3. Link hover underline and focus rings.

The hero figures are set in ink (their size carries them) and there is no rule above the nav.

Never a chart mark. The render test greps the stylesheet and fails if `--pop` or `--paid` appears anywhere else.

## 3. Type and rhythm

Self-hosted from `site/fonts/` (D37). Figures are lining and tabular.

| Role | Face | Size |
|---|---|---|
| Masthead, metadata, markers, counts | IBM Plex Mono 400 | 12 |
| Headline (h1) | Newsreader 500 | 44 (52 on the Overview; 32 and 36 on phones) |
| State line | Newsreader 400 | 22 (19 on phones) |
| Section head (h2) | Newsreader 500 | 22 |
| Figures | Newsreader 600 | 13 to 17; hero figures 44 |
| Body | IBM Plex Sans 400 | 15 |
| Chart labels | IBM Plex Sans | 11 to 12 |

Container 1080px plus gutters (24, 16 on phones); text column 640px; 56px between sections. The page never scrolls sideways at 1280 or 390 (the browser test checks every page in both themes).

## 4. Components

- Primary button: pop fill, white text (charcoal in dark), 600, 4px radius, 38px tall, an inline arrow or download glyph, 2px pop-2 bottom edge, lifts on hover. One per page: Follow the money (Overview), Trace its money (company card).
- Quiet button: pop outline and text. Download the data (Overview), Full card (Money flows trace).
- Chips: 4px radius, rule border; active is ink fill, paper text, 600. Used for sourcing, basis, Rank by, width and the Companies filters. A view switch is a link styled as a chip, so the choice lives in the URL.
- Select and search: rule border, 4px radius.
- Tooltip: ink background, paper text, two lines, the item first in Newsreader 600; same text as each title.
- Rows: counterparty, type, amount with its basis square and F/S/R marker; wash on hover; the one-line summary on hover.
- Site mark: an 18px wheel of eleven segments in chain order.

## 5. Encodings (D50)

| What | Mark |
|---|---|
| Amount | width (sankey ribbons, butterfly curves, ledger bars, the three-company ring); length (loop arrows between two companies) |
| Paid | solid |
| Committed | outline with a light fill (sankey, racetrack) or a pale band with a centre line (butterfly) |
| Paid to date | solid inside the committed mark, from the tail, to the paid share |
| Caps and multi-year totals | words in the label ("up to", "multi-year"); a layer sum with any is labeled "ceilings" |
| Guarantee | grey, drawn but never counted in widths or rankings |
| No amount | dotted hairline (a 56px dotted stub on loop rows); counted in deal counts, not in widths |
| Sourcing | mono marker after the amount: F filed, S company-stated, R reported |

No hatching and no dashes anywhere. Rumors are hidden by default and never in the Overview.

## 6. Charts

- Sankey (Overview and Money flows): payer layers on the left ranked by what they pay, payee layers on the right ranked by what they are paid. Ribbon height is the sum of high ends (D33), 2px floor, keyed "announced ceilings, not cash". Ribbons of $5B or more are labeled ("$518B ceilings · 8 deals"), swept 16px apart and kept in frame; smaller ones are counted in the key line. The Overview copy (D56) labels only ribbons of $20B or more, draws the rest as 1px hairlines at 40% ("N smaller flows are unlabeled; see Money flows."), and carries one computed sentence in Newsreader 600 13px under the largest ribbon ("Labs have promised clouds $518B; clouds have paid labs ..."). The hover tooltip stays on every ribbon. A layer opens to its companies on one side; a traced company dims every ribbon it is not on. Deal count is a toggle. On phones it becomes a ranked ledger, one row per layer pair on a shared scale.
- Loop rows (Loops page and Overview minis, D52 round 7): two company boxes, left and right; the gap between them is the scale, $250B, with faint ticks at $100B and $200B labeled once per chart in mono. One arrow per deal, constant thickness (11px desktop, 8px compact and phone), length = amount; top arrows leave the left company pointing right, bottom arrows leave the right company pointing left, largest first. The label (amount, type, F/S/R) sits past the head, or above the arrow when it nearly fills the gap. Compact form on the Overview (330px, amount-only labels, no ticks, key line "Arrow length is the amount; the gap between the boxes is $250B."); phones get a 358px form with amount-only labels. The one three-company ring keeps the racetrack with width for the amount, stacked vertically on phones. A 30px icon marks each loop in lists.
- Butterfly (company card and Money flows trace): the five largest deals in on the left and out on the right, curves meeting at the company dot.
- Who the deals run through (Overview): the top 8 companies by number of deals they are party to; one bar each, in solid and out outlined, labeled "23 9 in · 14 out". A count, never a sum.
- Chain wheel (Companies, desktop only): one arc per layer clockwise from Equipment, Capital closing the circle; a dot for each company with a sourced deal; names along the radius, muted when benched, hidden below 1024px.

## 7. Pages

- Overview (D51, no filters): masthead; "Who pays whom to build AI"; the state line (D41); three computed findings with plain-language evidence links; Follow the money and Download the data; the sankey; three largest loops; Who the deals run through; What changed (4 rows, D54); Top 10 flows. The findings are recomputed in the render test and fail if the data drifts.
- Money flows: one wrapping row of sourcing and basis chips, company search, More filters, the trace select and the Ceilings / Deal count chips, the count last; the sankey with open layers and trace; the no-amount line with a link to list them; the butterfly in trace mode; the full list in a details element.
- Loops: sourcing chips and Rank by (promised back, put in, deals); one caveat line ("Arrow length is the amount, one scale for every loop. Nets are not shown: ceilings cannot be netted against cash."); the key; one row per loop with a header stating both sides, its mono notes on their own line under it, and the loop's one line under the arrows.
- Companies: state line with counts; search and chips (has a sourced deal, public, private); the wheel; the directory by layer with benched names muted.
- Company card: layer dot in the h1, one line, facts line with Trace its money; butterfly and key; Money in and Money out lists; loops as icon rows. No filter chips (D55).
- What changed: grouped by ISO week, with the outline-to-solid glyph when a deal becomes paid.
- The data: downloads of the bundle and a deals CSV, both built by `scripts/bundle.py`.

## 8. Word budgets (D39, enforced by tests/render.mjs)

Headline 6 words or fewer; state line 20 or fewer; no paragraph under a headline; loop line 15 or fewer; caveats once per page; tooltips two lines; Overview text outside charts under 250 words. Charts, the phone ledger, bar ledgers, selects, the filter drawer and F/S/R markers are not counted. The Overview measures 248.

## 9. Checks

- `python3 scripts/validate.py` before every commit; CI runs it with the loop, bundle, self-test and render checks.
- `tests/render.mjs` renders every page in Node across filter states and checks budgets, findings, sankey labels and widths, loop arrow counts and lengths, the Overview hairlines and sentence recounted from the records, run-through counts, the Companies directory, one primary button per page, token and pop rules.
- `tests/browser.mjs` runs in GitHub Actions at 1280 and 390 in both themes and saves screenshots to the `fetch` branch under `screens/`.
