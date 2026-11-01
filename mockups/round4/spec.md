# Design spec, round 4 (2026-11-01): the A plus A pick, restyled

Builds on mockups/round3/spec.md. Everything not listed here is unchanged: type scale, rhythm, the three encodings, the word budgets, the view layouts. What changes is color, the controls, where the circle lives, and one new page.

## 1. Color: a blue ramp for the chain, one pop

Color still means layer and nothing else (P04). The four families stay (D43), but the three chain families now sit on one blue ramp ordered by chain position, so lightness reads as "how far upstream", and Capital, which is not on the chain, is slate. Both ramps pass the dataviz validator's ordinal checks (one hue, monotone lightness, visible steps, light end clears the surface).

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #f6f7f9 | #0f1722 | page (cool near-white; navy-black, not neutral black) |
| wash | #e9eef6 | #18233a | row hover, open-row background |
| ink | #0d1b2e | #e6ebf2 | headline, body, figures, filled chips, tooltips |
| ink-2 | #44536a | #b3bfd0 | secondary text, chart labels |
| muted | #6b7a8f | #8a9ab0 | metadata, F/S/R markers, benched names |
| rule | #d5dbe5 | #273347 | hairlines, chip borders |
| hw (Equipment to Systems) | #0f3d8a | #4a86e3 | deepest blue, furthest upstream |
| infra (Power, Data centers, Hyperscale) | #2f7fd8 | #86b3f0 | |
| model (Labs, Applications) | #62a8e8 | #bcd4f7 | lightest blue, end of the chain |
| cap (Capital) | #7d8ba0 | #9aa8bd | slate: money that joins the chain from outside |
| pop | #c8410b | #ff8a5b | the one accent, listed in section 2 |

Contrast: ink on paper 16:1 light, 15:1 dark; pop as text on paper 4.7:1 light, 7.8:1 dark; white on pop 5:1 light; the lightest blue is a chart mark only and always carries a label (2.0:1 on light paper, as the validator notes).

## 2. Where the pop goes, and nowhere else

1. The three figures in "Three things to know". The most important numbers on the site, and the only large pop on any page.
2. The active nav item's underline and the primary button (one per page at most: Trace on Money flows, Trace its money on the card).
3. The paid square in lists and the "now paid" glyph in What changed.
4. Link hover underline and keyboard focus rings.

Never: a chart fill, a ribbon, an arc, a background, a chip. Chart marks stay in layer blue, which is what keeps the pop a signal rather than decoration. (Bloomberg's own rule for its orange: text highlight only, never a button or background. We allow one button because the site has actions.)

## 3. Controls

| Control | Form | Active state |
|---|---|---|
| Filter chip | 1px rule border, 13px medium, square corners, 30px tall | ink fill with paper text (fill plus weight, not color alone) |
| Rank by / Width | the same chips after a mono label | same |
| Primary button | pop fill, 32px, 600 weight | one per page |
| Quiet button | 1px ink border, transparent | |
| Select | 1px rule border, chevron drawn in CSS, 30px tall | |
| Search | 1px rule border, 12rem | |
| Theme | three-way segment in the nav: Auto, Light, Dark | ink fill |
| Tooltip | ink background, paper text, two lines, item first in Newsreader, 260px max | |
| Rows | wash on hover; an open loop row keeps the wash | |

Controls sit on one line under the state line; "More filters" is a mono link to the drawer. The Overview has no controls.

## 4. The circle, from direction C

- Loop ring: a loop is drawn as a ring. Companies sit on the circle (two at top and bottom; three at 120 degrees), every deal is a clockwise arc from payer to payee, width = amount on one shared scale ($250B = 22px), solid = paid, outline = committed with paid-to-date drawn solid from the start, dotted hairline = no amount. Several deals in the same direction nest inward. Amount labels sit outside the ring beside their arc; names above and below.
- Ring icon: the same drawing at 22px with no labels, leading every loop row (Loops, company card).
- Chain wheel: the Companies page hero. One arc per layer in chain order clockwise from Equipment, Capital closing the circle; a dot per company with a sourced deal; names set along the radius, muted when benched. The center carries the two counts.
- Site mark: the wheel at 18px, eleven segments, in the nav beside the name.

The chord itself is not used: its chords were the problem, its ring was not.

## 5. Pages in this round

Overview (A restyled, with a worked tooltip over the $102B ribbon), Loops (butterfly with ring icons, then the four largest loops as rings, 2 by 2), Money flows (chips, select, Trace button, Hyperscale opened, OpenAI traced), Company card (Trace its money as the primary button), Companies (new: wheel, then the directory by layer; the wheel is desktop only, phones get the directory).

## 6. Decisions this supersedes if picked

D43's hue values (families stay, hues change to the blue ramp and slate), D38 (blue no longer belongs to Chip design alone; links are ink with a pop hover), the paid accent value in docs/design-spec.md section 1, and the paper colors in section 1. D40, D33, D42 and the dashed clause of D36 are already superseded by the round 3 pick.
