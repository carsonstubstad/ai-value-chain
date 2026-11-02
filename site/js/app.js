// Router and wiring. Pages: overview (D40: the two-way chain), company card, money flows
// by layer with trace (13d), loops, what changed. All state lives in the
// URL hash, so every view can be linked. Reads data/bundle.json; no third-party requests.

import { index, parseState, stateQuery, DEFAULTS } from "./lib.js";
import { makeCtx, renderControls, countLine, renderOverview, renderCompany, renderCompanies, renderFlows, renderLoops, renderChanges, renderData, renderFoot } from "./views.js";

const $ = (id) => document.getElementById(id);
let data, idx;

function route() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [pathAnchor, query] = raw.split("?");
  // A second # names a spot on the page, as in #/loops#loop-microsoft-openai.
  const [path, anchor] = pathAnchor.split("#");
  const parts = path.split("/").filter(Boolean);
  return { page: parts[0] || "overview", id: parts[1] ? decodeURIComponent(parts[1]) : "", anchor: anchor || "", s: parseState(query) };
}

const TITLES = { overview: "", company: "", companies: "Companies", flows: "Money flows", loops: "Loops", changes: "What changed", data: "The data" };

function render(keepControls) {
  const r = route();
  const ctx = makeCtx(data, idx, r.s, stateQuery);
  const views = {
    overview: () => renderOverview(ctx),
    company: () => renderCompany(ctx, r.id),
    companies: () => renderCompanies(ctx),
    flows: () => renderFlows(ctx),
    loops: () => renderLoops(ctx),
    changes: () => renderChanges(ctx),
    data: () => renderData(ctx),
  };
  const page = views[r.page] ? r.page : "overview";
  // Each filtered page places the filters right after its own answer (a #controls slot).
  // While the reader types a search, the live filter box is moved across, so it keeps focus.
  const live = keepControls ? document.querySelector("#controls .controls") : null;
  // Moving the box detaches it for a moment, which blurs it, so focus and caret are put back.
  const typed = live && live.contains(document.activeElement) ? document.activeElement : null;
  const caret = typed ? [typed.selectionStart, typed.selectionEnd] : null;
  $("view").innerHTML = views[page]();
  const slot = $("controls");
  if (slot && live) {
    slot.appendChild(live);
    $("count").innerHTML = countLine(ctx, page);
    if (typed) { typed.focus({ preventScroll: true }); try { typed.setSelectionRange(...caret); } catch { /* not a text box */ } }
  }
  else if (slot) slot.innerHTML = renderControls(ctx, page);
  $("foot").innerHTML = renderFoot(ctx);
  for (const a of document.querySelectorAll("[data-nav]")) {
    a.href = `#/${a.dataset.nav === "overview" ? "" : a.dataset.nav}${ctx.qs}`;
    // A company card sits under Companies in the nav.
    a.setAttribute("aria-current", a.dataset.nav === (page === "company" ? "companies" : page) ? "page" : "false");
  }
  const name = page === "company" ? idx.companies[r.id]?.name : TITLES[page];
  document.title = (name ? name + ", " : "") + "AI Value Chain Tracker";
  adoptTitles($("view"));
  if (r.anchor) document.getElementById(r.anchor)?.scrollIntoView();
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
    const base = DEFAULTS[k] || [];
    return go({ [k]: base.filter((x) => next.includes(x)).concat(next.filter((x) => !base.includes(x))) });
  }
  go({ [t.dataset.set]: t.dataset.v });
}

let typing;
function onInput(e) {
  const f = e.target.dataset?.field;
  if (f !== "q" && f !== "cq") return;
  clearTimeout(typing);
  typing = setTimeout(() => go({ [f]: e.target.value }, true), 200);
}

function onChange(e) {
  const f = e.target.dataset?.field;
  if (!f || f === "q" || f === "cq") return;
  go({ [f]: f === "min" ? Number(e.target.value) || 0 : e.target.value });
}

// Theme: a three-way segment (D53). Follows the system until the reader picks; kept on this device only.
const THEMES = ["auto", "light", "dark"];
function applyTheme(t) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  for (const b of document.querySelectorAll("[data-theme-set]")) b.setAttribute("aria-pressed", String(b.dataset.themeSet === t));
}
function storedTheme() {
  try { return THEMES.includes(localStorage.getItem("theme")) ? localStorage.getItem("theme") : "auto"; } catch { return "auto"; }
}

// Tooltip: the same two lines as each title, drawn ink on paper with the item first.
// Titles move to data-tip so the browser's own tooltip does not show as well; an SVG
// <title> stays in place for screen readers and its text is copied to the parent link.
function adoptTitles(root) {
  for (const el of root.querySelectorAll("[title]")) { el.dataset.tip = el.getAttribute("title"); el.removeAttribute("title"); }
  for (const t of root.querySelectorAll("svg title")) {
    const p = t.parentElement;
    if (!p || p.dataset.tip) continue;
    p.dataset.tip = t.textContent;
    p.setAttribute("aria-label", t.textContent.replace(/\n/g, ", "));
    t.remove();
  }
}
function showTip(e) {
  const tip = $("tip"), el = e.target.closest?.("[data-tip]");
  if (!el) { tip.hidden = true; return; }
  const [head, ...rest] = el.dataset.tip.split("\n");
  tip.innerHTML = "";
  const b = document.createElement("b");
  b.textContent = head;
  tip.append(b);
  if (rest.length) tip.append(rest.join(" "));
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX + 12)) + "px";
  tip.style.top = (e.clientY - h - 12 < 8 ? e.clientY + 18 : e.clientY - h - 12) + "px";
}

async function main() {
  applyTheme(storedTheme());
  for (const b of document.querySelectorAll("[data-theme-set]")) b.addEventListener("click", () => {
    const t = b.dataset.themeSet;
    try { localStorage.setItem("theme", t); } catch { /* private window: the choice lasts this page only */ }
    applyTheme(t);
  });
  document.addEventListener("pointermove", showTip);
  document.addEventListener("scroll", () => { $("tip").hidden = true; }, { passive: true });
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
    if (path !== last) window.scrollTo(0, 0);
    render();
    last = path;
  });
  render();
}

main();
