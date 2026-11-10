// Puts the site together the way it goes online.
//
//   node scripts/build-site.mjs _site [version]
//
// Copies the page and its files into the folder and writes the two lists
// (apps, repositories) from data.json straight into index.html, using the
// same render.js the browser uses. The page is then complete before a script
// has run. `version` (the commit, on GitHub) is put into the addresses of the
// stylesheet and scripts, so nobody gets an old copy from a cache.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const [out, version = "dev"] = process.argv.slice(2);
if (!out) {
  console.error("usage: build-site.mjs <folder> [version]");
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// render.js is a plain browser script: run it in a room of its own and take the two functions out.
const room = vm.createContext({ Intl, Date });
vm.runInContext(read("render.js"), room, { filename: "render.js" });
const { renderLists, fingerprint } = room;

const data = JSON.parse(read("data.json"));
// "other" asks for no system in particular: the downloads come in their usual
// order, which is also what a visitor on a Mac gets.
const lists = renderLists(data, "other");

const fill = (html, id, marker, content) => {
  const empty = `id="${id}"><!--${marker}--></div>`;
  if (!html.includes(empty)) throw new Error(`index.html: no place for the ${marker}`);
  return html.replace(empty, `id="${id}" data-print="${fingerprint(content)}">${content}</div>`);
};

let page = read("index.html");
page = fill(page, "app-list", "apps", lists.apps);
page = fill(page, "repo-list", "repositories", lists.repos);
page = page.replaceAll("__V__", version);

// Nothing is cleared first: the folder is given from outside, and a script that
// empties whatever it is pointed at is one typo away from a bad day.
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), page);
for (const name of ["style.css", "render.js", "app.js", "data.json"]) fs.copyFileSync(path.join(root, name), path.join(out, name));
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive: true });

console.log(`${out}: ${data.repos.length} repositories, index.html ${Math.round(page.length / 1024)} KB`);
