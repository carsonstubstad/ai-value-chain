# Round 5 mockups (2026-11-01)

Navy-first ground with a blue-tinted light theme, amber pop, tactile buttons, every loop drawn as a racetrack on one scale, a hero band on the Overview and a deal-count concentration chart. Built from `site/data/bundle.json` by `build.py` (standard library only), rendered by `render.js` with the installed Playwright. Nothing under `site/`, `data/` or `scripts/` is touched.

```
python3 mockups/round5/build.py
node mockups/round5/render.js
```

| File | View |
|---|---|
| overview.html | Hero band, sankey with tooltip, three loops as tracks, who the deals run through, what changed, top 10 |
| loops.html | Eleven racetracks, ranked, one scale; phone tracks included |
| flows.html | Chips, select, Trace button; Hyperscale opened, OpenAI traced |
| company.html | OpenAI card with the primary button |
| companies.html | Chain wheel and directory |
| spec.md | Tokens, pop rules, controls, the racetrack definition, decisions superseded |
| png/ | 20 screenshots (navy and light, 1280 and 390) and 5 contact sheets |
