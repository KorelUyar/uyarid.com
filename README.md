# uyarid.com

The public front page of [uyarid.com](https://uyarid.com): the apps of
[KorelUyar](https://github.com/KorelUyar) with their downloads and pictures, and every public
repository below.

Plain HTML, CSS and JavaScript. No dependencies.

**How it gets online:** a push to `main` publishes the page with GitHub Pages
(`.github/workflows/deploy.yml`, also every six hours for fresh data). uyarid.com is served from
that Pages site through a caching proxy, so a change is live about ten minutes after the push.

**What it loads:** only its own files and the public GitHub API. The font is served from
`assets/fonts/`, there are no trackers and no third-party scripts, and a Content-Security-Policy in
`index.html` enforces that.

- `index.html`, `style.css` — the page and its look.
- `render.js` — what the page says: turns the data into the HTML of the apps and the repository
  list. No document, no window, so it runs in the browser and in Node alike.
- `app.js` — what the page does: runs the pictures of each app, and redraws a list when fresh
  data says something else than what is there.
- `data.json` — snapshot of repositories and latest releases, written by `scripts/build-data.mjs`.
- `scripts/build-site.mjs` — puts the site together the way it goes online: it writes both lists
  into `index.html` with `render.js`. The page is complete before any script has run, and for
  readers without one.
- `assets/` — app icons, the pictures of each app (`assets/<app>/`) and the font.

A new repository shows up by itself. A repository with a GitHub Release that has files attached
gets a download section. An entry in `APPS` in `render.js` gives it an icon, a sentence, install
notes and its pictures; its colour goes into `style.css` (`.app[data-app="…"]`).

## The design, and what it deliberately leaves out

A download page: the apps first, each with its download buttons and a row of named pictures; then
the repositories as a plain list. Stone and charcoal, one typeface (Instrument Sans), light or
dark with the system. The colour on the page is each app's own, taken from its icon: the download
button and the line under the picture that is showing. The pictures are real, flat screenshots,
in the light or dark look of the visitor's system.

The only thing that moves by itself is the picture of an app: it changes every six seconds, with a
line under its name filling up, goes round once and rests on the first one. It waits while the
pointer is over it or it is off screen, and it stops as soon as someone picks a picture or presses
the pause button. With "reduce motion" it does not start.

Not here, on purpose: gradients and glows, animated backgrounds, anything that follows the
pointer, scroll effects, entrance animations, tickers, a hero with a changing word, tilted
screenshots.

## Pictures

A slide of an app is one picture or two side by side (`shots` in `APPS`); every picture exists as
`<name>-light.webp` and `<name>-dark.webp`.

- Roomy: made with Roomy's own `scripts/shots.mjs` (sample data), once in light and once with
  `--dark`, resized to 2000 px (`sips -Z 2000`).
- Tailbolt: made with its snapshot tool at three times the size and without the backdrop:
  `TAILBOLT_DEMO=1 TAILBOLT_SNAPSHOT_SCALE=3 TAILBOLT_SNAPSHOT_BACKDROP=clear Tailbolt --snapshot <dir> <files…>`
- `scripts/webp.cjs` converts them (`--trim` for panels without a backdrop, `--pad-height` so two
  pictures of different height share one scale, `--crop-height` and `--round` for the menu).
- Raise `ASSETS` in `render.js` whenever a picture is replaced, or visitors keep the old one.

## Working on it

```sh
node scripts/build-data.mjs > data.json     # refresh the snapshot
python3 -m http.server 4180                 # quick preview at http://localhost:4180 (lists drawn by script)
node scripts/build-site.mjs /tmp/site       # the site as it goes online; serve that folder to check it
```

Two optional helpers need [Playwright](https://playwright.dev) (not a dependency of the site):
`scripts/shots.cjs` takes screenshots of the whole page (`--dark`, `--mobile`, `--webkit`,
`--reduce`, `--url https://uyarid.com/` for the live page) and `scripts/webp.cjs` converts
pictures.
