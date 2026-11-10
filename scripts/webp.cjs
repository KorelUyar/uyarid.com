// Turns PNG screenshots into WebP for assets/, keeping transparency.
// Not part of the site. It borrows the browser's own encoder through
// Playwright, because this Mac has no other WebP writer (sips only reads it,
// and the AVIF files sips writes show up blank in Chrome).
//
//   NODE_PATH=~/code/roomy/node_modules node scripts/webp.cjs [options] in.png out.webp [in2.png out2.webp …]
//
//   --quality 0.9        0…1 (default 0.9)
//   --trim               cut away the fully transparent border
//   --crop-height 1500   keep only the top so many pixels (after trimming)
//   --pad-height 1299    centre the picture on a transparent canvas this tall, so two
//                        pictures of different height can stand side by side at one scale
//   --round 36           round the corners by so many pixels (after cropping)
//   --background #fff    paint this colour behind the picture (default: keep transparency)

const pw = require("playwright");
const fs = require("node:fs");

const args = process.argv.slice(2);
const options = { quality: 0.9, trim: false, cropHeight: 0, padHeight: 0, round: 0, background: null };
const files = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--trim") options.trim = true;
  else if (a === "--quality") options.quality = Number(args[++i]);
  else if (a === "--crop-height") options.cropHeight = Number(args[++i]);
  else if (a === "--pad-height") options.padHeight = Number(args[++i]);
  else if (a === "--round") options.round = Number(args[++i]);
  else if (a === "--background") options.background = args[++i];
  else files.push(a);
}
if (files.length < 2 || files.length % 2) {
  console.error("usage: webp.cjs [--quality q] [--trim] [--crop-height px] [--pad-height px] [--round px] [--background colour] in.png out.webp [in.png out.webp …]");
  process.exit(1);
}

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  for (let i = 0; i < files.length; i += 2) {
    const data = "data:image/png;base64," + fs.readFileSync(files[i]).toString("base64");
    const result = await page.evaluate(
      async ({ data, o }) => {
        const img = new Image();
        img.src = data;
        await img.decode();
        let canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        // the part of a canvas given by x, y, w, h as a new canvas
        const part = (x, y, w, h) => {
          const next = document.createElement("canvas");
          next.width = w;
          next.height = h;
          next.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
          return next;
        };

        if (o.trim) {
          const { width, height } = canvas;
          const alpha = ctx.getImageData(0, 0, width, height).data;
          let left = width, right = -1, top = height, bottom = -1;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (alpha[(y * width + x) * 4 + 3] > 8) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
              }
            }
          }
          if (right >= left) canvas = part(left, top, right - left + 1, bottom - top + 1);
        }
        if (o.cropHeight && o.cropHeight < canvas.height) canvas = part(0, 0, canvas.width, o.cropHeight);

        if (o.padHeight > canvas.height) {
          const next = document.createElement("canvas");
          next.width = canvas.width;
          next.height = o.padHeight;
          next.getContext("2d").drawImage(canvas, 0, Math.round((o.padHeight - canvas.height) / 2));
          canvas = next;
        }

        if (o.round || o.background) {
          const next = document.createElement("canvas");
          next.width = canvas.width;
          next.height = canvas.height;
          const c = next.getContext("2d");
          if (o.round) {
            c.beginPath();
            c.roundRect(0, 0, next.width, next.height, o.round);
            c.clip();
          }
          if (o.background) {
            c.fillStyle = o.background;
            c.fillRect(0, 0, next.width, next.height);
          }
          c.drawImage(canvas, 0, 0);
          canvas = next;
        }
        return { url: canvas.toDataURL("image/webp", o.quality), width: canvas.width, height: canvas.height };
      },
      { data, o: options },
    );
    fs.writeFileSync(files[i + 1], Buffer.from(result.url.split(",")[1], "base64"));
    console.log(`${files[i + 1]}  ${result.width}x${result.height}  ${fs.statSync(files[i + 1]).size} bytes`);
  }
  await browser.close();
})();
