# Design spec, round 5 (2026-11-01): navy ground, amber pop, racetrack loops

Builds on round 3 (layout, encodings, budgets) and round 4 (controls, wheel). Changes here: the ground is navy by default, the pop is amber, buttons are tactile, every loop is a racetrack, and the Overview opens with a hero band.

## 1. Ground: navy first, blue-tinted light

The site is dark-first. The bare `:root` holds the navy theme; the light theme sits under `prefers-color-scheme: light` guarded by `:root:not([data-theme="dark"])` and again under `:root[data-theme="light"]`. The nav bar and the Overview's hero band are always navy, whichever theme the page body uses, so the site keeps one face.

| Token | Navy (default) | Light | Use |
|---|---|---|---|
| paper | #0b1526 | #eef3fa | page: deep navy; pale blue-grey, never white |
| band | #070f1d | #0b1526 | nav and hero band (fixed navy in both themes) |
| wash | #142036 | #dde7f5 | row hover, company boxes, open rows |
| ink | #eaf0f8 | #0b1b33 | text and figures (16:1 and 15:1) |
| ink-2 | #b4c2d6 | #3f5270 | secondary text, chart labels |
| muted | #7f90a8 | #5f7392 | metadata, markers, benched names |
| rule | #223047 | #c9d6e8 | hairlines, chip borders |
| hw / infra / model | #3f7fe0 / #7fb0f2 / #bcd4f7 | #0f3d8a / #2f7fd8 / #5aa0e6 | the chain, one blue ramp by position (validated, ordinal) |
| cap | #93a3b8 | #7d8ba0 | Capital, slate |
| pop | #ffb020 | #c2410c | the accent: amber on navy (10:1), burnt orange on light (4.6:1 as text, 5.2:1 under white) |
| pop-2 | #e09a12 | #a33508 | the button's bottom edge |

Why not a saturated blue page: color already means layer, and the chain's own blues need a quiet ground to read. Navy is dark enough to act as neutral; a pale blue tint does the same in light. Why not a second chart hue (cyan for Labs was tested): it fails the colorblind separation against the light blue (ΔE 3.8 to 5.8 deutan), so the chain stays on one ramp and the warmth comes from the pop and the slate.

## 2. The pop

Amber, used in five places and nowhere else: the three hero figures; the primary button and the active nav underline; the paid square in lists; link hover and focus rings; the theme segment's active state stays ink, not amber. Charts never use it. On navy, amber is the hue that pops hardest while still passing as text (coral was 6:1, amber 10:1).

## 3. Buttons and chips

- Primary `.btn`: amber fill, navy text, 600, 4px radius, 38px tall, an inline arrow or download glyph, a 2px solid bottom edge in pop-2 and a soft amber glow; lifts 1px on hover, presses 1px on click. One per page: Follow the money (Overview), Trace (Money flows), Trace its money (card).
- Quiet `.btn.quiet`: 1.5px amber border, amber text, no shadow: Download the data, Full card.
- Ghost `.btn.ghost`: 1.5px rule border, ink text, for the drawer.
- Chips: 4px radius, rule border, 32px; active = ink fill with paper text and 600 weight (fill plus weight, never color alone); hover = wash.
- Select and search: rule border, 4px radius; the select draws its chevron in CSS.
- Tooltip: ink on paper, two lines, item first.

## 4. Loops as racetracks

Every loop is one picture, the form the press uses for one circular deal, drawn to a shared scale:
- Company boxes in a row (two, or three for a ring), each with its layer dot.
- Money runs clockwise: top arrows carry it out along the row, bottom arrows bring it back. Each deal is its own arrow with an arrowhead, so direction is never in doubt.
- Thickness = amount, $250B = 26px, 1.5px floor; solid = paid; outline = committed, with paid-to-date filled from the tail; dotted hairline with a small open head = no amount; grey = guarantee, drawn but never counted.
- The label on each arrow is amount, deal type and the F/S/R marker. The row header carries the two sides in words: "$13B in, ceilings · $250B back, ceilings".
- Ranked by what was promised back, one scale down the whole page. On phones the same track redraws at 358px with amount-only labels; a three-company ring narrows its boxes.
- The row icon is a 30px track: two boxes, an arrow over and back, thick when paid.

This replaces the butterfly (round 3) and the rings (round 4). The chord's circle survives as the chain wheel on Companies and the site mark.

## 5. Overview order

Nav; hero band (masthead, headline, state line, three findings in amber in a three-column row, Follow the money and Download the data); then on the page ground: the sankey with a worked tooltip; three largest loops as compact tracks; Who the deals run through (count of tracked deals per company, in solid, out outline; a count, never a sum of caps, per P23); What changed; Top 10 flows. Visible words outside charts: 271 (the hero band's three findings are inside the budget; the new section's caveat is the overrun, and can go).

## 6. What the research added

- Bloomberg's, Morgan Stanley's and the interactive network sites' graphics all draw every deal in one network and get called spaghetti; the clear ones draw one loop with labeled arrows. The racetrack is that, ranked.
- Sequoia's $600B question is one gap between two numbers. The "in" and "back" words on every loop row give the same gap without netting ceilings against cash.
- Datawrapper and GOV.UK: one hue ramp for ordered categories, grey for context, one reserved accent. Bloomberg: the accent is a highlight, not wallpaper.

## 7. Decisions this supersedes if picked

Paper and ink values in docs/design-spec.md section 1; D43 hues; D38 (links are ink with an amber hover); the "no rounded corners" line (4px on controls and company boxes only, never on cards or charts); the Loops page form from Gate 4a; the paid accent value. P04 (color means layer only) and P23 (no sums of caps) are untouched.
