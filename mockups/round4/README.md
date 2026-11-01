# Round 4 mockups (2026-11-01)

The round 3 pick (Overview A, Loops A) restyled: blue ramp for the chain, slate for Capital, one pop color, a control vocabulary, the circle from direction C as loop rings and a chain wheel, and a new Companies page. Built from `site/data/bundle.json` by `build.py` (standard library only), rendered by `render.js` with the installed Playwright. Nothing under `site/`, `data/` or `scripts/` is touched.

```
python3 mockups/round4/build.py     # writes the five HTML pages here
node mockups/round4/render.js       # writes png/*.png: 20 screenshots and 5 contact sheets
```

| File | View |
|---|---|
| overview.html | Overview: sankey hero, three findings in pop, a worked tooltip |
| loops.html | Loops: ranked butterfly with ring icons, the four largest loops as rings |
| flows.html | Money flows: chips, select, Trace button; Hyperscale opened, OpenAI traced |
| company.html | Company card for OpenAI, primary button |
| companies.html | Companies: the chain wheel, then the directory by layer |
| spec.md | Color tokens (validated), where the pop goes, controls, the ring and the wheel, decisions superseded |
| png/contact-*.png | One contact sheet per page: desktop light and dark, phone light and dark |
