# Design spec, round 3 (2026-11-01, for Carson's pick)

One page. Values come from docs/design-spec.md and site/css/site.css where those already settle a question (D36, D37, D39, D43); this round changes the hero chart, the Overview order, the encodings and the Loops page, and adds a Companies page. Where a loaded design skill disagreed with decisions.md, the decision won (listed at the end).

## 1. The concept in a sentence

The Overview tells the reader three things, then shows one picture of who pays whom by layer; everything else is one click away.

## 2. Tokens (unchanged from site.css)

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #f7f4ee | #16181b | page |
| ink | #1b1a17 | #ece8e1 | headline, body, figures |
| ink-2 | #57534b | #b9b3a8 | secondary text, chart labels |
| muted | #8c877d | #8a857c | metadata, sourcing markers, benched names |
| rule | #ded8cc | #34373c | hairlines, link underlines |
| link | #3d3a34 | #d8d3ca | links (neutral, D38) |
| paid | #990f3d | #e8728f | the paid square in lists only; never a chart fill |
| hw / infra / model / cap | #2a78d6 / #169e6e / #b84a8a / #c98500 | #4a8fe0 / #249a72 / #c46aaa / #c08000 | the four layer families (D43); a ribbon takes the payer's family |

No gradients, shadows, boxes or pills. Sections are separated by space and one hairline.

## 3. Type scale (D37, self-hosted)

| Role | Face | Desktop | Phone |
|---|---|---|---|
| Masthead, metadata, markers, evidence links | IBM Plex Mono 400 | 12 / 1.4 | 12 |
| Headline | Newsreader 500 | 44 / 1.05 | 32 |
| State line | Newsreader 400 | 22 / 1.35 | 19 |
| Section head | Newsreader 500 | 22 / 1.2 | 22 |
| Finding figure ("Three things") | Newsreader 600 | 30 / 1 | 26 |
| Figures on charts and in rows | Newsreader 600 | 13 to 17 | same |
| Body and rows | IBM Plex Sans 400 | 15 / 1.5 | 15 |
| Chart labels | IBM Plex Sans 400 / 600 | 11 (amount labels), 12 (layer names, 600) | same, fewer of them |

## 4. Rhythm

- Container 1080 plus 24 gutters (16 on phones). Text column 640, left aligned; charts span 1080. 8px unit; 56px between sections (40 on phones), 36px above "Three things".
- The Overview carries no filters. Filters live on Money flows, Loops and Companies, one line each.
- Charts wider than a phone are never shrunk; each has a phone form (section 7). The page never scrolls sideways.

## 5. The three encodings

| What | How | Where the detail went |
|---|---|---|
| Amount | width (ribbon height, bar length, arc thickness), one linear scale per chart, 2px floor | the label carries the exact figure |
| Paid | solid fill | |
| Committed | outline, with the paid-to-date share drawn solid inside it (Microsoft to OpenAI, Amazon to Anthropic) | |
| Caps, ranges, multi-year totals | words in the label: "up to", "multi-year"; a layer-level sum is always labeled "ceilings" | no hatching, no dashes |
| Sourcing | a mono F / S / R after the figure; one-line key under the first chart on each page | |
| Guarantees | not drawn and not ranked; named in the row ("up to $105B guarantee not counted") | |
| No amount | not drawn; counted in the ribbon's deal count; one line below the chart on Money flows lists the pairs | |

Rule for sums: a width that includes any cap or multi-year total is labeled "ceilings", a width made only of one-time paid cash "paid", otherwise "committed". Nothing labeled ceilings is ever netted (P23).

## 6. Word budgets (D39, measured by build.py)

Headline 6, state line 20, finding 20 (one figure, one evidence link), loop row one line of 15, Overview text outside the charts under 250 (A measures 244, B 177, C 250 on the day of the build; the count excludes chart labels, the nav and the footer). Caveat once per page; key one line.

## 7. Views, desktop and phone

**Overview** (the three directions share this order): masthead; headline; state line; Three things to know; the hero; Three largest loops as rings; What changed, five lines; Top 10 flows. The company directory is gone; it becomes the Companies page.
- A, two-column sankey: payers on the left ranked by what they pay, payees on the right ranked by what they are paid, so the Labs to Hyperscale and Hyperscale to Labs bands run parallel at the top. Phone: the ribbons become the ranked ledger (direction B's rows), one flow per row, name and figure on one line, bar beneath.
- B, ranked ledger: 14 rows, one per layer pair with a stated amount, longest first, a left rule marking pairs that pay both ways. Phone: the same rows stacked.
- C, chord: seven layers on a ring, chords take the payer's color and are labeled at the payer's end for flows of $20B or more. Phone: the ring at 358px with the same labels, which is where it fails (section 8).

**Loops**
- A, ranked butterfly: one row per loop, ranked by what was promised back; put-in bars run left from a center axis, back bars run right, one scale for both sides and all rows; the ring icon leads the row; a row opens to its deals. Phone: each row folds into two bars from the left edge on the same scale.
- B, slope: left axis what went in, right axis what was promised back, one line per loop; solid dot when that side is paid. Phone: a narrower slope with amounts only on the left.

**Money flows**: the sankey from A, with a layer opened to its companies on one side (Hyperscale on the paid side in the mockup) and a trace that dims every ribbon without the traced company and shows its in/out butterfly below. Phone: the ledger, then the butterfly.

**Company card**: name with its layer dot, one line, facts line, the in/out butterfly (five largest each way, the same three encodings), Money in and Money out lists, the company's loops as ring-icon rows. Phone: lists stack, the butterfly stays (it is 640 wide and reads at 358).

## 8. What the mockups showed

- A reads the loop at a glance: the empty $518B band on top of the filled $102B band is the whole story. Its weak spot is the nine small flows under $12B, which tangle at the bottom right; their labels are pushed to the payee end and it still looks busy.
- B is the clearest single-scale ranking and the only hero that needs no phone translation. It loses the sense of a chain: the reader sees rows, not a system, and loop pairs are a margin rule rather than a shape.
- C shows two-way flows in one picture, as the FT vocabulary promises, but the small flows and the self-loop (Chip design to Chip design) crowd the top of the ring and the amount labels fight the chords. At phone width it is unreadable.
- Loops A keeps every loop on one scale and the ranking is legible down to $350M. Loops B puts all nine loops with figures in one picture and makes the asymmetry obvious, but six of nine sit in the bottom tenth of the axis.

## 9. Skill conflicts, resolved for decisions.md

- frontend-design and artifact-design flag warm paper plus a serif display plus hairline rules as a generic look. The spec pins exactly that (docs/design-spec.md, D37), so it stands.
- dataviz asks for rounded bar ends and no serif on figures. The site uses square ends and Newsreader figures (design-spec section 2), so they stand.
- dataviz asks for a legend box on every multi-series chart. D39 allows one key line; the layer name beside each node or row is the legend.
- dataviz warns against dashed strokes. Agreed, and this round removes them: caps are words in the label.
