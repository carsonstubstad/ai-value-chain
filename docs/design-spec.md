# Design spec (session 13a, Gate 4a draft)

The site should read like a Bloomberg or FT data feature: one wide picture of the chain, a narrow column of short text, generous margins, no boxes inside boxes. This spec pins the values so sessions 13b to 13e build to it. It follows the Gate 4 brief and D33 to D39. Mockups that use it: `mockups/overview-a.html`, `mockups/overview-b.html`, `mockups/loop-card.html`, built by `python3 scripts/mockups.py` from `site/data/bundle.json`.

## 1. Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #f7f4ee | #16181b | page background (warm off-white, not white) |
| ink | #1b1a17 | #ece8e1 | headline, body, numbers |
| ink-2 | #57534b | #b9b3a8 | labels, legend, secondary text |
| muted | #8c877d | #8a857c | metadata, benched companies, contingent outlines |
| rule | #ded8cc | #34373c | hairlines between rows, link underline |
| link | #3d3a34 | #d8d3ca | links: neutral ink with a rule-colored underline (D38) |
| paid | #990f3d | #e8728f | the one accent: the word "paid" and paid-to-date callouts, never a chart fill |

No gradients, no shadows, no rounded cards, no blue links. The masthead sits on a 1px ink rule; sections are separated by space, not boxes.

## 2. Type

All three families are self-hosted from `site/fonts/` (OFL-1.1, D37). Figures are lining and tabular everywhere.

| Role | Face | Size / line height | Notes |
|---|---|---|---|
| Masthead | IBM Plex Mono 400 | 12 / 1.4 | "AI Value Chain · Week 44 · data as of 31 Oct 2026" |
| Headline (h1) | Newsreader 500 | 44 / 1.05 (32 on phones) | 6 words or fewer, letter-spacing -0.01em |
| State line | Newsreader 400 | 22 / 1.35 (19 on phones) | 20 words or fewer |
| Section head (h2) | Newsreader 500 | 22 / 1.2 | 56px space above |
| Headline numbers | Newsreader 600 | 13 to 17 | every dollar figure on a chart or in a list |
| Body | IBM Plex Sans 400 | 15 / 1.5 | |
| Chart labels | IBM Plex Sans 400 to 600 | 11 to 12 | layer names 12/600, company names 11 |
| Metadata | IBM Plex Mono 400 | 12, one size only | dates, F/S/R markers, counts, footer |

## 3. Rhythm

- Container 1080px plus 24px gutters (16 on phones). Text column 640px, left aligned. Visuals span the full 1080. The asymmetry is deliberate.
- 8px base unit. 56px between sections, 24px under the filter line, 12px under a section head.
- Filters are one line under the state line; everything else sits in a "More filters" drawer.
- Charts wider than the phone scroll inside their own frame; the page itself never scrolls sideways.

## 4. Color

Color means layer and nothing else (P04). Eleven separate hues fail the colorblind checks, so layers are grouped into four families and position names the layer. Each family hue was run through the palette validator against both paper colors.

| Family | Layers | Light | Dark |
|---|---|---|---|
| Hardware | Equipment, Chip design, Foundry, Memory, Systems | #2a78d6 | #4a8fe0 |
| Infrastructure | Power, Data centers, Hyperscale | #169e6e | #249a72 |
| Models and apps | Labs, Applications | #b84a8a | #c46aaa |
| Capital | Capital | #c98500 | #c08000 |

Validator result: no failures in either mode. Two warnings, both covered: the worst colorblind pair (Models and apps against Infrastructure, deutan 6.8 light, 7.2 dark) sits in the band that is legal with secondary encoding, which the layer labels and column positions provide; the Capital ochre is under 3:1 against light paper, so it is never used for text and every Capital mark carries a label.

A ribbon or arc takes the payer's family color, so the color says where the money came from.

## 5. Encodings

| What | Encoding |
|---|---|
| Paid | solid fill or solid stroke |
| Committed | outline (a hollow band) |
| Cap or range | dashed outline |
| Paid to date | a fill inside the committed outline, drawn to the paid share |
| Contingent (guarantees) | grey outline; left out of ribbon widths and every ranking |
| No amount disclosed | dotted hairline, 0.9px |
| Sourcing | a mono marker after the amount: F filed, S company-stated, R reported |
| Company size | dot area by degree (number of deals), not by money |
| Direction | Mockup A: the ribbon tapers toward the payee. Mockup B: above the line is paying suppliers (right to left), below is investing (left to right), Capital rises from a bottom rail |

Ribbons (D33): width is the sum of each deal's largest stated figure, labeled "announced ceilings, not cash". The ribbon splits into a solid part (one-time amounts) and a hatched part (caps, multi-year totals and records whose kind is not set yet). A toggle switches width to deal count. Hatching appears only here; it is gone everywhere else.

Zero-edge companies (D34): benched in muted text with no dot. A layer with none shows "tracked, no sourced flows yet" (today Systems and Applications).

## 6. Word budgets (D39, enforced by the render test in 13e)

- Headline 6 words or fewer; state line 20 or fewer; no paragraph under any headline.
- Overview text outside the charts under 250 words. The mockups measure 248 (counting words with a letter or digit).
- Deal rows: counterparty, type, amount. The one-line summary moves to hover and the company card.
- Loop card: name, diagram, one line of 15 words or fewer. The netting caveat appears once in the Loops header.
- Legend one line, footer one line, tooltips two lines with the item first.

## 7. Components

- Masthead line, then headline, state line, one-line filters.
- Hero chain (Mockup A or B, Carson picks).
- Loop diagram: A left, B right, top arcs A to B, bottom arcs B to A, one arc per deal nested by size, amount, kind and marker at each apex. Three-company loops become a triangle (13c). Under the full card, two stacked bars on one scale: "A put in" and "B promised back", segmented by deal. No net.
- What changed: grouped by ISO week, a layer dot per row, "payer to payee, amount type: change", and an outline-to-solid glyph when a deal becomes paid.
- Top 10 flows: names and amount with the basis glyph and marker; contingent deals excluded; a year only where the same pair appears twice.

Removed: stat tiles, boxed panels, pills, hatching outside ribbons, the duplicate largest-deal tables, explanatory paragraphs.

## 8. State-line candidates (Carson picks one)

Each uses counts or one sourced figure, never a sum of caps. Counts exclude rumors and come from the deal records named.

1. "OpenAI and Anthropic have committed to 17 compute deals with clouds and chipmakers; none is recorded as paid yet." (18 words) The 17 purchase and capacity deals from Labs to Hyperscale (7), Chip design (5), Data centers (3) and Memory (2); 4 filed, 11 company-stated, 2 reported. None has a paid basis because filings report these as commitments drawn down over years.
2. "Labs are on the receiving end of 15 equity deals from suppliers and investors; 6 are paid." (17 words) Every equity and warrant deal into Labs, excluding NVIDIA's lease guarantee; the paid six are Amazon's three rounds, CoreWeave's stock to OpenAI and SoftBank's two rounds.
3. "In 11 loops the same partners pay each other both ways; OpenAI is in 6, Anthropic in 3." (18 words) From the 11 loop records (30 deals).

Recommendation: 1. It follows the brief's form and its point (all promise, no recorded payment yet) is about the chain, not the dataset.

## 9. Open points for Carson

- D33 says hatch the ceiling part of ribbons; the brief's removal list says no hatching. The mockups keep hatching on ribbons only.
- D38 says blue belongs to Chip design only. With four families, blue covers all five hardware layers.
- Top 3 loops rank by the sum of largest stated figures with guarantees excluded, which puts Amazon and Anthropic ($133B, using "over $100B") just ahead of NVIDIA and OpenAI ($130B without the $105B guarantee).
