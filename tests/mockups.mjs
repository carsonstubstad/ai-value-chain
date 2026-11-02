// Gate 4a mockup check, run in GitHub Actions (browser.yml), never in the sandbox.
// Loads each page in mockups/ at desktop and phone widths, fails on a script error,
// a page that scrolls sideways or a self-hosted font that did not load, and saves
// full-page screenshots named mockup-*. Expects the repo root served at port 8001.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "screens";
mkdirSync(out, { recursive: true });
const BASE = "http://localhost:8001/mockups/";
const PAGES = ["overview-a", "overview-b", "loop-card"];
const RUNS = [
  ["desktop", "light", { width: 1280, height: 900 }],
  ["desktop", "dark", { width: 1280, height: 900 }],
  ["phone", "light", { width: 390, height: 844 }],
];
const problems = [];
const browser = await chromium.launch();
for (const [size, scheme, viewport] of RUNS) {
  const page = await browser.newPage({ viewport, colorScheme: scheme });
  page.on("pageerror", (e) => problems.push(`${size}/${scheme}: page error ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`${size}/${scheme}: failed request ${r.url()}`));
  for (const name of PAGES) {
    await page.goto(BASE + name + ".html");
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      fonts: ["500 44px Newsreader", "400 15px 'IBM Plex Sans'", "400 12px 'IBM Plex Mono'"].filter((f) => !document.fonts.check(f)),
      loaded: [...document.fonts].filter((f) => f.status === "loaded").length,
    }));
    if (r.overflow > 0) problems.push(`${name} ${size}/${scheme}: page scrolls sideways by ${r.overflow}px`);
    if (r.loaded < 3) problems.push(`${name} ${size}/${scheme}: only ${r.loaded} font files loaded`);
    if (r.fonts.length) problems.push(`${name} ${size}/${scheme}: fonts not ready ${r.fonts.join(", ")}`);
    await page.screenshot({ path: `${out}/mockup-${name}-${size}-${scheme}.jpg`, type: "jpeg", quality: 80, fullPage: true });
  }
  await page.close();
}
await browser.close();
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(`mockups: ${PAGES.length * RUNS.length} renders, 0 problems`);
