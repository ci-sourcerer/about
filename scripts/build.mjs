import { promises as fs } from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const COPY_TARGETS = [
  "index.html",
  "blog.html",
  "projects.html",
  "styles",
  "scripts/main.js",
  "scripts/blog-list.js",
  "scripts/projects-list.js",
  "data/profile.json",
  "data/blog-index.json",
  "data/projects.json",
  "posts",
  "content/blog",
  "docs/resume.md",
  "assets"
];

const copyTarget = async (target) => {
  const sourcePath = path.resolve(target);
  const destinationPath = path.join(DIST_DIR, target);

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
};

const ensureExists = async (target) => {
  try {
    await fs.access(path.resolve(target));
  } catch {
    throw new Error(`Missing required build input: ${target}`);
  }
};

const main = async () => {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });

  for (const target of COPY_TARGETS) {
    await ensureExists(target);
    await copyTarget(target);
  }

  console.log("Build complete. Static files are in dist/.");
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
