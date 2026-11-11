// uyarid.com — what the page says. Data in, HTML out: no document, no window.
//
// The browser uses it (app.js), and so does scripts/build-site.mjs, which
// writes the same HTML into index.html before the page goes online. That way
// the page is complete before any script has run, and for readers without one.

// Cloudflare keeps pictures for hours under their address. Raise this number
// whenever a file in assets/ is replaced, so visitors get the new one.
const ASSETS = "8";
const asset = (path) => `${path}?v=${ASSETS}`;

// How the known apps are presented. A repository that is not listed here
// still gets a download section as soon as it has a release with files.
//
// slides: the pictures of the app, one or two side by side per slide. Every
//   picture exists twice, <src>-light.webp and <src>-dark.webp (the page
//   follows the system). kind "window" means the picture brings its own
//   margin and shadow; without it the page adds a shadow.
// stage: "tall" gives upright pictures more room on phones.
// short, platforms: the two lines under the icon on the shelf at the top.
const APPS = {
  roomy: {
    name: "Roomy",
    tagline: "See how your computer is doing, what fills its disk, and what should not be on it.",
    short: "Check up and clean up your computer",
    platforms: "macOS and Windows",
    icon: "assets/roomy.png",
    requires: "macOS 12 or later, Windows 10 and 11",
    license: "MIT licence",
    downloads: [
      { os: "mac", label: "macOS", match: /\.dmg$/i },
      { os: "win", label: "Windows", match: /setup\.exe$/i },
    ],
    slides: [
      {
        label: "Health",
        caption: "How healthy your computer is, as one number out of 100, with every missing point named.",
        shots: [{ src: "assets/roomy/health", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Protection",
        caption: "One scan for malware and unwanted software, with the signatures your system already trusts.",
        shots: [{ src: "assets/roomy/protection", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Fix",
        caption: "One button fixes what the scan found. Every line says what will happen to it.",
        shots: [{ src: "assets/roomy/fix", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Storage",
        caption: "How much is free, what uses the rest, and where cleaning up pays off.",
        shots: [{ src: "assets/roomy/storage", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Cleanup",
        caption: "Caches, logs and old installers you can remove without missing them.",
        shots: [{ src: "assets/roomy/cleanup", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Delete",
        caption: "Tick what can go and carry on. Deleting runs in the background while a ring in the corner counts.",
        shots: [{ src: "assets/roomy/apps", w: 1890, h: 1289, kind: "window" }],
      },
      {
        label: "Bloat Scanner",
        caption: "Finds software nobody asked for and shows everything that starts by itself.",
        shots: [{ src: "assets/roomy/bloat", w: 1890, h: 1289, kind: "window" }],
      },
    ],
    install: [
      {
        title: "On a Mac",
        text: "Roomy is not notarised by Apple, so macOS asks before the first start. The easiest way is one line in Terminal. It downloads the latest version and puts it in Applications.",
        command: "curl -fsSL https://github.com/KorelUyar/roomy/releases/latest/download/install.sh | zsh",
        after: "With the .dmg instead: if macOS refuses to open Roomy, allow it under System Settings, Privacy & Security, Open Anyway.",
      },
      {
        title: "On Windows",
        text: "Windows shows “Windows protected your PC” because the installer is not signed. Choose More info, then Run anyway.",
      },
    ],
  },
  tailbolt: {
    name: "Tailbolt",
    tagline: "AirDrop for your whole tailnet. Any size, any device.",
    short: "Send files across your tailnet",
    platforms: "macOS",
    icon: "assets/tailbolt.png",
    requires: "macOS 14 or later, needs Tailscale",
    license: "MIT licence",
    stage: "tall",
    downloads: [{ os: "mac", label: "macOS", match: /\.zip$/i }],
    slides: [
      {
        label: "Send",
        caption: "Drop files on the shelf and pick a device, your own or someone else’s.",
        shots: [
          { src: "assets/tailbolt/send-1", w: 960, h: 1092 },
          { src: "assets/tailbolt/send-2", w: 960, h: 1092 },
        ],
      },
      {
        label: "Receive",
        caption: "What arrives asks first. Devices you trust can skip the question.",
        shots: [
          { src: "assets/tailbolt/receive-1", w: 1106, h: 1299 },
          { src: "assets/tailbolt/receive-2", w: 1106, h: 1299 },
        ],
      },
      {
        label: "Menu bar",
        caption: "Devices, transfers and history in the menu bar. The rest is in Settings.",
        shots: [
          { src: "assets/tailbolt/menu-1", w: 1080, h: 1500 },
          { src: "assets/tailbolt/menu-2", w: 1800, h: 2145, kind: "window" },
        ],
      },
      {
        label: "Shortcuts",
        caption: "Open the shelf or send straight away with a keyboard shortcut.",
        shots: [{ src: "assets/tailbolt/shortcuts", w: 2160, h: 1800 }],
      },
    ],
    install: [
      {
        title: "Before you start",
        text: "Tailbolt needs the Tailscale app, signed in, and Tailbolt on every Mac that should receive files.",
      },
      {
        title: "Installing",
        text: "One line in Terminal downloads the latest version, puts it in Applications and starts it.",
        command: "curl -fsSL https://raw.githubusercontent.com/KorelUyar/tailbolt/main/scripts/install.sh | zsh",
        after: "By hand: unzip the download and move Tailbolt to Applications. If macOS refuses to open it, allow it under System Settings, Privacy & Security, Open Anyway.",
      },
    ],
  },
};

const ICON = {
  mac: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.33-3.54ZM14.2 6.15c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.24Z"/></svg>',
  win: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M3 5.1 10.5 4v7.5H3V5.1Zm8.5-1.25L21 2.5v9h-9.5V3.85ZM3 12.5h7.5V20L3 18.9v-6.4Zm8.5 0H21v9l-9.5-1.35V12.5Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
  pause: '<svg class="pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg class="play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z"/></svg>',
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Links only ever go to https pages. Anything else becomes "#". */
const safeUrl = (u) => (/^https:\/\//i.test(String(u ?? "")) ? String(u) : "#");

/** Text typed on GitHub, with the apostrophes a typesetter would use. */
const tidy = (s) =>
  String(s ?? "")
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/\s+—\s+(\w)/g, (_, c) => `: ${c}`);

/** "4.8 MB", with a space that does not break the line. */
function size(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1e6;
  const text = mb >= 100 ? `${Math.round(mb)} MB` : mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  return text.replace(" ", " ");
}

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 1) return "today";
  if (days < 7) return rtf.format(-days, "day");
  if (days < 31) return rtf.format(-Math.floor(days / 7), "week");
  if (days < 365) return rtf.format(-Math.floor(days / 30.4), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

const date = (iso) => new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/** The download buttons of one app, the visitor's system first. */
function downloadsFor(repo, cfg, os) {
  const assets = repo.release?.assets ?? [];
  const out = [];
  if (cfg?.downloads) {
    for (const d of cfg.downloads) {
      const file = assets.find((a) => d.match.test(a.name));
      if (file) out.push({ os: d.os, label: d.label, asset: file });
    }
  } else {
    // Unknown app: guess the system from the file name.
    for (const file of assets) {
      const n = file.name.toLowerCase();
      if (/\.(sh|command|sig|txt|json|blockmap|yml)$/.test(n)) continue;
      const guess = /\.(dmg|pkg)$|mac|darwin/.test(n) ? "mac" : /\.(exe|msi)$|win/.test(n) ? "win" : "file";
      out.push({ os: guess, label: guess === "mac" ? "macOS" : guess === "win" ? "Windows" : file.name, asset: file });
    }
  }
  return out.sort((a, b) => (b.os === os) - (a.os === os));
}

/** One picture, in the system's light or dark look. A click opens it at full size. */
function picture(shot, alt, now) {
  const light = esc(asset(`${shot.src}-light.webp`));
  const dark = esc(asset(`${shot.src}-dark.webp`));
  // Pictures that are not on screen yet get their address later (data-*), so
  // a visitor only downloads what they look at.
  const at = now ? "" : "data-";
  return `<a class="zoom ${shot.kind === "window" ? "window" : "panel"}" href="${light}" target="_blank" rel="noopener" title="Open at full size"><picture><source media="(prefers-color-scheme: dark)" ${at}srcset="${dark}"><img ${at}src="${light}" width="${shot.w}" height="${shot.h}" alt="${esc(alt)}" decoding="async"></picture></a>`;
}

function gallery(cfg, id, foot) {
  if (!cfg?.slides?.length) return foot;
  const many = cfg.slides.length > 1;
  // The list of what there is to see: a name per picture, and under the one
  // that is showing, a sentence about it. (Screen readers get the sentence
  // with the picture, so it is not repeated in the name of the tab.)
  const features = cfg.slides
    .map(
      (slide, i) =>
        `<button class="feature" type="button" role="tab" id="${id}-tab-${i}" aria-controls="${id}-slide-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-caption="${esc(slide.caption)}"><span class="feature-name">${esc(slide.label)}</span><span class="feature-text" aria-hidden="true"><span>${esc(slide.caption)}</span></span><i></i></button>`,
    )
    .join("");
  const slides = cfg.slides
    .map((slide, i) => {
      const bleed = slide.shots.every((s) => s.kind === "window");
      const pictures = slide.shots
        .map((shot, k) => picture(shot, k === 0 ? `${cfg.name}, ${slide.label}: ${slide.caption}` : `${cfg.name}, ${slide.label}, second picture`, i === 0))
        .join("");
      return `<div class="slide${bleed ? " bleed" : ""}${i === 0 ? " on" : ""}" id="${id}-slide-${i}" role="tabpanel" aria-labelledby="${id}-tab-${i}"><div class="row">${pictures}</div></div>`;
    })
    .join("");
  return `<div class="gallery${cfg.stage === "tall" ? " tall" : ""}" data-gallery>
    <div class="features" role="tablist" aria-label="Pictures of ${esc(cfg.name)}">${features}</div>
    <div class="stage-wrap">
      <div class="stage">${slides}</div>
      ${many ? `<button class="playpause" type="button" aria-label="Change pictures automatically" hidden>${ICON.pause}${ICON.play}</button>` : ""}
    </div>
    <p class="caption" aria-live="off">${esc(cfg.slides[0].caption)}</p>
    ${foot}
  </div>`;
}

function installNotes(cfg) {
  if (!cfg?.install?.length) return "";
  const parts = cfg.install
    .map(
      (part) => `<div>
        <h3>${esc(part.title)}</h3>
        <p>${esc(part.text)}</p>
        ${part.command ? `<div class="cmd"><code>${esc(part.command)}</code><button class="copy" type="button" data-copy="${esc(part.command)}">Copy</button></div>` : ""}
        ${part.after ? `<p>${esc(part.after)}</p>` : ""}
      </div>`,
    )
    .join("");
  return `<details class="install"><summary>How to install</summary><div class="install-body">${parts}</div></details>`;
}

function appSection(repo, os) {
  const cfg = APPS[repo.name];
  const name = cfg?.name ?? repo.name;
  const id = `app-${repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
  const downloads = downloadsFor(repo, cfg, os);
  const matches = downloads.some((d) => d.os === os);
  // The visitor's system is the main button; on other devices the first one is.
  const lead = downloads.find((d, i) => (matches ? d.os === os : i === 0));
  const buttons = downloads
    .map((d) => {
      const primary = d === lead;
      return `<a class="btn${primary ? " primary" : ""}" href="${esc(safeUrl(d.asset.url))}" rel="noopener">
        ${ICON[d.os] ?? ICON.file}<span>${primary ? "Download for " : ""}${esc(d.label)}</span>
        <small>${esc(size(d.asset.size))}</small></a>`;
    })
    .join("");
  const version = repo.release ? esc(repo.release.tag.replace(/^v/, "")) : "";
  const url = esc(safeUrl(repo.html_url));

  const foot = `<p class="app-foot">
      ${repo.release ? `<span>Released ${esc(date(repo.release.published_at))}</span>` : ""}
      ${cfg?.license ? `<span>${esc(cfg.license)}</span>` : ""}
      <a href="${url}" rel="noopener">Source on GitHub</a>
      ${repo.release ? `<a href="${url}/releases" rel="noopener">All versions</a>` : ""}
    </p>`;

  return `<article class="app" data-app="${esc(repo.name.toLowerCase())}" id="${id}">
    <header class="app-head">
      ${cfg?.icon ? `<img class="app-icon" src="${esc(asset(cfg.icon))}" width="68" height="68" alt="">` : `<span class="app-icon letter" aria-hidden="true">${esc(name[0].toUpperCase())}</span>`}
      <div class="app-id">
        <h2 class="app-name">${esc(name)}${version ? ` <span class="version">${version}</span>` : ""}</h2>
        <p class="tagline">${esc(cfg?.tagline ?? tidy(repo.description))}</p>
      </div>
      <div class="app-get">
        <div class="buttons">${buttons || `<span class="soon">The first release is on its way.</span>`}</div>
        ${cfg?.requires ? `<p class="facts">${esc(cfg.requires)}</p>` : ""}
      </div>
      ${installNotes(cfg)}
    </header>
    ${gallery(cfg, id, foot)}
  </article>`;
}

/** An app on the shelf at the top of the page: its icon, its name, what it is for. A click goes to its section. */
function shelfItem(repo) {
  const cfg = APPS[repo.name];
  const name = cfg?.name ?? repo.name;
  const id = `app-${repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
  return `<a class="shelf-item" href="#${id}" data-app="${esc(repo.name.toLowerCase())}">
    ${cfg?.icon ? `<img class="shelf-icon" src="${esc(asset(cfg.icon))}" width="132" height="132" alt="">` : `<span class="shelf-icon letter" aria-hidden="true">${esc(name[0].toUpperCase())}</span>`}
    <span class="shelf-name">${esc(name)}</span>
    <span class="shelf-line">${esc(cfg?.short ?? tidy(repo.description))}</span>
    ${cfg?.platforms ? `<span class="shelf-os">${esc(cfg.platforms)}</span>` : ""}
  </a>`;
}

function repoRow(repo) {
  const stars = Number(repo.stars) || 0;
  return `<a class="repo" href="${esc(safeUrl(repo.html_url))}" rel="noopener">
    <span class="repo-name">${esc(repo.name)}${repo.release ? `<small>${esc(repo.release.tag)}</small>` : ""}</span>
    <span class="repo-desc">${esc(tidy(repo.description))}</span>
    <span class="repo-lang">${repo.language ? `<i data-lang="${esc(repo.language)}"></i>${esc(repo.language)}` : ""}</span>
    <span class="repo-when">${stars ? `${stars} ${stars === 1 ? "star" : "stars"}, ` : ""}${esc(ago(repo.pushed_at))}</span>
  </a>`;
}

/** A short mark of a text: tells whether what is on the page is what would be drawn again. */
function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** The lists of the page as HTML: the shelf, the apps (known ones first), and every repository. */
function renderLists(data, os) {
  const repos = (data.repos ?? []).filter((r) => !r.fork && !r.archived);
  const known = Object.keys(APPS)
    .map((name) => repos.find((r) => r.name === name))
    .filter(Boolean);
  const others = repos.filter((r) => !APPS[r.name] && (r.release?.assets ?? []).length > 0);
  const apps = [...known, ...others];
  return {
    shelf: apps.map(shelfItem).join(""),
    apps: apps.map((r) => appSection(r, os)).join(""),
    repos: [...repos].sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).map(repoRow).join(""),
  };
}
