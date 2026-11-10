// uyarid.com — every public repository of KorelUyar, and a download card for
// each one that publishes releases.
//
// The page renders from data.json first (written by scripts/build-data.mjs),
// then asks the GitHub API for fresh numbers and updates itself if it can.

const USER = "KorelUyar";

// Presentation for known apps. A repository that is not listed here still
// gets a card as soon as it has a release with downloadable files.
const APPS = {
  roomy: {
    name: "Roomy",
    tagline: "See what is on your disk. Delete what you don't need.",
    icon: "assets/roomy.png",
    shot: "assets/roomy-shot.png",
    shotFit: "cover",
    note: "macOS 12+ · Windows 10 and 11",
    downloads: [
      { os: "mac", label: "macOS", match: /\.dmg$/i },
      { os: "win", label: "Windows", match: /setup\.exe$/i },
    ],
  },
  tailbolt: {
    name: "Tailbolt",
    tagline: "AirDrop for your whole tailnet. Any size, any device.",
    icon: "assets/tailbolt.png",
    shot: "assets/tailbolt-shot.png",
    shotFit: "contain",
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

const OS_ICON = {
  mac: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.33-3.54ZM14.2 6.15c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.24Z"/></svg>',
  win: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 5.1 10.5 4v7.5H3V5.1Zm8.5-1.25L21 2.5v9h-9.5V3.85ZM3 12.5h7.5V20L3 18.9v-6.4Zm8.5 0H21v9l-9.5-1.35V12.5Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

function appCard(repo, os) {
  const cfg = APPS[repo.name];
  const name = cfg?.name ?? repo.name;
  const downloads = downloadsFor(repo, cfg, os);
  const matches = downloads.some((d) => d.os === os);
  const buttons = downloads
    .map((d, i) => {
      // Highlight the visitor's system; on other devices the first one.
      const primary = matches ? d.os === os : i === 0;
      return `<a class="btn${primary ? " primary" : ""}" href="${esc(d.asset.url)}" rel="noopener">
        ${OS_ICON[d.os] ?? OS_ICON.file}<span>${primary ? "Download for " : ""}${esc(d.label)}</span>
        <small>${esc(size(d.asset.size))}</small></a>`;
    })
    .join("");
  const version = repo.release ? esc(repo.release.tag.replace(/^v/, "")) : "";
  return `<article class="app">
    ${cfg?.shot ? `<a class="shot ${cfg.shotFit ?? "cover"}" href="${esc(repo.html_url)}" rel="noopener" tabindex="-1" aria-hidden="true"><img src="${esc(cfg.shot)}" alt="" loading="lazy"></a>` : ""}
    <div class="app-body">
      <div class="app-head">
        ${cfg?.icon ? `<img class="app-icon" src="${esc(cfg.icon)}" width="52" height="52" alt="">` : `<span class="app-icon letter">${esc(name[0].toUpperCase())}</span>`}
        <div>
          <h3>${esc(name)} ${version ? `<span class="version">${version}</span>` : ""}</h3>
          <p>${esc(cfg?.tagline ?? repo.description ?? "")}</p>
        </div>
      </div>
      <div class="buttons">${buttons || `<span class="soon">First release is on its way</span>`}</div>
      <div class="app-meta">
        ${cfg?.note ? `<span>${esc(cfg.note)}</span>` : ""}
        ${repo.release ? `<span>Released ${esc(date(repo.release.published_at))}</span>` : ""}
        <a href="${esc(repo.html_url)}" rel="noopener">Source</a>
      </div>
    </div>
  </article>`;
}

function repoRow(repo) {
  const isApp = !!repo.release || !!APPS[repo.name];
  return `<a class="repo" href="${esc(repo.html_url)}" rel="noopener">
    <span class="repo-name">${esc(repo.name)}${isApp && repo.release ? `<em>${esc(repo.release.tag)}</em>` : ""}</span>
    <span class="repo-desc">${esc(repo.description ?? "")}</span>
    <span class="repo-meta">
      ${repo.language ? `<span><i style="background:${LANG_COLOR[repo.language] ?? "#8a919c"}"></i>${esc(repo.language)}</span>` : ""}
      ${repo.stars ? `<span>★ ${repo.stars}</span>` : ""}
      <span>${esc(ago(repo.pushed_at))}</span>
    </span>
  </a>`;
}

function render(data) {
  const os = visitorOS();
  const repos = data.repos.filter((r) => !r.fork && !r.archived);
  // Apps: known ones first (in the order above), then anything else with a release.
  const known = Object.keys(APPS)
    .map((name) => repos.find((r) => r.name === name))
    .filter(Boolean);
  const others = repos.filter((r) => !APPS[r.name] && (r.release?.assets ?? []).length > 0);
  const apps = [...known, ...others];

  document.getElementById("apps").innerHTML = apps.map((r) => appCard(r, os)).join("");
  document.getElementById("repos").innerHTML = [...repos].sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).map(repoRow).join("");
  document.getElementById("repo-count").textContent = repos.length;
  document.getElementById("year").textContent = new Date().getFullYear();
  if (data.generated) document.getElementById("updated").textContent = `Updated ${ago(data.generated)}`;
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

/** The newest published release, or null. (Listing avoids a 404 for repositories without one.) */
async function latestRelease(repo) {
  const list = (await gh(`/repos/${USER}/${repo}/releases?per_page=5`)) ?? [];
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

const CACHE_KEY = "uyarid.data.v1";
const CACHE_MINUTES = 15;

async function main() {
  let shown = null;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - new Date(cached.generated).getTime() < CACHE_MINUTES * 6e4) {
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
      document.getElementById("apps").innerHTML = `<p class="soon">Could not load the list. See <a href="https://github.com/${USER}">github.com/${USER}</a>.</p>`;
    }
    console.info("live refresh skipped:", error.message);
  }
}

main();
