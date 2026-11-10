// Screenshots of the whole page, top to bottom, to check a change by eye.
// Not part of the site. Needs Playwright from somewhere, for example:
//
//   python3 -m http.server 4180 &
//   NODE_PATH=~/code/roomy/node_modules node scripts/shots.cjs out/
//   options:  --url https://uyarid.com/   --dark   --mobile   --webkit   --reduce
//
// Calls to the GitHub API are blocked: the page then shows data.json, and
// repeated runs do not use up the hourly allowance for anonymous requests.

const pw = require("playwright");
const fs = require("node:fs");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => (flag(name) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const out = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--url") ?? "shots";
const url = opt("url", "http://127.0.0.1:4180/");
const mobile = flag("mobile");
const engine = flag("webkit") ? pw.webkit : pw.chromium;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await engine.launch();
  const height = mobile ? 844 : 900;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height } : { width: 1440, height },
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile,
    isMobile: mobile,
    colorScheme: flag("dark") ? "dark" : "light",
    reducedMotion: flag("reduce") ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  // WebKit reports Playwright's own screenshot helper as a refused inline style: not the page's fault.
  page.on("console", (m) => m.type() === "error" && !/Refused to apply a stylesheet|ERR_FAILED/.test(m.text()) && problems.push(m.text()));
  page.on("requestfailed", (r) => !r.url().includes("api.github.com") && problems.push(`failed: ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));
  await page.route("https://api.github.com/**", (route) => route.abort());

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  let n = 1;
  const snap = async () => {
    const file = `${out}/${String(n++).padStart(2, "0")}.png`;
    await page.screenshot({ path: file });
    console.log(file);
  };
  await snap();
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = height * 0.85; y < total - height * 0.2 && n < 14; y += height * 0.85) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(700);
    await snap();
  }
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(700);
  await snap();

  const state = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    widerThanScreen: document.documentElement.scrollWidth - innerWidth,
    picturesNotLoaded: [...document.querySelectorAll(".slide.on img")].filter((img) => !img.complete || img.naturalWidth === 0).length,
  }));
  console.log(JSON.stringify(state), "problems:", problems.length ? problems : "none");
  await browser.close();
})();
