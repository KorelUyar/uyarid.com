// Writes data.json: the public repositories of KorelUyar and their latest
// releases. Run by the deploy workflow (with GITHUB_TOKEN) and by hand:
//
//   node scripts/build-data.mjs > data.json

const USER = "KorelUyar";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "uyarid.com",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res.json();
}

const list = (await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`)).filter((r) => !r.private);
const repos = [];
for (const r of list) {
  const releases = r.fork ? [] : ((await gh(`/repos/${USER}/${r.name}/releases?per_page=5`)) ?? []);
  const rel = releases.find((x) => !x.draft && !x.prerelease) ?? null;
  repos.push({
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
      : null,
  });
}

process.stdout.write(JSON.stringify({ generated: new Date().toISOString(), repos }, null, 2) + "\n");
