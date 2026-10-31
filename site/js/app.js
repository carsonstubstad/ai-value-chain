// Overview: direction A (chain rail) with direction B's state line on top (D21).
// Reads data/bundle.json, written by scripts/bundle.py. No third-party requests.

const B = (v) => "$" + (v / 1e9).toFixed(v % 1e9 ? 1 : 0) + "B";

export function amountText(d) {
  const lo = d.amount_usd_low, hi = d.amount_usd_high;
  if (lo == null && hi == null) return "not disclosed";
  const tag = d.syndicate_total ? " (syndicate total)" : "";
  if (lo == null) return "up to " + B(hi) + tag;
  if (hi == null) return "over " + B(lo) + tag;
  return (lo === hi ? B(lo) : B(lo) + " to " + B(hi)) + tag;
}

const highEnd = (d) => d.amount_usd_high ?? d.amount_usd_low ?? 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function main() {
  const data = await (await fetch("data/bundle.json")).json();
  const companies = Object.fromEntries(data.companies.map((c) => [c.id, c]));
  const sources = Object.fromEntries(data.sources.map((s) => [s.id, s]));
  const shown = data.deals.filter((d) => d.confidence !== "rumored" && companies[d.payer] && companies[d.payee]);
  const color = (id) => `var(--l-${companies[id].layer})`;

  document.getElementById("state").textContent = data.state ? data.state.text : "";

  document.getElementById("rail").innerHTML = data.taxonomy.layers.map((l) => {
    const n = data.companies.filter((c) => c.layer === l.id).length;
    const k = shown.filter((d) => companies[d.payer].layer === l.id || companies[d.payee].layer === l.id).length;
    return `<div class="step ${n ? "" : "dim"}" style="--c:var(--l-${l.id})"><b>${esc(l.label)}</b><i>${n} companies<br>${k} deals</i></div>`;
  }).join("");

  const max = Math.max(...shown.map(highEnd), 1);
  document.getElementById("flows").innerHTML = [...shown].sort((a, b) => highEnd(b) - highEnd(a)).slice(0, 15).map((d) => {
    const ranged = d.amount_usd_low == null || d.amount_usd_high !== d.amount_usd_low || d.amount_kind === "cap";
    const w = (highEnd(d) / max) * 100, lo = ((d.amount_usd_low ?? 0) / max) * 100;
    let bars = "";
    if (highEnd(d)) {
      if (ranged && d.amount_usd_low) bars += `<span class="bar ${d.confidence}" style="--c:${color(d.payer)};width:${lo}%"></span>`;
      bars += `<span class="bar ${ranged ? "range" : d.confidence}" style="--c:${color(d.payer)};width:${w}%"></span>`;
    }
    const src = sources[d.sources[0]];
    return `<div class="flow"><div class="who"><span class="dot" style="--c:${color(d.payer)}"></span>${esc(companies[d.payer].name)} to ${esc(companies[d.payee].name)}<small>${esc(d.summary)}</small></div>
      <div class="track" aria-hidden="true">${bars}</div>
      <div class="amt"><a href="${esc(src.url)}" target="_blank" rel="noopener">${amountText(d)}</a></div></div>`;
  }).join("");

  document.getElementById("foot").textContent =
    `${data.companies.length} companies, ${data.deals.length} deals, ${data.sources.length} sources.` +
    (data.state ? ` State line as of ${data.state.as_of}.` : "");
}

main();
