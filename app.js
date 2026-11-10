// uyarid.com — every public repository of KorelUyar, and a download card for
// each one that publishes releases.
//
// The page renders from data.json first (written by scripts/build-data.mjs),
// then asks the GitHub API for fresh numbers and updates itself if it can.

const USER = "KorelUyar";

// Cloudflare keeps pictures for hours under their address. Raise this number
// whenever a file in assets/ is replaced, so visitors get the new one.
const ASSETS = "3";
const asset = (path) => `${path}?v=${ASSETS}`;

// Presentation for known apps. A repository that is not listed here still
// gets a card as soon as it has a release with downloadable files.
const APPS = {
  roomy: {
    name: "Roomy",
    tagline: "See what is on your disk. Delete what you don't need.",
    points: ["Every disk: apps, large files, folders and cleanup in one place", "Bloat Scanner: unwanted software, startup items, security check", "Everything goes to the Trash first"],
    icon: "assets/roomy.png",
    shot: "assets/roomy-shot.png",
    shotShape: "window",
    note: "macOS 12+ · Windows 10 and 11",
    downloads: [
      { os: "mac", label: "macOS", match: /\.dmg$/i },
      { os: "win", label: "Windows", match: /setup\.exe$/i },
    ],
  },
  tailbolt: {
    name: "Tailbolt",
    tagline: "AirDrop for your whole tailnet. Any size, any device.",
    points: ["Files and folders of any size", "To your own devices and other people's", "Fast path when both are on the same network"],
    icon: "assets/tailbolt.png",
    shot: "assets/tailbolt-shot.png",
    shotShape: "shot",
    note: "macOS 14+ · needs Tailscale",
    downloads: [{ os: "mac", label: "macOS", match: /\.zip$/i }],
  },
};

const LANG_COLOR = {
  Swift: "#f05138",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Rust: "#dea584",
  Python: "#3572a5",
  Java: "#b07219",
  "C#": "#178600",
  C: "#8a8f98",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#663399",
  Luau: "#00a2ff",
};

const ICON = {
  mac: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.33-3.54ZM14.2 6.15c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.24Z"/></svg>',
  win: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M3 5.1 10.5 4v7.5H3V5.1Zm8.5-1.25L21 2.5v9h-9.5V3.85ZM3 12.5h7.5V20L3 18.9v-6.4Zm8.5 0H21v9l-9.5-1.35V12.5Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
  out: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Links only ever go to https pages. Anything else becomes "#". */
const safeUrl = (u) => (/^https:\/\//i.test(String(u ?? "")) ? String(u) : "#");

function visitorOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|android/.test(ua)) return "mobile";
  if (p.includes("mac")) return "mac";
  if (p.includes("win")) return "win";
  return "other";
}

function size(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1e6;
  return mb >= 100 ? `${Math.round(mb)} MB` : mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
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

const date = (iso) => new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });

/** The download buttons of one app, the visitor's system first. */
function downloadsFor(repo, cfg, os) {
  const assets = repo.release?.assets ?? [];
  const out = [];
  if (cfg?.downloads) {
    for (const d of cfg.downloads) {
      const asset = assets.find((a) => d.match.test(a.name));
      if (asset) out.push({ os: d.os, label: d.label, asset });
    }
  } else {
    // Unknown app: guess the system from the file name.
    for (const asset of assets) {
      const n = asset.name.toLowerCase();
      if (/\.(sh|command|sig|txt|json|blockmap|yml)$/.test(n)) continue;
      const guess = /\.(dmg|pkg)$|mac|darwin/.test(n) ? "mac" : /\.(exe|msi)$|win/.test(n) ? "win" : "file";
      out.push({ os: guess, label: guess === "mac" ? "macOS" : guess === "win" ? "Windows" : asset.name, asset });
    }
  }
  return out.sort((a, b) => (b.os === os) - (a.os === os));
}

function appCard(repo, os, index) {
  const cfg = APPS[repo.name];
  const name = cfg?.name ?? repo.name;
  const downloads = downloadsFor(repo, cfg, os);
  const matches = downloads.some((d) => d.os === os);
  // Highlight the visitor's system; on other devices the first one.
  const lead = downloads.find((d, i) => (matches ? d.os === os : i === 0));
  const buttons = downloads
    .map((d) => {
      const primary = d === lead;
      return `<a class="btn magnet${primary ? " primary" : ""}" href="${esc(safeUrl(d.asset.url))}" rel="noopener">
        ${ICON[d.os] ?? ICON.file}<span>${primary ? "Download for " : ""}${esc(d.label)}</span>
        <small>${esc(size(d.asset.size))}</small></a>`;
    })
    .join("");
  const version = repo.release ? esc(repo.release.tag.replace(/^v/, "")) : "";
  const url = esc(safeUrl(repo.html_url));
  const systems = [...new Set(downloads.filter((d) => d.os !== "file").map((d) => d.label))].join(" + ");
  const stop = `Stop ${String(index + 1).padStart(2, "0")}${systems ? ` / ${systems}` : ""}`;

  // The stage: the app's window floating in front of a panel in its colour.
  const picture = cfg?.shot
    ? `<a class="app-window ${cfg.shotShape === "window" ? "window" : "shot"}" href="${url}" rel="noopener" tabindex="-1" aria-hidden="true"><img src="${esc(asset(cfg.shot))}" alt="" decoding="async"><span class="shine"></span></a>`
    : `<span class="app-big" aria-hidden="true">${esc(name[0].toUpperCase())}</span>`;
  const stage = `<div class="app-stage" data-tilt>
      <span class="app-grid"></span>
      <span class="app-glow"></span>
      ${picture}
      ${version ? `<span class="float f1" aria-hidden="true"><i></i>v${version}</span>` : ""}
      ${lead ? `<span class="float f2" aria-hidden="true">${esc(size(lead.asset.size))} download</span>` : ""}
    </div>`;

  return `<article class="app station" data-app="${esc(repo.name.toLowerCase())}" id="app-${esc(repo.name)}" data-reveal>
    ${stage}
    <div class="app-body">
      <p class="app-stop" data-decode>${esc(stop)}</p>
      <div class="app-title">
        ${cfg?.icon ? `<img class="app-icon" src="${esc(asset(cfg.icon))}" width="68" height="68" alt="">` : `<span class="app-icon letter">${esc(name[0].toUpperCase())}</span>`}
        <h3>${esc(name)}${version ? `<span class="chip">${version}</span>` : ""}</h3>
      </div>
      <p class="app-tagline">${esc(cfg?.tagline ?? repo.description ?? "")}</p>
      ${cfg?.points ? `<ul class="app-points">${cfg.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      <div class="app-actions">${buttons || `<span class="soon">First release is on its way</span>`}</div>
      <div class="app-meta">
        <span class="app-facts">
          ${cfg?.note ? `<span>${esc(cfg.note)}</span>` : ""}
          ${repo.release ? `<span>Released ${esc(date(repo.release.published_at))}</span>` : ""}
        </span>
        <a href="${url}" rel="noopener">Source ${ICON.out}</a>
      </div>
    </div>
  </article>`;
}

function repoCard(repo) {
  return `<a class="repo spot" href="${esc(safeUrl(repo.html_url))}" rel="noopener" data-reveal data-tilt>
    <span class="repo-top">
      <span class="repo-name">${esc(repo.name)}</span>
      ${repo.release ? `<span class="chip">${esc(repo.release.tag)}</span>` : ""}
      <span class="repo-arrow">${ICON.out}</span>
    </span>
    <span class="repo-desc">${esc(repo.description ?? "")}</span>
    <span class="repo-meta">
      ${repo.language ? `<span><i data-lang="${esc(repo.language)}"></i>${esc(repo.language)}</span>` : ""}
      ${repo.stars ? `<span>★ ${Number(repo.stars) || 0}</span>` : ""}
      <span class="ago">Updated ${esc(ago(repo.pushed_at))}</span>
    </span>
  </a>`;
}

// ------------------------------------------------------------------ render
// What moves lives in fx.js. If it did not start, nothing may stay hidden.

if (!window.uyaridFx) document.documentElement.classList.remove("js");

function render(data) {
  const os = visitorOS();
  const repos = data.repos.filter((r) => !r.fork && !r.archived);
  // Apps: known ones first (in the order above), then anything else with a release.
  const known = Object.keys(APPS)
    .map((name) => repos.find((r) => r.name === name))
    .filter(Boolean);
  const others = repos.filter((r) => !APPS[r.name] && (r.release?.assets ?? []).length > 0);
  const apps = [...known, ...others];

  const appList = document.getElementById("app-list");
  const repoList = document.getElementById("repo-list");
  // A refresh must not replay the entrance of what is already on screen.
  const seen = new Set([...document.querySelectorAll("[data-reveal].in[id], .repo.in")].map((el) => el.id || el.getAttribute("href")));

  appList.innerHTML = apps.map((r, i) => appCard(r, os, i)).join("");
  repoList.innerHTML = [...repos].sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).map(repoCard).join("");

  for (const el of document.querySelectorAll("#app-list [data-reveal], #repo-list [data-reveal]")) {
    if (seen.has(el.id || el.getAttribute("href"))) el.classList.add("in");
  }
  for (const dot of repoList.querySelectorAll("i[data-lang]")) {
    dot.style.background = LANG_COLOR[dot.dataset.lang] ?? "#8a919c";
  }
  // The light that glides over a window keeps to the window's own outline.
  for (const shine of appList.querySelectorAll(".app-window.window .shine")) {
    const src = shine.previousElementSibling?.getAttribute("src");
    if (!src) continue;
    shine.style.webkitMaskImage = shine.style.maskImage = `url("${src}")`;
    shine.style.webkitMaskSize = shine.style.maskSize = "100% 100%";
  }

  const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
  document.getElementById("eyebrow").textContent = `${plural(apps.length, "app")} · ${plural(repos.length, "repository", "repositories")} · open source`;
  // The stops on the route in the header carry the names of the apps.
  document.getElementById("stop-1").textContent = apps[0] ? (APPS[apps[0].name]?.name ?? apps[0].name) : "";
  document.getElementById("stop-2").textContent = apps[1] ? (APPS[apps[1].name]?.name ?? apps[1].name) : "";
  document.getElementById("year").textContent = String(new Date().getFullYear());
  if (data.generated) document.getElementById("updated").textContent = `Updated ${ago(data.generated)}`;

  document.dispatchEvent(new Event("uyarid:render"));
}

// --------------------------------------------------------------------- data

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

/** The newest published release, or null. (Listing avoids a 404 for repositories without one.) */
async function latestRelease(repo) {
  const list = (await gh(`/repos/${USER}/${encodeURIComponent(repo)}/releases?per_page=5`)) ?? [];
  return list.find((r) => !r.draft && !r.prerelease) ?? null;
}

/** Same shape as data.json, straight from the public GitHub API. */
async function live() {
  const list = await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`);
  const repos = await Promise.all(
    list
      .filter((r) => !r.private)
      .map(async (r) => {
        const rel = r.fork ? null : await latestRelease(r.name).catch(() => undefined);
        return {
          name: r.name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          pushed_at: r.pushed_at,
          html_url: r.html_url,
          fork: r.fork,
          archived: r.archived,
          release: rel
            ? {
                tag: rel.tag_name,
                published_at: rel.published_at,
                assets: rel.assets.map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })),
              }
            : rel === undefined
              ? undefined
              : null,
        };
      }),
  );
  return { generated: new Date().toISOString(), repos };
}

const CACHE_KEY = "uyarid.data.v2";
const CACHE_MINUTES = 15;

async function main() {
  let shown = null;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.repos) && Date.now() - new Date(cached.generated).getTime() < CACHE_MINUTES * 6e4) {
      render((shown = cached));
      return;
    }
  } catch {
    /* no storage */
  }

  try {
    const baked = await (await fetch("data.json", { cache: "no-cache" })).json();
    render((shown = baked));
  } catch {
    /* first deploy: no snapshot yet */
  }

  try {
    const fresh = await live();
    // A release lookup that failed keeps the value we already had.
    for (const repo of fresh.repos) {
      if (repo.release === undefined) repo.release = shown?.repos.find((r) => r.name === repo.name)?.release ?? null;
    }
    render(fresh);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    } catch {
      /* no storage */
    }
  } catch (error) {
    // Rate limited or offline: the snapshot is good enough.
    if (!shown) {
      document.getElementById("app-list").innerHTML = `<p class="soon">Could not load the list. See <a href="https://github.com/${USER}">github.com/${USER}</a>.</p>`;
    }
    console.info("live refresh skipped:", error.message);
  }
}

main();
