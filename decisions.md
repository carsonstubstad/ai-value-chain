# Decisions

Settled questions. Do not reopen without Carson. Add a dated line for every new decision.

## Settled by Carson (2026-10-27, kickoff brief)
- D01 Repo: public, on Carson's personal GitHub, hosted on GitHub Pages.
- D02 Who builds: Duet in the background; Carson approves at Gates 1 to 5; laptop Claude Code is a fallback for git only.
- D03 MVP size: about 50 companies chosen by rubric to represent the chain, plus the 60 to 80 largest money flows between them. Depth later.
- D04 Data budget: $0. Public filings, company announcements, free news search, Epoch AI open datasets.
- D05 Boundaries: nothing from Carson's employer's work; personal accounts only; no investment advice; no live prices; no paywalled scraping.
- D06 Anthropic is treated like every other company: same sourcing bar, same framing.
- D07 Publishing to the public repo or Pages waits for Carson's explicit approval, every time.
- D08 Every figure carries a source URL, confidence level (filed, company-stated, reported, rumored), as-of date and amount basis (committed, paid, estimated). Ranges stored as ranges. Rumored hidden by default.
- D09 One deal is one edge, counted once. Direction follows the money. Caps and multi-year totals are stored as such and never summed as cash.
- D10 Own one-line summaries and links only, never article text. Credit Epoch AI wherever its data appears.
- D11 Files small and plain so they diff well and can be fixed by hand.
- D12 No em-dashes anywhere: prose, code comments, site copy.

## Settled by Carson (2026-10-28)
- D13 Repo: https://github.com/carsonstubstad/ai-value-chain (public). Handle: carsonstubstad, taken from the repo URL.

## Settled by Carson (2026-10-31)
- D14 Publishing in a public repo (was O07): within an approved session, Duet may push working branches and open draft pull requests. Merging to main, enabling or deploying GitHub Pages, and any other publishing wait for Carson's explicit yes.
- D15 SEC identity (was O08): Carson's name and his account email go in the EDGAR User-Agent header, stored only as the Actions secret SEC_USER_AGENT, which Carson adds himself. Never written in code, commits or pull requests. If the secret is missing, the fetch skips SEC and says so.

## Settled by Carson at Gate 1 (2026-10-31, "Approve all five")
- D16 Concept note and reconciliation approved as written: P01 to P20 become settled (closes O02, O09).
- D17 News inputs: company newsrooms and 8-K filings first; GDELT only as best effort (closes O10).
- D18 News cadence: weekly; Actions gather Sunday night, one light Duet review Monday morning Pacific (closes O05).
- D19 PR #1 (rules, decisions log, validator, probe) merged to main. Pages stays off until Gate 5 (closes O11).
- D20 Gate 2 starts: final list of about 50, record schema, two or three overview mockups, in two medium sessions.

## Step 3 findings (2026-10-31, tested live)
- F01 GitHub: Duet reads the repo, pushes branches (workflow files included) and opens draft pull requests. Tested on draft PR #1.
- F02 Fetching: GitHub Actions run stdlib Python fetch scripts and commit filtered output to the `fetch` branch; Duet reads it back. SEC EDGAR (with the SEC_USER_AGENT secret) and the Epoch AI data centers CSV worked on all three runs.
- F03 GDELT DOC API is unreliable from Actions: one of three runs succeeded, the others got HTTP 429 even after backoff. GDELT raw update files on data.gdeltproject.org answered every time. Treat GDELT as best effort; company newsrooms and 8-K filings stay the primary news inputs.
- F04 The sandbox cannot reach SEC, GDELT, Epoch AI or CDNs, but can reach PyPI and the npm registry. No browser is installed, so no headless render here; Carson previews the page on the laptop at Gate 4.
- F05 Duet's web fetch reads company newsroom pages (tested on an NVIDIA release), which is how seeding sources get checked.
- F07 (sessions 3 and 4) SEC EDGAR matched all 31 tracked companies that file with it; their records cite their EDGAR filings index. The other 16 cite their own website or announcement. 38 of 47 websites answered an automated check; 9 (Applied Materials, Intel, TSMC, Supermicro, Oracle, OpenAI and its Stargate page, Perplexity, Blackstone) refuse automated checks but are live.
- F06 Scheduled triggers in Actions only run from main, so the weekly gather starts only after a merge Carson approves.

## Approved at Gate 1 (D16): from Step 1 (2026-10-27)
- P01 Five views (chain overview, money flows, loops, company card, what changed) plus Method and About the data pages. No network-graph home screen, no time-series charts, no prices in the MVP.
- P02 First-screen controls: amount basis, time window, confidence chips, layer focus, search, light/dark. Drill-down: show rumored, deal type, minimum deal size, public/private, HQ region. Contextual: net/gross (loops), follow the money (card).
- P03 Company rubric (anchor by layer, loop membership overrides size, edges beat size, global coverage, one primary layer with secondary tags, entry condition of one sourced edge) and the 47-company first cut with bench.
- P04 Confidence and amount basis encoded by shape (line style, fill), never by color; color means layer only.
- P05 Staleness: amber after 90 days unchecked, grey after 180.
- P06 Deal records carry amount basis (committed, paid, estimated) and amount kind (cap, multi-year total, annual run-rate, one-time), with low and high.

## Approved at Gate 1 (D16): from Step 2 (2026-10-28)
- P07 Stack: no-build static site; plain HTML, CSS and JS modules; d3 and d3-sankey only; no Cytoscape and no time-series library in the MVP. Replaces O03, final after Step 3.
- P08 Libraries vendored as pinned files in the repo, copied once by an Action; the live site makes no third-party requests.
- P09 Data: one JSON file per record as source of truth; bundle.py writes site/data/bundle.json; CI fails if stale. Replaces O04.
- P10 Six record types: company, deal, loop, source, event, financial (financial slim in the MVP).
- P11 Twelve deal types in four families (equity; debt and guarantees; commercial commitments; public money). New: warrant or equity grant, power supply agreement, government grant or incentive.
- P12 Confidence spelled filed, company_stated, reported, rumored. Validator: filed needs a filing source; company_stated needs a company source.
- P13 Recurring fetches run in GitHub Actions and commit small filtered outputs to a fetch branch; Duet reads them through the GitHub API; raw downloads stay in the Actions cache.
- P14 Scripts Duet runs in its sandbox use the Python standard library only, so the same validator runs in the sandbox, CI and on the laptop.
- P15 Sources: dropped for the MVP are Crunchbase, NewsAPI, Finnhub, Financial Modeling Prep and Form D. OpenDART and EDINET deferred; Korean and Japanese figures at company_stated from English IR releases.
- P16 News routine: Actions gather Sunday night Pacific, capped at 30 candidates; a Duet routine judges Monday morning and opens one pull request with a digest; never merges or deploys. Significance rules add basis changes and stale records.
- P17 Phase plan: about 15 bounded sessions (2 light, 9 medium, 4 heavy); deal seeding split into upstream, systems and power and data centers, hyperscale and labs, capital rail. Filings automation moves after the MVP.
- P18 Spot check runs as its own session on 20 records chosen at random by script.
- P19 Concentration: top-3 share only where a sourced market-share figure exists; otherwise share of tracked flows, labeled.
- P20 Company list: hold at 47; fill up to three slots from the bench only with a sourced edge. Products roll up to companies; DeepMind and Meta AI are secondary lab tags.

## Settled by Carson at Gate 2 (2026-10-31, "Go with A plus B")
- D21 Overview: direction A (chain rail) as the home screen, with direction B's one-sentence "state of the chain" line above it. Direction C (flow map) becomes the money-flow view. Closes O13 and P24.
- D22 PR #2 stays a draft until Carson says to merge it.

## Proposed at Gate 2 (2026-10-31), awaiting Carson's feedback
- P21 Company list: the 47 in data/companies-list.csv stand. Bench promotion order if a sourced edge appears: Core Scientific, Humain, Bloom Energy.
- P22 Schema: six JSON Schemas in schema/ plus data/taxonomy.json. Financials are JSON records like the rest, not a CSV, so one validator covers everything.
- P23 Loop sides are shown gross each way and never netted when either side is a cap or multi-year total. Company rankings use the largest single deal, never a sum of caps.

## Open (need Carson)
- O14 Confirm P21 to P23, and say when to merge PR #2.
- O06 Paid data: $0 through the MVP; revisit after two months of weekly updates.
- O12 Epoch AI terms of use: confirm before Gate 5 (the downloads page states no license).
