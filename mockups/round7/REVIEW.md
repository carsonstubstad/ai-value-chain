# Review of the round 6 build (sessions 14a to 14e), 2026-11-01

Reviewed from the branch at d306a0e, rendered at 1280 and 390 in both themes. The build matches the round 6 mockups page for page, the tests Duet added are the right ones, and Duet's call to drop the Trace button is correct. Three things should change before Gate 4 is passed: less orange, a calmer sankey on the Overview, and loops that use length instead of thickness. The reference images for the loop change are in this folder (`png/loops-desktop-light.png`, `png/overview-desktop-light.png`), built by `build.py` from the bundle.

## 1. Change now

### 1a. Orange: three places, not five

Keep the pop on the primary button, the paid square and the "now paid" glyph, and link hover and focus rings. Remove it from the three hero figures (set them in ink; the size carries them) and remove the 4px rule above the nav. On the Data page make Download the JSON a quiet button, so every page has at most one primary. This cuts the orange on the Overview to one button and a few paid marks, which is what "one accent" was meant to be. Update D49's list of places and the test that counts them.

### 1b. Overview sankey: show the seven that matter, hint at the rest

The Overview's chart has to carry one idea; today its middle is a tangle of ten small ribbons and nine labels. Change the Overview copy of the sankey only; Money flows keeps every ribbon and every label.

- Ribbons of $20B and more (today seven: $518B, $140B, $102B, $63.6B, $60B, $22.4B, $21B) are drawn and labeled as now.
- Ribbons under $20B are drawn as 1px hairlines at 40% opacity with no label. The line under the key becomes "7 smaller flows are unlabeled; see Money flows."
- One annotation on the chart, anchored to the two big bands, set in Newsreader 600 13px with a halo: "Labs have promised clouds $518B; clouds have paid labs $58B of $102B." The figures are computed from the same flows as the ribbons and asserted in the render test. The reader study behind the brief found that text tied to a data point is what changes what readers take away; this is that sentence.
- Keep the tooltip on hover; drop the worked static tooltip from the mockup if it was built.

### 1c. Loops: length for the amount, not thickness

On one shared linear scale, thickness makes nine of eleven loops hairlines, so the page reads as lines of equal weight and the asymmetry inside each loop is lost. Length fixes that without changing the honesty of the scale. Specification (reference: `track_len` in this folder's build.py):

- Two company boxes stay where they are, left and right. The gap between them is the scale: $250B spans the gap. Faint ticks at $100B and $200B, labeled in mono once per chart.
- Each deal is one arrow of constant thickness (11px desktop, 8px compact and phone). Top arrows leave the left company's box and point right, length = amount. Bottom arrows leave the right company's box and point left, length = amount. The label (amount, type in lighter weight, F/S/R) sits just past the arrowhead; when the arrow nearly fills the gap, the label sits above it.
- Solid = paid; outline = committed with paid-to-date filled from the tail; no amount = a 56px dotted stub with an open head, labeled "undisclosed"; guarantees grey, drawn, never counted.
- Deals in the same direction stack, largest first, 6px apart.
- The three-company ring (NVIDIA, CoreWeave and OpenAI) keeps today's racetrack; it is the only one and both of its amounts are small.
- Phone: the same drawing at 358px with amount-only labels.
- Overview minis: the same compact form in the three columns, no type words, no ticks, one key line: "Arrow length is the amount; the gap between the boxes is $250B."
- Loops page caveat shrinks to one line: "Arrow length is the amount, one scale for every loop. Nets are not shown: ceilings cannot be netted against cash."

Update D52 to say length, not thickness, and the loop-arrow test accordingly.

### 1d. Small things seen while reading

- Loops page: the row header's mono notes ("1 deal with no amount, dotted") wrap under the figures on narrow desktops; put them on their own line under the header.
- Money flows: the two toggle rows (chips, then Trace and Ceilings) read as two separate bars; one row with a wrap is calmer.
- Company card: fine.
- Companies: fine; the wheel at 680px is right.

## 2. Leave as is

The hero row and buttons, the chips, the theme segment, the blue ramp, the Data page's content, What changed at four rows (D54), no chips on company cards (D55), Who the deals run through, and Duet's decision to drop the Trace button (the select already traces; record it as a note under D53: at most one primary per page).

## 3. Expected later, not missing

Session 14 (launch pages) has not run: Method, About the data, README, changelog and the first weekly entry, plus the Epoch terms check (O12). Gate 5 (Pages on) follows that. Nothing else in the build plan is outstanding.

## 4. Order of work

One session, 14f: 1a, 1c, 1b, 1d, tests and decisions updated (D49, D52, a note under D53), screenshots refreshed, stop and report. Then Carson passes Gate 4 and merges PR #10, then session 14.
