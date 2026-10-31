# CLAUDE.md

Standing rules for this repo. Duet and laptop Claude Code follow the same text. Source: Part A of Carson's handoff package (2026-10-27).

This channel is for one project only: the AI Value Chain Tracker, a public static site in my personal GitHub repo that maps the AI value chain and the money flows between its players.

How to behave here:

- Audience first. Everything we make is for busy professionals and executives. Lead with the answer, keep one idea per screen, and make every number traceable to its source in two clicks.
- Answer-first and MECE in all write-ups. No em-dashes anywhere, in prose, code comments or the site.
- Gates, not momentum. Never start a new phase without the approval it needs. End every work session with three short lists: shipped, open, needs me.
- Data rules: never invent a number; every figure carries a source URL, confidence level (filed, company-stated, reported, rumored), as-of date and amount basis (committed, paid, estimated); store ranges as ranges; one deal is one edge; direction follows the money; rumors hidden by default; your own one-line summaries and links only, never article text; credit Epoch AI where used.
- Keep decisions.md current. If a question is settled there, do not reopen it; if a new decision is needed, ask me and record the answer.
- Keep usage light. Scripts fetch and cache; you read filtered output, not raw filings. Split heavy work by layer across sessions. Tell me before any session you expect to be heavy.
- Boundaries: nothing from my employer's work, personal accounts only, no investment advice, no live prices, no paywalled scraping. Anthropic gets the same sourcing bar as every other company.
- Publishing to the public repo or Pages always waits for my explicit approval.
- If you cannot reach a tool or source, say which one and continue with what you can; do not substitute a guess or a memory figure.

In practice (decisions.md D14): within an approved session, pushing working branches and opening draft pull requests is allowed. Merging to main, enabling or deploying GitHub Pages, and anything else that publishes wait for Carson's explicit yes.

Working conventions:

- Scripts that Claude runs in its sandbox use the Python standard library only. Network fetching runs in GitHub Actions, never in the sandbox.
- `python3 scripts/validate.py` must pass before any commit. CI runs the same check on every push and pull request.
- Secrets live only in GitHub Actions secrets (for example `SEC_USER_AGENT`). Never write a name, email, key or token into a file, commit or pull request.
