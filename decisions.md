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
- F08 (session 5) Upstream added 16 deals and 1 loop, 25 deals in all. Equipment makers have almost no money edges with tracked companies; ASML into Mistral is the only one. The US government's Intel stake is funded by Intel's unpaid CHIPS grants, so Intel's CHIPS award is not a separate edge. Dollar values are left empty where the company states none (OpenAI with Broadcom, Samsung and SK hynix; Meta with AMD and NVIDIA), even when press reports give one. ASML's Mistral stake is stored in euros only.
- F09 (session 6) Systems, power and data centers added 14 deals and 1 loop, 39 deals in all. Neoclouds carry most of the dollar value (CoreWeave contracts from OpenAI, Meta and NVIDIA). Power deals are 20-year nuclear PPAs that state megawatts but never a dollar value. Systems makers (Foxconn, Supermicro, Dell, Arista, Coherent) have no sourced money edges with tracked companies yet. Syndicated loans keep the lead lender as payer with no amount, since the lead's own share is not disclosed.
- F10 (session 7) Hyperscale and labs added 10 deals and 1 loop, 49 deals in all. OpenAI's $250B Azure and $38B AWS commitments are the largest stated figures. Microsoft's April 2026 amendment ended its exclusivity and its revenue share payments to OpenAI, with no dollar figures. Several deals carry only words ("tens of billions"), so no amount is stored. Meta's Google Cloud deal rests on one unnamed source and is stored as rumored (hidden). xAI has no sourced edges yet.
- F11 (session 8) The capital rail added 13 deals, 62 deals in all. SoftBank has paid $60B into OpenAI across two rounds, the largest paid flows tracked. Stargate's four funders state no individual amounts, so their edges carry none; the $500B plan sits on no edge. Joint ventures (Meta and Blue Owl, Crusoe and Blue Owl) are drawn as edges to the operating company, with the JV size in notes when a partner's share is not stated. NVIDIA's February 2026 $30B commitment to OpenAI is kept separate from its September 2025 letter of intent because no source links the two.
- F12 (session 9) Loop detection now runs in CI (scripts/loops.py --check): any two or three companies with money flowing out and back form a loop, using every deal that is not rumored, terminated or superseded. It found 11 loops; 5 were new (Google and Anthropic, Amazon and OpenAI, Blue Owl and Meta, NVIDIA and OpenAI, and the NVIDIA, CoreWeave and OpenAI ring) and 2 existing loops were missing deals. NVIDIA and OpenAI only closes because session 9 added OpenAI's 10 GW NVIDIA systems commitment from the same September 2025 release, with no dollar value. Anthropic's 1 GW of NVIDIA systems is not an edge, because the release does not say Anthropic buys from NVIDIA rather than through Azure. CoreWeave's GPU purchases from NVIDIA have no sourced edge yet. The homepage line still holds: 57 of 62 visible deals are commitments and 5 are paid.
- F13 (session 10) Two fresh checkers, working only from each record's sources, reviewed 20 records drawn at random (seed 20261031 over all deal, loop and company files). 11 passed as they stood and 9 were corrected. One error mattered: Amazon's $50B in OpenAI was stored as an announced commitment, but Amazon's Q2 2026 10-Q shows it fully paid by late July 2026, so it is now paid, closed and filed. The same 10-Q and Amazon's release add a missing deal: OpenAI's $100B, eight-year AWS expansion, which joins the Amazon and OpenAI loop. The other 8 fixes were wording or support: summaries and notes that said committed where the source says intends, a Vera Rubin detail, and company one-liners making claims their cited source did not back (SK hynix, Foxconn, Lambda, Amazon). TSMC's TSMWF ticker was kept, since SEC's own submissions data lists it. After the fixes, 57 of 63 visible deals are commitments and 6 are paid, so the homepage line still holds. Lesson: status goes stale fastest; quarterly filings can turn an announced deal into a paid one.

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
- D22 PR #2 stays a draft until Carson says to merge it. Superseded by D23.

## Settled by Carson (2026-10-31, "Merge and start 5")
- D23 PRs #2 and #3 merged to main. GitHub Pages stays off. Session 5 approved; stop and report before session 6.
- D24 (2026-10-31, "Merge and start 6") PR #4 merged to main. Session 6 approved; stop and report before session 7. Pages stays off.
- D25 (2026-10-31, "Yes to all three") Multi-lender loans: the full facility amount goes on the lead lender's edge, flagged syndicate_total and labeled "syndicate total" on the site. Other lenders in the same facility get no amount, so nothing is double counted. Closes O15. PR #5 merged; session 7 approved; stop and report before session 8. Pages stays off.
- D26 (2026-10-31, "Merge and start 8") PR #6 merged to main. Session 8 approved. Pages stays off.
- D27 (2026-10-31, "Merge and run both") PR #7 merged to main. Sessions 9 (loops) and 10 (spot check) approved back to back; stop at Gate 3. Pages stays off.

## Settled by Carson at Gate 3 (2026-10-31, "Approve all four")
- D28 The data as of PR #8 is accepted: 64 deals and 11 loops after the session 10 spot check.
- D29 Loop rule (was P25): a loop is two or three companies with money flowing out and back, found automatically from deals that are not rumored, terminated or superseded. Its record lists every such deal along the cycle, not only the first matching pair. Three-company rings are tagged even when two of the companies already form a loop. CI enforces it with scripts/loops.py --check.
- D30 PR #8 merged to main. Pages stays off.
- D31 Next is the status sweep (O16): check every open deal against the latest 10-Q or 10-K of a party that files with the SEC, then stop and report before sessions 11 to 13.

## Proposed at Gate 2 (2026-10-31), awaiting Carson's feedback
- P21 Company list: the 47 in data/companies-list.csv stand. Bench promotion order if a sourced edge appears: Core Scientific, Humain, Bloom Energy.
- P22 Schema: six JSON Schemas in schema/ plus data/taxonomy.json. Financials are JSON records like the rest, not a CSV, so one validator covers everything.
- P23 Loop sides are shown gross each way and never netted when either side is a cap or multi-year total. Company rankings use the largest single deal, never a sum of caps.

## Open (need Carson)
- O14 Confirm P21 to P23 (PRs merged per D23).
- O06 Paid data: $0 through the MVP; revisit after two months of weekly updates.
- O12 Epoch AI terms of use: confirm before Gate 5 (the downloads page states no license).
- O16 Status sweep: recheck every announced or signed deal against the payer's latest 10-Q or 10-K, since F13 found one paid deal still marked announced.
