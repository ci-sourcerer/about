import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";

const BLOG_DIR = path.resolve("content/blog");
const OUTPUT_PATH = path.resolve("data/blog-index.json");
const POSTS_DIR = path.resolve("posts");

const REQUIRED_FIELDS = ["title", "slug", "date", "summary"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const generatePostPage = (post, htmlContent) => {
  const tagHtml = post.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
  
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${post.summary}" />
    <title>${post.title} | ci-sourcerer</title>
    <link rel="stylesheet" href="../styles/main.css" />
  </head>
  <body>
    <header class="site-header" id="top">
      <nav class="nav container" aria-label="Primary">
        <a class="brand" href="/" style="text-decoration: none;">← ci-sourcerer</a>
      </nav>
    </header>

    <main>
      <article class="post-article section">
        <div class="container narrow">
          <header class="post-header">
            <h1>${post.title}</h1>
            <div class="meta-row" style="margin-bottom: var(--space-md);">
              <span>${post.date}</span>
            </div>
            <div class="tag-list" style="margin-bottom: var(--space-lg);">
              ${tagHtml}
            </div>
          </header>

          <div class="post-content">
            ${htmlContent}
          </div>

          <footer class="post-footer" style="margin-top: var(--space-xl); padding-top: var(--space-xl); border-top: 1px solid var(--border);">
            <p><a href="/blog.html">← Back to all posts</a></p>
          </footer>
        </div>
      </article>
    </main>

    <footer class="site-footer" style="margin-top: 0;">
      <div class="container">
        <p><small>© 2026 ci-sourcerer. All rights reserved.</small></p>
      </div>
    </footer>
  </body>
</html>
`;
};

const parseFrontMatter = (rawContent, filePath) => {
  if (!rawContent.startsWith("---\n")) {
    throw new Error(`${filePath}: missing front matter opening delimiter`);
  }

  const delimiter = "\n---\n";
  const closeIndex = rawContent.indexOf(delimiter, 4);
  if (closeIndex === -1) {
    throw new Error(`${filePath}: missing front matter closing delimiter`);
  }

  const frontMatterRaw = rawContent.slice(4, closeIndex).trim();
  const body = rawContent.slice(closeIndex + delimiter.length).trim();

  const frontMatter = {};
  for (const line of frontMatterRaw.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`${filePath}: invalid front matter line "${line}"`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1).trim();
      frontMatter[key] = inner
        ? inner.split(",").map((entry) => entry.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
        : [];
      continue;
    }

    if (rawValue === "true" || rawValue === "false") {
      frontMatter[key] = rawValue === "true";
      continue;
    }

    frontMatter[key] = rawValue.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  }

  return { frontMatter, body };
};

const validatePost = (post, filePath) => {
  for (const field of REQUIRED_FIELDS) {
    if (!post[field]) {
      throw new Error(`${filePath}: missing required field "${field}"`);
    }
  }

  if (!SLUG_PATTERN.test(post.slug)) {
    throw new Error(`${filePath}: slug must be kebab-case`);
  }

  if (Number.isNaN(Date.parse(post.date))) {
    throw new Error(`${filePath}: invalid date value "${post.date}"`);
  }

  if (!Array.isArray(post.tags)) {
    post.tags = [];
  }
};

const collectPosts = async () => {
  // Treat a missing blog source directory as an empty blog collection.
  await fs.mkdir(BLOG_DIR, { recursive: true });
  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  const posts = [];
  const slugs = new Set();

  // Ensure posts output directory exists
  await fs.mkdir(POSTS_DIR, { recursive: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const sourcePath = path.join(BLOG_DIR, entry.name);
    const rawContent = await fs.readFile(sourcePath, "utf8");
    const { frontMatter, body } = parseFrontMatter(rawContent, sourcePath);

    validatePost(frontMatter, sourcePath);

    if (frontMatter.draft === true) {
      continue;
    }

    if (slugs.has(frontMatter.slug)) {
      throw new Error(`${sourcePath}: duplicate slug "${frontMatter.slug}"`);
    }
    slugs.add(frontMatter.slug);

    const htmlContent = marked.parse(body);
    const postPage = generatePostPage(
      {
        title: frontMatter.title,
        summary: frontMatter.summary,
        date: frontMatter.date,
        tags: frontMatter.tags
      },
      htmlContent
    );

    // Write the generated post HTML file
    const postFilePath = path.join(POSTS_DIR, `${frontMatter.slug}.html`);
    await fs.writeFile(postFilePath, postPage, "utf8");

    posts.push({
      title: frontMatter.title,
      slug: frontMatter.slug,
      date: frontMatter.date,
      summary: frontMatter.summary,
      tags: frontMatter.tags,
      postUrl: `posts/${frontMatter.slug}.html`
    });
  }

  posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return posts;
};

const writeIndex = async (posts) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    posts
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const main = async () => {
  const posts = await collectPosts();
  await writeIndex(posts);
  console.log(`Generated ${OUTPUT_PATH} with ${posts.length} post(s).`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
