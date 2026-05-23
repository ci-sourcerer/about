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
    // For data files, create defaults if missing; for others, fail.
    if (target.startsWith("data/")) {
      const fileName = path.basename(target);
      if (fileName === "blog-index.json") {
        const dataDir = path.resolve("data");
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          path.resolve(target),
          JSON.stringify({ generatedAt: new Date().toISOString(), postCount: 0, posts: [] }, null, 2) + "\n",
          "utf8"
        );
        return;
      }
      if (fileName === "projects.json") {
        const dataDir = path.resolve("data");
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          path.resolve(target),
          JSON.stringify({ generatedAt: new Date().toISOString(), projects: [] }, null, 2) + "\n",
          "utf8"
        );
        return;
      }
      if (fileName === "profile.json") {
        const dataDir = path.resolve("data");
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          path.resolve(target),
          JSON.stringify({
            name: "Developer",
            tagline: "Software developer",
            resumeUrl: "docs/resume.md",
            contactIntro: "Get in touch",
            about: ["A software developer focused on building reliable, well-tested applications and CI/CD pipelines."],
            skills: [],
            contactLinks: []
          }, null, 2) + "\n",
          "utf8"
        );
        return;
      }
    }
    throw new Error(`Missing required build input: ${target}`);
  }
};

const main = async () => {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });

  for (const target of COPY_TARGETS) {
    try {
      await fs.access(path.resolve(target));
    } catch {
      // For data files, create defaults if missing; for others, skip optional targets.
      if (target.startsWith("data/")) {
        await ensureExists(target);
      } else {
        continue; // Skip optional targets like assets if they don't exist
      }
    }
    await copyTarget(target);
  }

  console.log("Build complete. Static files are in dist/.");
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
