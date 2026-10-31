// Router and wiring. Pages: overview (D21: chain rail with the state line on top),
// company card, money flows with trace, loops, what changed. All state lives in the
// URL hash, so every view can be linked. Reads data/bundle.json; no third-party requests.

import { index, parseState, stateQuery, DEFAULTS } from "./lib.js";
import { makeCtx, renderControls, countLine, renderOverview, renderCompany, renderFlows, renderLoops, renderChanges, renderFoot } from "./views.js";

const $ = (id) => document.getElementById(id);
let data, idx;

function route() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { page: parts[0] || "overview", id: parts[1] ? decodeURIComponent(parts[1]) : "", s: parseState(query) };
}

const TITLES = { overview: "", company: "", flows: "Money flows", loops: "Loops", changes: "What changed" };

function render(keepControls) {
  const r = route();
  const ctx = makeCtx(data, idx, r.s, stateQuery);
  const views = {
    overview: () => renderOverview(ctx),
    company: () => renderCompany(ctx, r.id),
    flows: () => renderFlows(ctx),
    loops: () => renderLoops(ctx),
    changes: () => renderChanges(ctx),
  };
  const page = views[r.page] ? r.page : "overview";
  // Each filtered page places the filters right after its own answer (a #controls slot).
  // While the reader types a search, the live filter box is moved across, so it keeps focus.
  const live = keepControls ? document.querySelector("#controls .controls") : null;
  $("view").innerHTML = views[page]();
  const slot = $("controls");
  if (slot && live) { slot.appendChild(live); $("count").innerHTML = countLine(ctx); }
  else if (slot) slot.innerHTML = renderControls(ctx);
  $("foot").innerHTML = renderFoot(ctx);
  for (const a of document.querySelectorAll("[data-nav]")) {
    a.href = `#/${a.dataset.nav === "overview" ? "" : a.dataset.nav}${ctx.qs}`;
    a.setAttribute("aria-current", a.dataset.nav === page ? "page" : "false");
  }
  const name = page === "company" ? idx.companies[r.id]?.name : TITLES[page];
  document.title = (name ? name + ", " : "") + "AI Value Chain Tracker";
}

function go(change, replace) {
  const r = route();
  const s = { ...r.s, ...change };
  const path = "#/" + (r.page === "overview" ? "" : r.page + (r.id ? "/" + encodeURIComponent(r.id) : ""));
  const url = path + stateQuery(s);
  if (replace) { history.replaceState(null, "", url); render(true); }
  else if (url !== location.hash) location.hash = url;
  else render();
}

function onClick(e) {
  const t = e.target.closest("[data-toggle],[data-set],[data-reset]");
  if (!t) return;
  e.preventDefault();
  const s = route().s;
  if (t.dataset.reset !== undefined) return go({ ...DEFAULTS, focus: s.focus });
  if (t.dataset.toggle) {
    const k = t.dataset.toggle, v = t.dataset.v;
    const next = s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v];
    return go({ [k]: DEFAULTS[k].filter((x) => next.includes(x)).concat(next.filter((x) => !DEFAULTS[k].includes(x))) });
  }
  go({ [t.dataset.set]: t.dataset.v });
}

let typing;
function onInput(e) {
  const f = e.target.dataset?.field;
  if (f !== "q") return;
  clearTimeout(typing);
  typing = setTimeout(() => go({ q: e.target.value }, true), 200);
}

function onChange(e) {
  const f = e.target.dataset?.field;
  if (!f || f === "q") return;
  go({ [f]: f === "min" ? Number(e.target.value) || 0 : e.target.value });
}

// Theme: follows the system until the reader picks one; the choice is kept on this device only.
const THEMES = ["auto", "light", "dark"];
function applyTheme(t) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const b = $("theme");
  if (b) b.textContent = { auto: "Theme: auto", light: "Theme: light", dark: "Theme: dark" }[t];
}
function storedTheme() {
  try { return THEMES.includes(localStorage.getItem("theme")) ? localStorage.getItem("theme") : "auto"; } catch { return "auto"; }
}

async function main() {
  let theme = storedTheme();
  applyTheme(theme);
  $("theme").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch { /* private window: the choice lasts this page only */ }
    applyTheme(theme);
  });
  try {
    data = await (await fetch("data/bundle.json")).json();
  } catch {
    $("view").innerHTML = `<p class="empty">The data could not be loaded. If you opened this file directly, serve the site folder over HTTP instead (see the README).</p>`;
    return;
  }
  idx = index(data);
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  let last = location.hash.split("?")[0];
  window.addEventListener("hashchange", () => {
    const path = location.hash.split("?")[0];
    render();
    if (path !== last) window.scrollTo(0, 0);
    last = path;
  });
  render();
}

main();
