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
  ["flows-mockup", "#/flows?open=R%3Ahyperscale&focus=openai"],
  ["company-openai", "#/company/openai"],
  ["company-tsmc", "#/company/tsmc"],
  ["flows", "#/flows"],
  ["overview-ribbon", "#/?rib=labs%3Ehyperscale"],
  ["flows-count", "#/flows?w=count"],
  ["flows-trace-coreweave", "#/flows?focus=coreweave"],
  ["flows-open-labs", "#/flows?open=labs"],
  ["flows-no-amount", "#/flows?na=1"],
  ["loops", "#/loops"],
  ["changes", "#/changes"],
  ["data", "#/data"],
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
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        view: document.getElementById("view").innerText.length,
        failed: document.getElementById("view").innerText.includes("could not be loaded"),
        bg: getComputedStyle(document.body).backgroundColor,
        sankey: !!document.querySelector(".desk-only svg")?.getBoundingClientRect().width,
        ledger: !!document.querySelector(".phone-only .ledger")?.getBoundingClientRect().width,
        trackShown: [...document.querySelectorAll(".trow svg")].some((e) => e.getBoundingClientRect().width > 0),
        fonts: ["500 44px Newsreader", "400 15px \"IBM Plex Sans\"", "400 12px \"IBM Plex Mono\""].filter((f) => !document.fonts.check(f)),
      }));
      if (r.overflow > 1) problems.push(`${name} ${size}/${scheme}: page scrolls sideways by ${r.overflow}px`);
      if (r.view < 50 || r.failed) problems.push(`${name} ${size}/${scheme}: view is empty or failed`);
      if (/^(overview|flows)/.test(name) && r.sankey !== (size === "desktop")) problems.push(`${name} ${size}/${scheme}: sankey ${r.sankey ? "shown" : "hidden"}`);
      if (name === "loops" && !r.trackShown) problems.push(`${name} ${size}/${scheme}: no racetrack shown`);
      if (/^(overview|flows)/.test(name) && r.ledger !== (size === "phone")) problems.push(`${name} ${size}/${scheme}: phone ledger ${r.ledger ? "shown" : "hidden"}`);
      if (r.fonts.length) problems.push(`${name} ${size}/${scheme}: fonts not loaded: ${r.fonts.join(", ")}`);
      if (scheme === "dark" && r.bg !== "rgb(23, 25, 28)") problems.push(`${name} ${size}/${scheme}: dark mode not applied (${r.bg})`);
      if (scheme === "light" || name === "overview" || name === "flows")
        await page.screenshot({ path: `${out}/${size}-${scheme}-${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    }
    await page.close();
  }
}

// Interactions: a chip filters, search filters, the theme button overrides the system.
const page = await browser.newPage({ viewport: SIZES.desktop });
page.on("pageerror", (e) => problems.push(`interaction: page error ${e.message}`));
// Filters live on Money flows, the Overview has none (D51).
await page.goto(BASE + "#/flows");
await page.waitForSelector("#count");
const before = await page.textContent("#count");
await page.click('[data-toggle="conf"][data-v="reported"]');
await page.waitForFunction((b) => document.getElementById("count").textContent !== b, before).catch(() => problems.push("chip click did not change the count"));
if (!page.url().includes("conf=")) problems.push("chip click did not reach the URL");
await page.fill("#f-q", "nvidia");
await page.waitForFunction(() => location.hash.includes("q=nvidia"), null, { timeout: 3000 }).catch(() => problems.push("search did not reach the URL"));
const afterSearch = await page.textContent("#count");
if (!/^\d+ of \d+ deals/.test(afterSearch.trim())) problems.push(`count line looks wrong: ${afterSearch}`);
await page.click('[data-reset]');
await page.waitForFunction(() => !location.hash.includes("?")).catch(() => problems.push("reset did not clear the search"));
// Arcs are hollow, so their centre is empty: follow a ribbon's link the way a click would.
const follow = async (sel) => { const h = await page.locator(sel).first().getAttribute("href"); await page.evaluate((x) => { location.hash = x; }, h); };
await page.goto(BASE + "#/");
await page.waitForSelector("a.rib");
if (await page.locator("#count").count()) problems.push("the Overview still shows filters");
await follow("a.rib");
await page.waitForFunction(() => location.hash.includes("rib=")).catch(() => problems.push("ribbon click did not pick a ribbon"));
if (!(await page.locator(".ribdeals li").count())) problems.push("picked ribbon listed no deals");
await page.click('[data-theme-set="dark"]');
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
if (theme !== "dark") problems.push(`theme segment did not set dark (${theme})`);
if ((await page.getAttribute('[data-theme-set="dark"]', "aria-pressed")) !== "true") problems.push("theme segment did not mark Dark as picked");
// The Overview hero: three findings, each with an evidence link that opens its record.
await page.goto(BASE + "#/");
await page.waitForSelector(".findings li");
if ((await page.locator(".findings li").count()) !== 3) problems.push("the Overview does not show three findings");
await page.locator(".findings .ev a").nth(2).click();
await page.waitForFunction(() => location.hash.startsWith("#/loops")).catch(() => problems.push("loop finding link did not open Loops"));
await page.waitForFunction(() => window.scrollY > 0).catch(() => problems.push("loop finding link did not scroll to its loop"));
// Loops: racetracks ranked, and the Rank by chips reach the URL.
if (!(await page.locator(".trow").count())) problems.push("Loops shows no racetracks");
await page.click('a.chip[href*="rank=put"]');
await page.waitForFunction(() => location.hash.includes("rank=put")).catch(() => problems.push("rank chip did not reach the URL"));
// Tooltip: hovering a deal row shows the ink tooltip with the row's summary.
await page.goto(BASE + "#/company/openai");
await page.waitForSelector(".drow");
await page.hover(".drow");
if (await page.locator("#tip").isHidden()) problems.push("hovering a deal row showed no tooltip");
// Data page: both downloads are served.
await page.goto(BASE + "#/data");
for (const f of ["data/deals.csv", "data/bundle.json"]) {
  const res = await page.request.get(BASE + f);
  if (!res.ok()) problems.push(`${f} is not served (${res.status()})`);
}
if (!(await page.locator('a.btn[href="data/deals.csv"]').count())) problems.push("the Data page has no CSV button");
await page.goto(BASE + "#/flows");
await page.selectOption('select[data-field="focus"]', "openai");
await page.waitForFunction(() => location.hash.includes("focus=openai")).catch(() => problems.push("trace picker did not set focus"));
const lit = await page.locator("a.edge.lit").count();
if (!lit) problems.push("trace highlighted no lines");
await follow('svg a[href*="open="]');
await page.waitForFunction(() => location.hash.includes("open=")).catch(() => problems.push("layer click did not open a layer"));
await page.click("details.list summary");
await page.click('details.list .rows a[href*="#/company/"]');
await page.waitForFunction(() => location.hash.startsWith("#/company/")).catch(() => problems.push("company link did not open a card"));
await page.screenshot({ path: `${out}/desktop-dark-interaction-end.jpg`, type: "jpeg", quality: 70 });
await browser.close();

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`browser: ${problems.length} problems`);
  process.exit(1);
}
console.log(`browser: ${ROUTES.length} pages x 2 sizes x 2 themes and 24 interaction checks, 0 problems`);
