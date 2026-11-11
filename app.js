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
// Per app: a list of what there is to see, and the picture that goes with
// the chosen line. It goes through them once by itself, a few seconds each,
// unless someone takes over: pointing at it waits, choosing a line or
// pressing the button stops it.

const observers = "IntersectionObserver" in window;

// while a gallery is not on screen it waits
const viewing = observers
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) entry.target.classList.toggle("away", !entry.isIntersecting);
      },
      { threshold: 0.35 },
    )
  : null;

// the first time it comes into view it arrives (see "arriving" in style.css)
const arriving = observers
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          el.classList.add("in", "arriving");
          setTimeout(() => el.classList.remove("arriving"), 1600); // the window opens only this once
          arriving.unobserve(el);
        }
      },
      { threshold: 0.4 },
    )
  : null;
// Not during the opening: on a tall screen the first app is in view from the
// start, and two things arriving at once is one too many.
const opened = 1300;

function startGallery(el) {
  const slides = [...el.querySelectorAll(".slide")];
  const tabs = [...el.querySelectorAll(".feature")];
  const strip = el.querySelector(".features");
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
    // Pictures before the current one wait on one side, those after it on the
    // other, so a change always moves the way the list does.
    slides.forEach((slide, k) => {
      slide.classList.toggle("on", k === next);
      slide.classList.toggle("before", k < next);
    });
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
    // The line beside the current name has run to its end: next picture, and
    // after the last one back to the first, where it rests.
    tab.addEventListener("animationend", (e) => {
      if (e.animationName !== "fill" || !playing() || i !== current) return;
      if (current === slides.length - 1) setPlaying(false);
      show(current + 1);
    });
    tab.addEventListener("keydown", (e) => {
      const to = { ArrowDown: current + 1, ArrowRight: current + 1, ArrowUp: current - 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      setPlaying(false);
      show(to);
      tabs[current].focus();
    });
  });
  toggle?.addEventListener("click", () => setPlaying(!playing()));
  if (toggle) toggle.hidden = false;

  // It stops as soon as someone starts to operate it. (A pointer that merely
  // rests on the page does not stop it: it goes round only once anyway, and
  // the button is there.)
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
  if (arriving) setTimeout(() => arriving.observe(el), Math.max(0, opened - performance.now()));
  else el.classList.add("in");
  setPlaying(slides.length > 1 && !reduceMotion);
}

document.addEventListener("visibilitychange", () => {
  for (const el of document.querySelectorAll("[data-gallery]")) el.classList.toggle("hold", document.hidden);
});

// A download button says so when it has been pressed.
document.addEventListener("click", (e) => {
  const button = e.target instanceof Element ? e.target.closest(".buttons a.btn") : null;
  const label = button?.querySelector("span");
  if (!label || button.classList.contains("going")) return;
  const text = label.textContent;
  button.style.minWidth = `${button.offsetWidth}px`; // the shorter word must not shrink the button
  label.textContent = "Downloading…";
  button.classList.add("going");
  setTimeout(() => {
    label.textContent = text;
    button.classList.remove("going");
    button.style.minWidth = "";
  }, 2200);
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

const shelf = document.getElementById("shelf");
const appList = document.getElementById("app-list");
const repoList = document.getElementById("repo-list");
// What is on the page right now, as marks (see fingerprint in render.js). A
// page that came with its lists written in carries them as data-print.
const drawn = { shelf: shelf.dataset.print ?? "", apps: appList.dataset.print ?? "", repos: repoList.dataset.print ?? "" };
let started = false;

function startGalleries() {
  started = true;
  for (const el of appList.querySelectorAll("[data-gallery]")) startGallery(el);
}

// The page came with its apps written in: their pictures work at once, whatever
// happens to the data afterwards.
if (drawn.apps) startGalleries();
// boot.js waits for this before it lets anything start out of sight.
window.uyaridReady = true;

function render(data) {
  const html = renderLists(data, visitorOS());

  const onShelf = fingerprint(html.shelf);
  if (onShelf !== drawn.shelf) {
    drawn.shelf = onShelf;
    shelf.innerHTML = html.shelf;
  }

  // Fresh numbers usually say the same as what is there. Only what changed is
  // drawn again, so a picture someone is looking at is not reset under them.
  const apps = fingerprint(html.apps);
  if (apps !== drawn.apps) {
    drawn.apps = apps;
    appList.innerHTML = html.apps;
    started = false;
  }
  if (!started) startGalleries();

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

  // The snapshot the site was published with. It is asked for every time (a
  // small file from this site), because it is what says how old "old" is.
  let baked = null;
  try {
    baked = await (await fetch("data.json", { cache: "no-cache" })).json();
  } catch {
    /* first deploy: no snapshot yet */
  }

  // What this browser fetched from GitHub a few minutes ago saves asking
  // again, but only while it is newer than the snapshot. A copy from before
  // the site was last published would put an old version back on the page
  // right after a release.
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    const taken = cached && Array.isArray(cached.repos) ? new Date(cached.generated).getTime() : NaN;
    const young = Date.now() - taken < CACHE_MINUTES * 6e4;
    const current = !baked || taken >= new Date(baked.generated).getTime();
    if (young && current) {
      render((shown = cached));
      return;
    }
  } catch {
    /* no storage */
  }

  if (baked) render((shown = baked));

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
