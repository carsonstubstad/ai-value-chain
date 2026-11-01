# Round 3 mockups (2026-11-01)

Static HTML built from `site/data/bundle.json` by `build.py` (standard library only), rendered by `render.js` with the installed Playwright. Nothing under `site/`, `data/` or `scripts/` is touched.

```
python3 mockups/round3/build.py     # writes the seven HTML pages here
node mockups/round3/render.js       # writes png/*.png: 28 screenshots and 4 contact sheets
```

Fonts load from `../../site/fonts/`, so open the pages from the repo (for example `python3 -m http.server 8000` at the repo root, then `/mockups/round3/overview-A.html`).

## What is here

| File | View |
|---|---|
| overview-A.html | Overview, two-column sankey hero |
| overview-B.html | Overview, ranked ledger hero |
| overview-C.html | Overview, chord hero |
| loops-A.html | Loops, ranked butterfly |
| loops-B.html | Loops, slope of in against back |
| flows.html | Money flows: the sankey with Hyperscale opened and OpenAI traced |
| company.html | Company card for OpenAI |
| spec.md | Type scale, tokens, rhythm, the three encodings, word budgets, each view on desktop and phone |
| png/contact-*.png | One contact sheet per view, directions side by side |
| png/*-desktop-*.png, png/*-phone-*.png | Every mockup, light and dark, 1280 and 390 wide |

## Recommendation

1. Overview A (sankey). The two parallel bands at the top, an empty $518B outline over a part-filled $102B band, are the one picture that says what the site is about. Its phone form is direction B, so nothing is lost on a phone.
2. Overview B (ledger). Clearest ranking, needs no phone translation, but it shows rows rather than a chain.
3. Overview C (chord). Right form on paper for two-way flows; in practice the small flows crowd the ring and the amount labels collide, and it fails at 390px.

Loops: A (butterfly). One scale, legible to $350M, rows open to deals. B (slope) is worth keeping as a figure for a Method page: it shows the asymmetry of all nine loops in one glance but crushes six of them into the bottom tenth of the axis.

Decisions this pick would supersede: D40 (arc hero), D33 and D42 (hatching), and the dashed-outline part of D36. Carson records the answer in decisions.md.
