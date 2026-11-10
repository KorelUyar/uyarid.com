// Renders assets/og.jpg, the picture link previews show: the header of the
// page at 1200 x 630, with the changing word on "open source.".
//
//   python3 -m http.server 4180 &
//   NODE_PATH=~/code/roomy/node_modules node scripts/og.cjs /tmp/og.png
//   sips -s format jpeg -s formatOptions 86 /tmp/og.png --out assets/og.jpg
//
// The page forbids inline styles, so the browser is told to ignore the
// policy for this one render (bypassCSP).

const pw = require("playwright");

(async () => {
  const browser = await pw.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, bypassCSP: true });
  const page = await context.newPage();
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto(process.argv[3] ?? "http://127.0.0.1:4180/", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content:
      ".scroll-cue, .hero-actions, .cursor, .nav-links, .grain { display: none !important } .nav-pill { padding-right: 18px !important } .hero { padding: 84px 0 30px !important } .lede { margin-top: 26px !important }",
  });
  await page.waitForFunction(() => document.querySelector(".rot-word.on")?.textContent === "open source.", null, { timeout: 20000 });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: process.argv[2] ?? "og.png" });
  await browser.close();
})();
