# Design spec, round 6 (2026-11-01): the recommended direction

What survives from each round: round 3's layout, encodings and word budgets; round 4's blue ramp for the chain and the control vocabulary; round 5's buttons, hero row and racetrack loops. What changes: the ground is neutral again, the pop is vermilion, and the data layer is tidied. This is the direction I recommend building.

## 1. Ground and ink

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| paper | #fafaf9 | #17191c | page: a hair off white, no blue and no cream; charcoal, not navy, in dark |
| wash | #f0f1f0 | #212429 | row hover, company boxes, open rows |
| ink | #16202e | #ebedef | text and figures: a navy-black so the type sits with the blues (15.7:1 and 15:1) |
| ink-2 | #46505f | #b6bcc5 | secondary text, chart labels |
| muted | #5c6677 | #8f98a6 | metadata, markers, benched names (5.6:1, 6:1) |
| rule | #e2e3e4 | #2e3237 | hairlines, chip borders |
| hw / infra / model | #0f3d8a / #2f7fd8 / #5aa0e6 | #3f7fe0 / #7fb0f2 / #bcd4f7 | the chain, one blue ramp by position (validator: ordinal pass, both modes) |
| cap | #7d8ba0 | #93a3b8 | Capital, slate |
| pop | #cc3215 | #ff6a3d | vermilion: 5.2:1 under white, 5:1 as text on paper; 6.2:1 on charcoal |
| pop-2 | #a8280f | #d9512a | the button's bottom edge |

The page opens with a 4px vermilion rule above the nav: the one piece of chrome that carries the pop, so it never has to be wallpaper.

## 2. The pop, five places

The three hero figures; the primary button and the active nav underline; the paid square and the "now paid" glyph; link hover and focus rings; the 4px rule at the top. Never a chart mark.

## 3. Hero

Masthead, headline at 52px, state line, then the three findings as a three-column row divided by hairlines (figure 44px in vermilion, finding under 20 words, a plain-language evidence link: "See the Labs to Hyperscale ribbon"), then Follow the money (primary) and Download the data (quiet), then a 1px ink rule. On phones the three columns stack with hairlines between.

## 4. Controls (from round 5, unchanged)

Primary button: vermilion fill, white text, 4px radius, 38px, inline glyph, 2px darker bottom edge, soft glow, lifts on hover. Quiet: vermilion outline. Chips: 4px radius, ink fill when active with heavier weight. Select and search bordered. Theme: three-way segment. Tooltip: ink on paper, two lines, item first.

## 5. Data layer, cleaned

- Sankey: ribbons under $5B are drawn but not labeled; one line under the key says how many and points to Money flows. Big ribbons keep the mid label, small ones the payee-end label, swept 16px apart and kept inside the frame.
- Findings: human evidence links, not record ids; the id stays in the href.
- Row grammar everywhere: counterparty · type · amount with its basis square and F/S/R marker. Loop rows: icon, name, then "$13B in, ceilings · $250B back, ceilings" in the same serif figure style.
- Racetracks: amount label, type in lighter weight, marker; one scale ($250B = 26px); solid paid, outline committed with paid-to-date filled from the tail, dotted no amount, grey guarantee drawn but not counted. Phone redraw at 358px with amount-only labels.
- Who the deals run through: a count per company, in solid and out outline; no caveat paragraph, the key says it.
- Overview visible words: 255 on the build date (the three findings included).

## 6. Decisions this supersedes if picked

Paper and ink values and the paid accent in docs/design-spec.md section 1; D43 hues (families stay, the hues move to the blue ramp and slate); D38 (links are ink, blue belongs to the whole chain); a 4px-radius exception for controls and company boxes; the Loops page form from Gate 4a (racetracks replace the arc cards); D40, D33, D42 and the dashed clause of D36 (already superseded by the round 3 pick). P04 and P23 untouched.
