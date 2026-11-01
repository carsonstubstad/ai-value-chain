# Build brief for Duet: round 6 design (Carson's pick, 2026-11-01)

Carson has picked the round 6 mockups as the design for the site. Build to them. Everything you need is in `mockups/round6/`: five HTML mockups generated from the real bundle, `spec.md` with the tokens and rules, `png/` with every page in both themes at 1280 and 390, and `build.py`, whose chart code you may port. The brief below is the contract; the mockups are the reference; where they disagree, this brief wins.

## 1. The decision in one paragraph

Neutral near-white ground with charcoal dark mode; one blue ramp for the chain's three families plus slate for Capital; one vermilion accent in five fixed places; tactile buttons and chips; the Overview opens with headline, state line and three findings in a row; the hero chart is the two-column sankey (payers ranked left, payees ranked right); every loop is a racetrack on one shared scale; the Companies page carries the chain wheel; the loop ring and the chord are gone. The data rules do not change.

## 2. What does not change

CLAUDE.md, D01 to D12, P04 (color means layer only), P23 (never a sum of caps), D39 word budgets, D41 state line, D44 to D47 data rules, the hash router and filter model (F15), self-hosted fonts (D37), no build step, no third-party requests. The render test keeps every check it has today.

## 3. Tokens (copy from spec.md section 1)

Light: paper #fafaf9, wash #f0f1f0, ink #16202e, ink-2 #46505f, muted #5c6677, rule #e2e3e4, pop #cc3215, pop-2 #a8280f, hw #0f3d8a, infra #2f7fd8, model #5aa0e6, cap #7d8ba0.
Dark: paper #17191c, wash #212429, ink #ebedef, ink-2 #b6bcc5, muted #8f98a6, rule #2e3237, pop #ff6a3d, pop-2 #d9512a, hw #3f7fe0, infra #7fb0f2, model #bcd4f7, cap #93a3b8.
Light is the default; dark follows the system until the reader picks. The theme control is a three-way segment in the nav (Auto, Light, Dark). The 4px pop rule sits above the nav on every page.

The pop appears in exactly these places and nowhere else: the three hero figures; the one primary button per page and the active nav underline; the paid square in lists and the "now paid" glyph in What changed; link hover underline and focus rings; the 4px top rule. Never a chart mark.

## 4. Components (spec.md section 4; CSS is in build.py's CSS string)

- Primary button: pop fill, white text (dark: charcoal text), 600, 4px radius, 38px tall, inline arrow or download glyph, 2px pop-2 bottom edge, soft glow, 1px lift on hover, 1px press on click. One per page: Follow the money (Overview, to Money flows), Trace (Money flows), Trace its money (company card).
- Quiet button: 1.5px pop border, pop text. Download the data (Overview), Full card (Money flows trace).
- Chips: 4px radius, rule border, 32px; active = ink fill, paper text, 600. Hover = wash. Chips replace today's underline toggles for sourcing, basis, rank-by and width.
- Select and search: rule border, 4px radius, 30px; the select draws its chevron in CSS.
- Tooltip: ink background, paper text, two lines, the item first in Newsreader 600. Same text as today's title attributes.
- Rows: wash on hover; an open loop row keeps the wash.
- Site mark: the 18px wheel in the nav (eleven segments, chain order, Capital in slate).

## 5. Pages

**Overview** (no filters): masthead; h1 "Who pays whom to build AI"; the state line (D41); three findings in a three-column row with hairline dividers (figure 44px in pop, finding under 20 words, a plain-language evidence link whose href is the record route); Follow the money and Download the data; a 1px ink rule; then "Who pays whom, by layer" (sankey); "Three largest loops" as compact racetracks; "Who the deals run through"; "What changed" (five rows, the h2 links to the full page); "Top 10 flows". Visible words outside charts stay under 250; the mockup measures 255 and the fix is to drop the small-ribbon note into the key line.

The three findings are computed, not typed, and asserted at render time so the text fails if the data drifts (the mockup's build.py shows the three assertions):
1. The largest layer flow (today Labs to Hyperscale, $518B ceilings, 8 deals). Link: the ribbon.
2. The largest paid deal and the count of paid deals, with the fact that every paid deal is equity (today Amazon to OpenAI, $50B, 9 paid). Link: the deal on the company card.
3. The loop with the most promised back (today Microsoft and OpenAI, $250B). Link: the loop.

**Money flows**: chips, company select, Trace button, More filters link; the same sankey with a layer opened to its companies on one side and a traced company dimming every ribbon it is not on; the company's in/out butterfly below the chart in trace mode; the no-amount line under the key; the full list in a details element as today.

**Loops**: chips (sourcing, D35), Rank by (promised back, put in, deals); one caveat line; the key; then one racetrack per loop, ranked by what was promised back, one scale for the whole page. Row header: icon, name, "$13B in, ceilings · $250B back, ceilings", notes in mono (guarantee in grey not counted; n deals with no amount, dotted). The loop's one-line summary under the track.

**Company card**: layer dot in the h1, one-line, facts line with the primary button, butterfly, Money in and Money out lists, loops as icon rows.

**Companies** (new route #/companies): state line with the counts; search and chips; the chain wheel (desktop only); the directory by layer, benched names muted. The company directory leaves the Overview.

**What changed**: unchanged except tokens and components.

## 6. Charts

**Sankey** (replaces the arc hero, D40): payer layers in a left column ranked by what they pay, payee layers in a right column ranked by what they are paid; a layer can be on both sides. Ribbon height = cash plus announced ceilings (D33's sum of high ends), 2px floor, labeled "announced ceilings, not cash" in the key. Ribbon color = payer family. Committed = outlined band with a 12% fill; paid = solid, drawn as a solid band along the top edge of the ribbon to the paid share (paid deals plus paid-to-date). No hatching, no dashes anywhere (supersedes D42 and the dashed clause of D36). Ribbons of $5B and up carry "$518B ceilings · 8 deals" (word: ceilings when any cap or multi-year total is in it, paid when all paid, otherwise committed); big ribbons label at mid, small ones at the payee end, labels swept 16px apart and kept in frame. Ribbons under $5B are drawn unlabeled and counted in the key line. Deals with no amount count in the deal count. Guarantees are left out of widths. Phone: the sankey is replaced by the ranked ledger (one row per layer pair, bar on a shared scale, paid solid inside the outline); the page never scrolls sideways.

**Racetrack** (replaces the loop cards and arc pairs): company boxes in a row (two, or three for a ring), each with its layer dot; money runs clockwise, top arrows out along the row, bottom arrows back; one arrow per deal with an arrowhead; thickness = amount, $250B = 26px, 1.5px floor; solid = paid; outline = committed with paid-to-date filled from the tail; dotted hairline with a small open head = no amount; grey = guarantee, drawn but never counted or ranked. Label on each arrow: amount, deal type in lighter weight, F/S/R marker. Compact form for the Overview minis; phone form at 358px with amount-only labels. Row icon: 30px, two boxes, an arrow over and back, thick when paid.

**Who the deals run through**: top 8 companies by number of tracked deals they are party to; one bar per company, money in solid, money out outlined; label "23  9 in · 14 out". A count, never a sum (P23).

**Butterfly and wheel**: as in build.py; the wheel is desktop only.

## 7. Opens, resolved as Carson asked ("go with what you recommend")

1. Download the data: add a Data page at #/data that serves `site/data/bundle.json` and a CSV of deals (one row per deal with payer, payee, type, amounts, basis, kind, confidence, status, dates, source URL). Build both in bundle.py so CI keeps them fresh. Both buttons on the Overview point there.
2. Overview word budget: fold the small-ribbon note into the key line ("3 ribbons under $5B unlabeled") and drop the loops section's caveat. Target under 250, enforced by the render test as today.
3. Three-company racetrack on phones: stack the boxes vertically with the arrows running down the right side and back up the left; the desktop form stays horizontal.
4. Sankey small ribbons: $5B label threshold, as built; no minimum height beyond 2px.
5. Loops ranking tiebreak: ranked by promised back, then put in, then name; the deals count toggle (D33) applies to this page too.
6. Wheel below 1024px wide: keep the dots and layer labels, drop the company names.

## 8. Decisions to add to decisions.md (dated 2026-11-01, "Round 6 pick")

- D48 Design: round 6 mockups are the build reference (mockups/round6). Supersedes D40 (arc hero), D33's hatching and D42, the dashed clause of D36, and the Gate 4a loop form.
- D49 Color: light default with paper #fafaf9 and ink #16202e, charcoal dark mode; the three chain families on one blue ramp (hw #0f3d8a, infra #2f7fd8, model #5aa0e6; dark #3f7fe0, #7fb0f2, #bcd4f7), Capital slate; vermilion #cc3215 (dark #ff6a3d) is the only accent, in the five places listed in spec.md. Refines D43; supersedes D38 (links are ink, blue belongs to the whole chain).
- D50 Encodings: three only. Width = amount; solid = paid, with paid-to-date drawn solid inside committed; outline = committed. Caps and multi-year totals are words in the label; a layer sum that contains any is labeled "ceilings". Guarantees drawn grey, never counted. No hatching or dashes. Sourcing stays the F/S/R marker.
- D51 Overview: no filters; hero order is masthead, headline, state line, three computed findings with evidence links, two buttons, sankey, three largest loops, deal-count concentration, what changed, top 10. The company directory moves to a Companies page with the chain wheel.
- D52 Loops: one racetrack per loop, ranked by promised back, one scale per page; the row header states both sides with the ceilings, paid or committed word.
- D53 Controls: chips, one primary button per page, a three-way theme segment, 4px radius on controls and company boxes only. A Data page serves the bundle and a deals CSV.

## 9. Acceptance

- `python3 scripts/validate.py` and `tests/render.mjs` pass; the render test adds: the three findings recomputed from the bundle; no `#`-literal colors in site.css outside the token blocks; the five pop locations only (grep the CSS for `--pop`); Overview under 250 words; every page at 1280 and 390 in both themes with no horizontal scroll; the sankey's labeled ribbons all $5B or more.
- The dataviz palette validator passes the two ramps in ordinal mode on both papers (it did on the mockups).
- Screenshots in `browser.yml` match the mockups' structure page for page.
- Pages stays off; this is PR work for Carson's review.

## 10. Session plan (keep usage light; stop and report after each)

- 14a: tokens, type, nav with the wheel mark and theme segment, buttons, chips, select, tooltip; Overview hero row with computed findings; Data page and CSV in bundle.py.
- 14b: sankey hero and its phone ledger; Money flows with open layer and trace; the key and small-ribbon line.
- 14c: racetracks (desktop, compact, phone, three-company vertical); Loops page; loop icons on the card and Overview.
- 14d: Companies page with the wheel and directory; company card with the primary button; Who the deals run through.
- 14e: render test additions, decisions.md lines D48 to D53, docs/design-spec.md rewritten from spec.md, screenshots, draft PR.
