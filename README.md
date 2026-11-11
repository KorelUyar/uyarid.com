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
- `boot.js` — one line that runs before the first paint and tells the stylesheet that scripts
  work (only then may an app's pictures start out of sight, to arrive when scrolled to).
- `render.js` — what the page says: turns the data into the HTML of the shelf, the apps and the
  repository list. No document, no window, so it runs in the browser and in Node alike.
- `app.js` — what the page does: runs the pictures of each app, and redraws a list when fresh
  data says something else than what is there.
- `data.json` — snapshot of repositories and latest releases, written by `scripts/build-data.mjs`.
- `scripts/build-site.mjs` — puts the site together the way it goes online: it writes the lists
  into `index.html` with `render.js`. The page is complete before any script has run, and for
  readers without one.
- `assets/` — app icons, the pictures of each app (`assets/<app>/`) and the font.

A new repository shows up by itself. A repository with a GitHub Release that has files attached
gets a download section. An entry in `APPS` in `render.js` gives it an icon, a sentence, install
notes and its pictures; its colour goes into `style.css` (`.app[data-app="…"]`).

## The design

A download page with some air in it.

1. **The first screen** is only a sentence and a shelf with the apps: icon, name, what it is for.
2. **One section per app**: name, a sentence, the download buttons, how to install. Under it a
   list of what the app does next to the picture for the line that is chosen.
3. **The repositories** as a plain list.

Paper and ink, light or dark with the system. Each app brings one colour, taken from its icon:
the block its pictures stand on and its download button. The page itself has one small yellow dot
(the stop in the logo). Names and headlines are set in Parkinsans, text in Instrument Sans. The
pictures are real, flat screenshots in the light or dark look of the visitor's system.

**Motion** is there to be enjoyed, in three places and nowhere else:

- the opening: the headline comes up line by line and the apps land on the shelf, once;
- an app's pictures arriving the first time they are scrolled to: the list comes in line by line,
  the coloured block rises into place and the window opens on it;
- the picture changing with the list: the old one leaves and the new one comes in the direction
  the list runs, and the sentence under the chosen line opens. It does this by itself once
  round, six seconds a picture, then rests. Pointing waits, choosing or the pause button stops.

Besides that, things answer a hover: an icon on the shelf lifts and tilts, a button's icon hops,
the logo draws its lines again.

**Not here, on purpose:** gradients and glows, animated backgrounds, anything that follows the
pointer, anything tied to the scroll position, tickers, a headline with a changing word, tilted
screenshots, narrow (condensed) headline type. With "reduce motion" the page stands still, and
without scripts it is complete: nothing starts hidden unless `boot.js` and `app.js` are running.

## Pictures

A slide of an app is one picture or two side by side (`shots` in `APPS`); every picture exists as
`<name>-light.webp` and `<name>-dark.webp`.

- Roomy: made with Roomy's own `scripts/shots.mjs` (sample data), once in light and once with
  `--dark`, resized to 2000 px (`sips -Z 2000`) and trimmed (`--trim`), which also centres the
  window in its picture.
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
