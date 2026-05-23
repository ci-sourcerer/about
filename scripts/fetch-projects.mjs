import { promises as fs } from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve("data/featured-repos.json");
const OUTPUT_PATH = path.resolve("data/projects.json");

const fetchRepo = async (owner, name, token) => {
  const headers = {
    "User-Agent": "ci-sourcerer-profile-site",
    "Accept": "application/vnd.github+json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers });
  if (response.status === 404) {
    throw new Error(`Repository not found: ${owner}/${name}`);
  }
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${owner}/${name}`);
  }
  return response.json();
};

const formatTitle = (name, displayName) => {
  if (displayName) return displayName;
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const outputExists = async () => {
  try {
    await fs.access(OUTPUT_PATH);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  } catch {
    // If featured-repos.json is missing, generate empty projects.json
    config = { owner: "", repos: [] };
  }
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn("Warning: GITHUB_TOKEN not set. Using unauthenticated requests (60 req/hr limit).");
  }

  const projects = [];
  for (const entry of config.repos) {
    const repo = await fetchRepo(config.owner, entry.name, token);
    projects.push({
      title: formatTitle(entry.name, entry.displayName),
      summary: repo.description ?? "",
      tags: repo.topics ?? [],
      status: entry.status ?? null,
      url: repo.html_url,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    projects,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Generated ${OUTPUT_PATH} with ${projects.length} project(s).`);
};

main().catch(async (error) => {
  if (await outputExists()) {
    console.warn(`Warning: GitHub API fetch failed (${error.message}). Using cached data/projects.json.`);
    return;
  }
  console.error(`Error: GitHub API fetch failed and no cached data/projects.json exists. ${error.message}`);
  process.exitCode = 1;
});
