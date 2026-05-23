# ci-sourcerer Profile Site

This repository hosts a static profile website built with pure HTML, CSS, and JavaScript. Content is data-driven and blog entries are generated from markdown source files.

## Project structure

- `index.html` main page shell
- `styles/main.css` layout and visual system
- `scripts/main.js` runtime rendering of structured content
- `scripts/generate-blog.mjs` markdown front matter parser and blog index generator
- `scripts/build.mjs` static build output generator
- `scripts/serve.mjs` local static server
- `data/profile.json` profile, skills, projects, and contact metadata
- `data/blog-index.json` generated blog listing consumed by the UI
- `content/blog/` markdown blog source files
- `.github/workflows/deploy-pages.yml` GitHub Pages deployment workflow

## Content update workflow

1. Edit `data/profile.json` for profile, skills, projects, or contact changes.
2. Add a markdown file to `content/blog/` with front matter.
3. Run `npm run generate:blog` to rebuild `data/blog-index.json`.
4. Run `npm run dev` for local preview.
5. Run `npm run build` and `npm run preview` to validate production output.

## Blog draft and publish workflow

This workflow assumes `gh` is installed and already authenticated.

1. Run `npm run new-post` and provide a title (and optional slug).
2. The script creates `blog/<slug>`, opens `content/blog/<slug>.md` in `$EDITOR`, commits, pushes, and opens a draft PR to `main`.
3. After PR creation, the script can optionally run the publish script immediately.
4. Run `npm run publish-posts -- --pr <number>` to publish one PR.
5. Run `npm run publish-posts -- --all` to publish all open blog PRs.

Required blog front matter fields

- `title`
- `slug` (kebab-case)
- `date` (ISO-style date)
- `summary`

Optional blog front matter fields

- `tags` list
- `draft` boolean

## Commands

- `npm run generate:blog` generate `data/blog-index.json` from markdown source entries
- `npm run dev` generate blog index and serve repository root at `http://localhost:4173`
- `npm run build` generate blog index and build static output into `dist/`
- `npm run preview` serve built output from `dist/` at `http://localhost:4173`
- `npm run new-post` create a draft blog post branch, file, and draft PR
- `npm run publish-posts -- --pr <number>` merge one blog PR into `main`
- `npm run publish-posts -- --all` merge all open blog PRs into `main`

## Deployment

Deployment is configured for GitHub Pages through GitHub Actions and publishes `dist/` to the `gh-pages` branch.

1. In repository settings, set Pages source to `Deploy from a branch`.
2. Select branch `gh-pages` and folder `/ (root)`.
3. Set the custom domain to `ci-sourcerer.com` in the Pages settings.
4. Keep `Enforce HTTPS` enabled after DNS is configured.
5. Push changes to `main`.
6. The workflow builds and deploys static output from `dist/`.

## Pull request preview environments

Same-repository pull requests now receive a preview deployment under a subdirectory of the Pages site.

- Preview path format: `https://about.ci-sourcerer.com/previews/pr-<PR number>/`
- The same build output is deployed under `previews/pr-<number>/` on the `gh-pages` branch.
- The workflow preserves active preview directories when production deploys run from `main`.
- When a pull request is closed, its preview directory is removed automatically.
