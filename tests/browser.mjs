// Real-browser check, run in GitHub Actions (browser.yml), never in the sandbox.
// Loads every page at desktop and phone widths in light and dark, and fails on a script
// error, a page that scrolls sideways, an empty view or a filter that does not work.
// Saves screenshots to the folder given as the first argument.
// Expects the site served at http://localhost:8000 (python3 -m http.server 8000 --directory site).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "screens";
mkdirSync(out, { recursive: true });
const BASE = "http://localhost:8000/";
const ROUTES = [
  ["overview", "#/"],
  ["overview-labs-filed", "#/?conf=filed&layer=labs"],
  ["company-openai", "#/company/openai"],
  ["company-tsmc", "#/company/tsmc"],
  ["flows", "#/flows"],
  ["flows-trace-coreweave", "#/flows?focus=coreweave"],
  ["loops", "#/loops"],
  ["changes", "#/changes"],
];
const SIZES = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };
const problems = [];

const browser = await chromium.launch();
for (const [size, viewport] of Object.entries(SIZES)) {
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport, colorScheme: scheme, deviceScaleFactor: size === "phone" ? 2 : 1 });
    page.on("pageerror", (e) => problems.push(`${size}/${scheme}: page error ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${size}/${scheme}: console error ${m.text()}`); });
    for (const [name, hash] of ROUTES) {
      await page.goto(BASE + hash);
      await page.waitForSelector("#foot p", { timeout: 10000 }).catch(() => problems.push(`${name} ${size}/${scheme}: never finished loading`));
      const r = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        view: document.getElementById("view").innerText.length,
        failed: document.getElementById("view").innerText.includes("could not be loaded"),
        bg: getComputedStyle(document.body).backgroundColor,
      }));
      if (r.overflow > 1) problems.push(`${name} ${size}/${scheme}: page scrolls sideways by ${r.overflow}px`);
      if (r.view < 50 || r.failed) problems.push(`${name} ${size}/${scheme}: view is empty or failed`);
      if (scheme === "dark" && r.bg !== "rgb(14, 17, 22)") problems.push(`${name} ${size}/${scheme}: dark mode not applied (${r.bg})`);
      if (scheme === "light" || name === "overview" || name === "flows")
        await page.screenshot({ path: `${out}/${size}-${scheme}-${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    }
    await page.close();
  }
}

// Interactions: a chip filters, search filters, the theme button overrides the system.
const page = await browser.newPage({ viewport: SIZES.desktop });
page.on("pageerror", (e) => problems.push(`interaction: page error ${e.message}`));
await page.goto(BASE + "#/");
await page.waitForSelector("#count");
const before = await page.textContent("#count");
await page.click('[data-toggle="conf"][data-v="reported"]');
await page.waitForFunction((b) => document.getElementById("count").textContent !== b, before).catch(() => problems.push("chip click did not change the count"));
if (!page.url().includes("conf=")) problems.push("chip click did not reach the URL");
await page.fill("#f-q", "nvidia");
await page.waitForFunction(() => location.hash.includes("q=nvidia"), null, { timeout: 3000 }).catch(() => problems.push("search did not reach the URL"));
const afterSearch = await page.textContent("#count");
if (!/Showing \d+ deals? of/.test(afterSearch)) problems.push(`count line looks wrong: ${afterSearch}`);
await page.click('.step[data-v="labs"]');
await page.waitForFunction(() => location.hash.includes("layer=labs")).catch(() => problems.push("rail click did not set the layer"));
await page.click('[data-reset]');
await page.waitForFunction(() => !location.hash.includes("?")).catch(() => problems.push("reset did not clear the filters"));
await page.click("#theme"); // auto to light
await page.click("#theme"); // light to dark
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
if (theme !== "dark") problems.push(`theme button did not set dark (${theme})`);
await page.goto(BASE + "#/flows");
await page.selectOption("#f-focus", "openai");
await page.waitForFunction(() => location.hash.includes("focus=openai")).catch(() => problems.push("trace picker did not set focus"));
const lit = await page.locator("path.edge.lit").count();
if (!lit) problems.push("trace highlighted no lines");
await page.click('a[href*="#/company/"]');
await page.waitForFunction(() => location.hash.startsWith("#/company/")).catch(() => problems.push("company link did not open a card"));
await page.screenshot({ path: `${out}/desktop-dark-interaction-end.jpg`, type: "jpeg", quality: 70 });
await browser.close();

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`browser: ${problems.length} problems`);
  process.exit(1);
}
console.log(`browser: ${ROUTES.length} pages x 2 sizes x 2 themes and 8 interactions, 0 problems`);
