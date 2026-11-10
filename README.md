# uyarid.com

The public front page of [uyarid.com](https://uyarid.com): every public repository of
[KorelUyar](https://github.com/KorelUyar), and a download card for each app that publishes releases.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

**How it gets online:** a push to `main` publishes the page with GitHub Pages
(`.github/workflows/deploy.yml`, also every six hours for fresh data). uyarid.com is served from
that Pages site through a caching proxy, so a change is live about ten minutes after the push.

**What it loads:** only its own files and the public GitHub API. Fonts are served from
`assets/fonts/`, there are no trackers and no third-party scripts, and a Content-Security-Policy in
`index.html` enforces that.

- `index.html`, `style.css`, `app.js`, `boot.js` — the page. `app.js` fetches and draws the lists.
- `fx.js` — everything that moves: the light behind the page (a small WebGL shader with a plain
  gradient fallback), the trains on the network, tilt and pointer light, the line you ride down
  while scrolling. The page is complete without it, and stands still for visitors who ask for
  reduced motion.
- `data.json` — snapshot of repositories and latest releases, written by `scripts/build-data.mjs`.
  The page renders from it right away, then refreshes itself from the public GitHub API.
- `assets/` — app icons, screenshots, fonts and the film-grain tile.

A new repository shows up by itself. A repository with a GitHub Release that has files attached
gets a download card; add an entry to `APPS` in `app.js` to give it an icon, a screenshot and
nicer button labels, and a colour pair for it in `style.css` (`.app[data-app="…"]`).

The design: the logo is two lines of a transit map, so the page is one. A network in the header
(every app is a stop on the main line), a line beside the content with a train that follows the
scroll position, and each app as a stop with its window floating in front of a panel.

```sh
node scripts/build-data.mjs > data.json   # refresh the snapshot
python3 -m http.server 4180               # preview at http://localhost:4180
```
