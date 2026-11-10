# uyarid.com

The public front page of [uyarid.com](https://uyarid.com): every public repository of
[KorelUyar](https://github.com/KorelUyar), and a download card for each app that publishes releases.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

**How it gets online:** a push to `main` publishes the page with GitHub Pages
(`.github/workflows/deploy.yml`, also every six hours for fresh data). The home server's gateway
(nginx, `~/monitoring/gateway/default.conf` on korels-server) serves `uyarid.com` from that Pages
site and keeps copies for ten minutes, so a change is live on uyarid.com about ten minutes after
the push. Nothing has to be deployed on the server.

- `index.html`, `style.css`, `app.js` — the page.
- `data.json` — snapshot of repositories and latest releases, written by `scripts/build-data.mjs`.
  The page renders from it right away, then refreshes itself from the public GitHub API.
- `assets/` — app icons and screenshots.

A new repository shows up by itself. A repository with a GitHub Release that has files attached
gets a download card; add an entry to `APPS` in `app.js` to give it an icon, a screenshot and
nicer button labels.

```sh
node scripts/build-data.mjs > data.json   # refresh the snapshot
python3 -m http.server 4180               # preview at http://localhost:4180
```
