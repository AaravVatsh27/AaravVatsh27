const fs = require("node:fs/promises");

const README_PATH = "README.md";
const START_MARKER = "<!--START_SECTION:recent-repos-->";
const END_MARKER = "<!--END_SECTION:recent-repos-->";
const USERNAME = process.env.GITHUB_REPOSITORY_OWNER || "AaravVatsh27";
const CURRENT_REPO = (process.env.GITHUB_REPOSITORY || `${USERNAME}/${USERNAME}`)
  .split("/")
  .pop()
  .toLowerCase();

async function fetchRepos() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "profile-readme-recent-repos",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const url = new URL(`https://api.github.com/users/${USERNAME}/repos`);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("type", "owner");

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function renderRepoCards(repos) {
  const selected = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .filter((repo) => repo.name.toLowerCase() !== CURRENT_REPO)
    .slice(0, 2);

  if (selected.length === 0) {
    return "<!-- No public repositories found yet. -->";
  }

  return selected
    .map((repo) => {
      const encodedName = encodeURIComponent(repo.name);
      return `<a href="${repo.html_url}">
  <img src="https://github-readme-stats.vercel.app/api/pin/?username=${USERNAME}&repo=${encodedName}&theme=tokyonight&hide_border=true&bg_color=0d1117&title_color=7F77DD&icon_color=0F6E56&text_color=c9d1d9" />
</a>`;
    })
    .join("\n&nbsp;\n");
}

async function main() {
  const readme = await fs.readFile(README_PATH, "utf8");
  const repos = await fetchRepos();
  const cards = renderRepoCards(repos);
  const replacement = `${START_MARKER}\n${cards}\n${END_MARKER}`;
  const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);

  if (!pattern.test(readme)) {
    throw new Error(`Could not find ${START_MARKER} block in ${README_PATH}`);
  }

  await fs.writeFile(README_PATH, readme.replace(pattern, replacement));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
