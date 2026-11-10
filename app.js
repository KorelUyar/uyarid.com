// uyarid.com — what the page does: keeps the two lists up to date and runs
// the pictures of each app. What the lists say is in render.js.
//
// The page arrives complete (scripts/build-site.mjs writes the lists into
// index.html). Here it is compared with data.json and then with the GitHub
// API, and only redrawn where something changed.

const USER = "KorelUyar";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function visitorOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|android/.test(ua)) return "mobile";
  if (p.includes("mac")) return "mac";
  if (p.includes("win")) return "win";
  return "other";
}

// ------------------------------------------------------------------ gallery
// A row of named pictures per app. It goes through them once by itself, a
// few seconds each, unless someone takes over: pointing at it waits, choosing
// a picture or pressing the button stops it.

const viewing =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) entry.target.classList.toggle("away", !entry.isIntersecting);
        },
        { threshold: 0.35 },
      )
    : null;

function startGallery(el) {
  const slides = [...el.querySelectorAll(".slide")];
  const tabs = [...el.querySelectorAll(".tab")];
  const strip = el.querySelector(".tabs");
  const caption = el.querySelector(".caption");
  const toggle = el.querySelector(".playpause");
  const stage = el.querySelector(".stage");
  let current = 0;

  /** Gives the pictures of a slide their addresses, once. */
  const load = (i) => {
    const slide = slides[(i + slides.length) % slides.length];
    for (const node of slide.querySelectorAll("[data-srcset]")) {
      node.srcset = node.dataset.srcset;
      node.removeAttribute("data-srcset");
    }
    for (const node of slide.querySelectorAll("[data-src]")) {
      node.src = node.dataset.src;
      node.removeAttribute("data-src");
    }
  };

  const show = (i) => {
    const next = (i + slides.length) % slides.length;
    load(next);
    slides.forEach((slide, k) => slide.classList.toggle("on", k === next));
    tabs.forEach((tab, k) => {
      tab.setAttribute("aria-selected", String(k === next));
      tab.tabIndex = k === next ? 0 : -1;
    });
    caption.textContent = tabs[next].dataset.caption;
    current = next;
    // On narrow screens the names scroll sideways: keep the current one in sight
    // (only the strip moves, never the page).
    if (strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, tabs[next].offsetLeft - 24), behavior: reduceMotion ? "auto" : "smooth" });
    }
    load(next + 1); // so the following picture is there when its turn comes
  };

  const playing = () => el.classList.contains("playing");
  const setPlaying = (on) => {
    el.classList.toggle("playing", on);
    caption.setAttribute("aria-live", on ? "off" : "polite");
    toggle?.setAttribute("aria-label", on ? "Stop changing pictures" : "Change pictures automatically");
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      setPlaying(false);
      show(i);
    });
    // The line under the current name has run to its end: next picture, and
    // after the last one back to the first, where it rests.
    tab.addEventListener("animationend", () => {
      if (!playing() || i !== current) return;
      if (current === slides.length - 1) setPlaying(false);
      show(current + 1);
    });
    tab.addEventListener("keydown", (e) => {
      const to = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      setPlaying(false);
      show(to);
      tabs[current].focus();
    });
  });
  toggle?.addEventListener("click", () => setPlaying(!playing()));
  if (toggle) toggle.hidden = false;

  // waiting while someone looks closely, stopping when they start to operate it
  el.addEventListener("pointerenter", () => el.classList.add("hold"));
  el.addEventListener("pointerleave", () => el.classList.remove("hold"));
  el.addEventListener("focusin", (e) => {
    if (e.target !== toggle) setPlaying(false);
  });

  // swipe on touch screens (a swipe must not also count as a tap on the picture)
  let downX = null;
  let swiped = 0;
  stage.addEventListener("pointerdown", (e) => (downX = e.pointerType === "mouse" ? null : e.clientX));
  stage.addEventListener("pointerup", (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) < 40) return;
    swiped = Date.now();
    setPlaying(false);
    show(current + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener("click", (e) => {
    if (Date.now() - swiped < 500) {
      e.preventDefault();
      return;
    }
    // "Open at full size" opens the picture the visitor is looking at (light or dark).
    const link = e.target instanceof Element ? e.target.closest("a.zoom") : null;
    const shown = link?.querySelector("img")?.currentSrc;
    if (shown) link.href = shown;
    setPlaying(false);
  });

  show(0);
  if (viewing) viewing.observe(el);
  setPlaying(slides.length > 1 && !reduceMotion);
}

document.addEventListener("visibilitychange", () => {
  for (const el of document.querySelectorAll("[data-gallery]")) el.classList.toggle("hold", document.hidden);
});

document.addEventListener("click", async (e) => {
  const button = e.target instanceof Element ? e.target.closest("[data-copy]") : null;
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Select and copy";
  }
  setTimeout(() => (button.textContent = "Copy"), 1800);
});

// ------------------------------------------------------------------- render

const appList = document.getElementById("app-list");
const repoList = document.getElementById("repo-list");
// What is on the page right now, as marks (see fingerprint in render.js). A
// page that came with its lists written in carries them as data-print.
const drawn = { apps: appList.dataset.print ?? "", repos: repoList.dataset.print ?? "" };
let started = false;

function render(data) {
  const html = renderLists(data, visitorOS());

  // Fresh numbers usually say the same as what is there. Only what changed is
  // drawn again, so a picture someone is looking at is not reset under them.
  const apps = fingerprint(html.apps);
  if (apps !== drawn.apps) {
    drawn.apps = apps;
    appList.innerHTML = html.apps;
    started = false;
  }
  if (!started) {
    started = true;
    for (const el of appList.querySelectorAll("[data-gallery]")) startGallery(el);
  }

  const repos = fingerprint(html.repos);
  if (repos !== drawn.repos) {
    drawn.repos = repos;
    repoList.innerHTML = html.repos;
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
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
    if (!shown && !drawn.apps) {
      appList.innerHTML = `<p class="soon">Could not load the list. See <a href="https://github.com/${USER}">github.com/${USER}</a>.</p>`;
    }
    console.info("live refresh skipped:", error.message);
  }
}

main();
