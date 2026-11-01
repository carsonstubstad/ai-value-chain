// Renders every mockup to PNG in light and dark at 1280 and 390 wide, then one contact sheet per view.
// Uses the Playwright already installed; run from the repo root: node mockups/round5/render.js
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(__dirname, "png");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8771;
const VIEWS = { overview: [""], loops: [""], flows: [""], company: [""], companies: [""] };
const SIZES = { desktop: 1280, phone: 390 };
const THEMES = ["light", "dark"];

(async () => {
  const srv = spawn("python3", ["-m", "http.server", String(PORT), "--directory", ROOT], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const files = [];
  for (const [view, dirs] of Object.entries(VIEWS)) {
    for (const dir of dirs) {
      const html = dir ? `${view}-${dir}.html` : `${view}.html`;
      for (const [size, width] of Object.entries(SIZES)) {
        for (const theme of THEMES) {
          const page = await browser.newPage({ viewport: { width, height: size === "phone" ? 844 : 900 }, deviceScaleFactor: 1 });
          await page.emulateMedia({ colorScheme: theme });
          await page.goto(`http://localhost:${PORT}/mockups/round5/${html}`);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(150);
          const name = `${view}${dir ? "-" + dir : ""}-${size}-${theme}.png`;
          await page.screenshot({ path: path.join(OUT, name), fullPage: true });
          files.push({ view, dir, size, theme, name });
          await page.close();
        }
      }
    }
  }
  // Contact sheets: directions side by side, desktop rows then phone rows, each theme
  for (const [view, dirs] of Object.entries(VIEWS)) {
    const cell = (f, h) => `<figure><figcaption>${view}${f.dir ? " " + f.dir : ""} · ${f.size} · ${f.theme}</figcaption><div style="max-height:${h}px"><img src="${f.name}"></div></figure>`;
    const row = (size, theme, h) => `<div class="row">${dirs.map((d) => cell(files.find((f) => f.view === view && f.dir === d && f.size === size && f.theme === theme), h)).join("")}</div>`;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#bdb8ae;font:12px "IBM Plex Mono",Menlo,monospace;color:#1b1a17;padding:16px}
      h1{font:500 20px Georgia,serif;margin:0 0 12px}
      .row{display:flex;gap:16px;margin-bottom:16px;align-items:flex-start}
      figure{margin:0;flex:1;min-width:0;background:#fff;padding:6px}
      figure div{overflow:hidden;border:1px solid #888}
      figcaption{margin:0 0 6px;font-weight:600}
      img{width:100%;display:block}
      .row.phone figure{flex:0 0 ${dirs.length > 1 ? 300 : 400}px}
    </style><h1>AI Value Chain · round 5 · ${view}</h1>
      ${row("desktop", "light", 1100)}${row("desktop", "dark", 1100)}
      <div class="row phone">${dirs.map((d) => ["light", "dark"].map((t) => cell(files.find((f) => f.view === view && f.dir === d && f.size === "phone" && f.theme === t), 1400)).join("")).join("")}</div>`;
    const sheetPath = path.join(OUT, `_sheet-${view}.html`);
    fs.writeFileSync(sheetPath, html);
    const w = Math.max(900, dirs.length * 460 + 40);
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto(`http://localhost:${PORT}/mockups/round5/png/_sheet-${view}.html`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `contact-${view}.png`), fullPage: true });
    await page.close();
    fs.unlinkSync(sheetPath);
  }
  await browser.close();
  srv.kill();
  console.log(files.length + " screenshots and " + Object.keys(VIEWS).length + " contact sheets in " + OUT);
})();
