# Round 6 mockups (2026-11-01): recommended

Neutral ground, vermilion pop, round 5's buttons and racetrack loops, and a cleaned data layer. Built from `site/data/bundle.json` by `build.py` (standard library only), rendered by `render.js` with the installed Playwright. Nothing under `site/`, `data/` or `scripts/` is touched.

```
python3 mockups/round6/build.py
node mockups/round6/render.js
```

| File | View |
|---|---|
| overview.html | Hero row, sankey with tooltip, three loops as tracks, who the deals run through, what changed, top 10 |
| loops.html | Eleven racetracks, ranked, one scale; phone tracks included |
| flows.html | Chips, select, Trace button; Hyperscale opened, OpenAI traced |
| company.html | OpenAI card |
| companies.html | Chain wheel and directory |
| spec.md | Tokens, pop rules, hero, controls, the data clean-up, decisions superseded |
| png/ | 20 screenshots (light and dark, 1280 and 390) and 5 contact sheets |
