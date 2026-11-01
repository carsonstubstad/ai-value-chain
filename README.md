# ai-value-chain
Maps the AI value chain and the money flows between its players. Every figure links to its source.

## Preview the site locally

The site is plain HTML, CSS and JavaScript with no build step. It loads `site/data/bundle.json`, so serve the folder over HTTP rather than opening the file directly:

```
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000. To review a branch, `git fetch` and `git checkout` it first (the Gate 4 redesign is on `claude/project-thread-6qiz8r`). After editing anything in `data/`, run `python3 scripts/validate.py` and `python3 scripts/bundle.py`.
