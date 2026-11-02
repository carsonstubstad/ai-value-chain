# Build plan (revised at Gate 2, 2026-10-31)

Approved at Gate 1 (D16 to D20). Each session is bounded, ends with the validator green, a draft pull request, and three lists: shipped, open, needs Carson. Carson hears before each heavy session.

| # | Session | Goal | Carson decides | Weight | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Plan and schema | Final list (data/companies-list.csv), taxonomy, six schemas, validator cross-checks | Final list, schema | Medium | Done |
| 2 | Mockups | Three overview directions on nine sourced deals (mockups/sample.json) | Pick one (Gate 2) | Medium | Done |
| 3 | Scaffold | Site skeleton, bundle script, d3 vendored from npm, weekly Actions schedules | Nothing | Light | Done |
| 4 | Companies | 47 company records; CIKs and tickers from SEC via Actions | Flags only | Medium | Done |
| 5 | Deals: upstream | Equipment, chip design, foundry, memory | Flags only | Heavy | Done |
| 6 | Deals: systems, power, data centers | Includes neocloud debt; Epoch CSV for campuses | Flags only | Heavy | Done |
| 7 | Deals: hyperscale and labs | Densest layer, most loops | Flags only | Heavy | Done |
| 8 | Deals: capital rail | Equity, credit and public money into every layer | Flags only | Heavy | Done |
| 9 | Loops | Automatic detection, hand tagging, one-line explanations | Flags only | Medium | Done |
| 10 | Spot check | 20 records chosen at random, checked by a fresh session | Accept (Gate 3) | Medium | Done |
| 11 | Overview and company card | State line, deal counts, chain rail, top flows, largest deals; company card with money in and out | Nothing | Medium | Done |
| 12 | Money flows and trace | Layer columns, one line per deal, trace up and down from any company | Nothing | Medium | Done |
| 13 | Loops, what changed, filters, mobile, dark | Loop cards, dated change log, URL filters, phone layout, theme button | Accept (Gate 4) | Medium | Done; Gate 4 not passed (D33 to D39) |
| 13a | Design spec and mockups | docs/design-spec.md, two Overview mockups and a loop card in mockups/, three state-line candidates | Pick a mockup and a state line (Gate 4a) | Medium | Done (Gate 4a: B and line 1) |
| 13b | Schema and build | paid_to_date fields, required amount_kind, contingent guarantees, layer flows and loop numbers computed at render (D45), NVIDIA spelling, the no-amount count | Nothing | Medium | Done |
| 13c | Loops and Overview hero | Two-way loop diagrams and the picked hero, built to the spec | Nothing | Heavy (Carson told first) | Done |
| 13d | Money flows | Layer level by default, bundled lines, Capital rail, trace isolates | Nothing | Medium | Done |
| 13e | Words, fonts, phone | Word budgets enforced by the render test, self-hosted fonts in the site, phone pass | Accept (Gate 4 again) | Medium | Done, waits on Gate 4 |
| 13f | Seed benched companies | Skipped until Carson asks (D34) | | | Skipped |
| 14 | Launch pages | Method, About the data, README, changelog, first weekly entry; check Epoch terms (O12) | Yes to Pages (Gate 5) | Light | |

Bench (promote up to three only with a sourced edge to a tracked company): Core Scientific, Humain, Bloom Energy first; then KLA, Cisco, Schneider Electric, Eaton, Oklo, Equinix, Thrive Capital, Alibaba, DeepSeek.
