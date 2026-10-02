# AGENTS.md

`CLAUDE.md` is a symlink to this file.

## Project overview

The Maestro marketing site for Arcature: a one-page Astro 7 site with content in
Sanity, deployed to AWS with SST. Production is fully static; QA renders on
request so it can double as the draft preview for Sanity's Presentation tool.

## Monorepo structure

An npm workspace with one `package-lock.json` at the root. Run commands from the
root.

| Workspace    | Path        | Purpose                                                            |
| ------------ | ----------- | ------------------------------------------------------------------ |
| **frontend** | `frontend/` | Astro site, its SST config and the QA Lambda wrapper (port 4321)   |
| **studio**   | `studio/`   | Sanity Studio v6, deployed to `arcature.sanity.studio` (port 3333) |

`studio/vendor/` holds the vendored `sanity-plugin-webhooks-trigger` tarball.

## Quick reference

```bash
npm run dev           # frontend + studio in parallel (run-p)
npm run dev:frontend  # site only
npm run dev:studio    # Studio only
npm run build         # build the frontend (production mode unless SANITY_PREVIEW=true)
npm run check         # astro check (frontend) + tsc --noEmit (studio)
npm run lint          # ESLint in both workspaces
npm run format:check  # Prettier
npm test              # Vitest (frontend unit tests)
npm run typegen       # regenerate frontend/src/sanity.types.ts from the schema + queries
npm run deploy:studio # deploy the Studio
```

## Before opening a PR

```bash
npm run lint && npm run format:check && npm run check && npm test && npm run build
```

`.github/workflows/pr-checks.yml` runs the same.

## Branches and deploys

| Branch       | Workflow         | SST stage    | What it is                                                  |
| ------------ | ---------------- | ------------ | ----------------------------------------------------------- |
| `main`       | `qa.yml`         | `qa`         | Pages render on request in a Lambda; Presentation's preview |
| `production` | `production.yml` | `production` | Fully prerendered; the same Lambda serves the files         |

Both call the reusable `deploy.yml` (build, then `npx sst deploy` from
`frontend/`), and both are the Astro Node entry point in a Lambda. Each stage
has its own CloudFront distribution (`sst.aws.Cdn`, no CloudFront Functions)
whose only origin is that Lambda's function URL, so every request, assets
included, goes to the Lambda; CloudFront caches what the Lambda allows. The
function URL uses IAM auth with origin access control: CloudFront signs each
request, and only that distribution may invoke the function, so the URL can't
be called directly. Custom domains come from the `SITE_DOMAIN` and
`SITE_CERT_ARN` GitHub environment variables (DNS outside AWS, `dns: false`);
set them there, not in the CloudFront console, which the next deploy would
undo. The same goes for an existing CloudFront Function on viewer requests:
its ARN comes from the `VIEWER_REQUEST_FUNCTION_ARN` environment variable (set
on `qa`), and SST only manages the association, never the function. A POST/PUT through CloudFront must then carry an
`x-amz-content-sha256` hash of its body; the site has no such requests yet. Only QA
gets `SANITY_PREVIEW` and the Sanity read token. Release by
merging `main` into `production`. Production also rebuilds on a
`repository_dispatch` of type `sanity-publish`, sent by the Studio's **Deploy**
tool (`sanity-plugin-webhooks-trigger`); QA reads content and redirects live, so
it doesn't. Sanity's own webhooks aren't used. `deploy-studio.yml` deploys the
Studio on pushes to `main` that touch `studio/`.

GitHub variable and secret names are listed in the README's one-time setup.
The QA stage's Sanity read token is the `qa` environment's
`SANITY_API_READ_TOKEN` secret: `deploy.yml` passes it to `sst deploy`, and
`sst.config.ts` sets it as the QA Lambda's environment variable (the QA deploy
fails without it). Production never gets it.

## Architecture

- **Content**: singleton documents `homePage`, `notFoundPage`, `siteSettings`,
  `mainNavigation` and `footerNavigation` (ID = type name; can't be created,
  duplicated or deleted), plus `redirect` documents. `sections` is an array of
  11 section object types, rendered by `frontend/src/components/Sections.astro`
  with a `switch` on `_type`. The Studio lists the home page, then a Site
  settings folder with the rest (`studio/sanity.config.ts`).
- **SEO and social**: `siteSettings` carries FK Kit's `seoFields` and
  `socialFields` (`studio/schemaTypes/seo.ts`; `noIndex` is the pre-launch
  "Hide from search engines" switch and also drives `robots.txt`) plus
  `socialProfiles` (platform + username). `frontend/src/lib/social.ts` turns
  those into the footer's links and the `twitter:site` handle; its platform list
  must match the one in `seo.ts`. `frontend/src/layouts/Seo.astro` renders `<title>`, meta,
  canonical, Open Graph and Twitter tags, merging optional page props over the
  site values and stripping stega. Absolute URLs come from Astro's `site`, set
  from `SITE_DOMAIN`; without it canonical, `og:url` and `og:image` are omitted.
  The social image is cropped to 1200 × 628 (`socialImageUrl` in `images.ts`).
- **Schema**: `studio/schemaTypes/`. Field helpers (`cta`, `accent`, `alt`,
  `linkList`, …) are in `fields.ts`; section types in `sections.ts`.
- **Queries and types**: GROQ in `frontend/src/lib/queries.ts` (`defineQuery`).
  Types come from Sanity TypeGen into `frontend/src/sanity.types.ts`. Never edit
  that file; run `npm run typegen` after changing the schema or a query.
  Queries `coalesce` lists to `[]` and components tolerate null fields, because
  drafts can be half-filled.
- **Data access**: `frontend/src/lib/content.ts` (`getSite`, `getHome`,
  `getNotFound`) uses the draft client when `showDrafts` is true (QA and local
  dev, given `SANITY_API_READ_TOKEN`), else the published client
  (`frontend/src/lib/sanity.ts`).
- **Rendering modes**: one codebase, two builds. `SANITY_PREVIEW=true` makes an
  inline integration in `frontend/astro.config.mjs` turn off prerendering for
  every route. Without it, everything is prerendered.
- **Drafts and Presentation**: there's no draft mode. QA builds always fetch
  drafts and always include `VisualEditing.astro` (`enableVisualEditing`,
  which does nothing outside Presentation), and are always `noindex` with a
  disallowing `robots.txt`. Stega is per request (`src/lib/stega.ts`, set on
  `Astro.locals` by the middleware): only when `Sec-Fetch-Dest: iframe` and the
  URL lacks the Preview tab's `?view=preview` (`shared/preview.ts`), because
  its invisible characters take letter spacing and shift headings. QA and dev
  responses send `Content-Security-Policy: frame-ancestors` for the Studio,
  `localhost:3333` and Sanity's dashboard (`sanity.io`, `*.sanity.io`, which
  can host the Studio in its own frame; every ancestor must be allowed), so
  nothing else can frame them. The overlay reloads the
  page on edits and syncs Presentation's address bar (history adapter).
- **Routes**: `shared/routes.ts` (a plain folder, imported by the Studio and the
  frontend) holds the one copy of where content lives: `fixedPages` (singleton
  pages pinned by ID) and `slugRoutes` (types with a page per slug).
  `studio/presentation/resolve.ts` generates Presentation's `mainDocuments`
  (URL → document) and `locations` (document → its page and the pages that
  reference it) from it. **To add a page**, add it there and add its Astro
  route; the Studio needs nothing else. Tests: `frontend/src/lib/routes.test.ts`.
- **Preview tab**: documents with a page (and the site-wide settings and
  navigation, which preview the home page) get a Preview tab beside the form
  (`studio/structure/PreviewView.tsx`, wired in by `documentViews.ts`). It
  frames the page from `SANITY_STUDIO_PREVIEW_URL` (QA, which always shows
  drafts), reloads 1.5 s after edits settle, and switches between desktop and
  mobile widths. Which page comes from `studio/presentation/previewPath.ts`,
  so new pages get the tab from `shared/routes.ts` alone. `VisualEditing.astro` is imported only in preview builds, so
  its CSS never reaches production. QA shows unpublished drafts to anyone who
  can reach it.
- **Stega**: values used as classes, conditions or URLs must not carry stega
  characters. The filter in `frontend/src/lib/sanity.ts` excludes `href`,
  `accent`, `imageSide`, `platform` and `username`; add any new key of that kind
  there.
- **Navigation and 404**: `mainNavigation`, `footerNavigation` and
  `notFoundPage` are singletons (as in FK Kit), fetched with `siteSettings` by
  `siteQuery`. `notFoundPage` has a title and the same sections as `homePage`,
  both rendered by `Sections.astro`, whose first hero (or else first call to
  action) gets the page's `<h1>`.
- **Redirects**: `redirect` documents (exact paths only), answered with a
  301/302 by `src/middleware.ts`. Production matches against
  `src/generated/redirects.json` (gitignored), which the `sanity-redirects`
  integration (`frontend/redirects.mjs`) builds from published content; QA and
  dev query Sanity on each request with the draft client (stega off). The
  query, validation and matching are shared in `src/lib/redirects.ts`.
  Prerendered pages are files
  the middleware never sees, so `src/pages/[...path].astro` renders unmatched
  paths on request: the middleware redirects, or the route returns 404 and
  Astro serves the prerendered 404 page.
- **Images**: `frontend/src/lib/images.ts` and `CmsImage.astro`. Prerendered
  pages download and optimize Sanity images into `dist/client/_astro` (allowed
  domain `cdn.sanity.io`), so production never loads from Sanity. On-request
  pages use Sanity CDN URLs instead. `ShapedImage.astro` crops images into the
  design's SVG shapes.
- **Hosting**: `@astrojs/node` (standalone) for both stages.
  `frontend/lambda/server/handler.mjs` wraps it with `serverless-http`; on QA it
  also sends `no-store` and `noindex`. Production makes no Sanity requests at
  runtime: pages and the 404 page are prerendered files. `npm run build` ends with
  `frontend/lambda/build.mjs`, which packages `frontend/.lambda/` (gitignored)
  and `sst.config.ts` deploys that folder as is (`bundle`), not bundled by SST.
  The adapter finds static files by walking up from its own file to a folder
  named `server` and looking for `../client`; SST's bundler flattens
  everything into `bundle.mjs`, which breaks that, so the package keeps
  `server/handler.mjs` beside `client/` (a copy of `dist/client`) with
  `index.mjs` re-exporting the handler at the root.

## Environment

- `frontend/.env` (see `.env.example`): `PUBLIC_SANITY_PROJECT_ID`,
  `PUBLIC_SANITY_DATASET`, `PUBLIC_SANITY_STUDIO_URL`, `SANITY_PREVIEW`,
  `SANITY_API_READ_TOKEN`. Declared in the `env.schema` of `astro.config.mjs`;
  read them through `astro:env`.
- `studio/.env` (see `.env.example`): `SANITY_STUDIO_*` plus `SANITY_AUTH_TOKEN`.
- Sanity project `t88ezwbe`, dataset `production`.
- `.env.github-vars` / `.env.github-secrets` (gitignored) hold the values for
  `gh variable set -f` / `gh secret set -f`.

## Testing

- **Vitest** for unit tests of the plain TypeScript in `frontend/src/lib`
  (`*.test.ts` beside the module), with its own `frontend/vitest.config.ts`
  rather than Astro's `getViteConfig`, so tests never load `astro.config.mjs`
  (which fetches redirects from Sanity).
- Logic that would otherwise sit in an Astro file or the middleware goes in
  `src/lib` so it can be tested: `redirects.ts` holds validation, matching and
  the redirect response; `src/middleware.ts` only decides where the rules come
  from. Rendering is covered by `npm run check` and `npm run build`.

## Code conventions

- **Node**: 24, pinned in `.nvmrc` (also the QA Lambda runtime in `sst.config.ts`;
  keep them in step).
- **TypeScript** throughout, strict.
- **ESLint** flat config per workspace: `typescript-eslint`, `eslint-plugin-astro`
  and `simple-import-sort` in `frontend/`; `@sanity/eslint-config-studio` and
  `simple-import-sort` in `studio/`.
- **Prettier**: single quotes, 2-space indentation, `prettier-plugin-astro`
  (`prettier.config.mjs`). No pre-commit hooks; CI enforces it.
- **Tailwind CSS 4** for styling. Headings are title-cased by CSS, so content is
  written in sentence case.

## Gotchas

- `astro-sst` doesn't build on Astro 7, which is why hosting uses the Node adapter
  and a hand-written Lambda wrapper. Don't switch to `sst.aws.Astro` unless a
  newer release supports Astro 7.
- `astro check` excludes `sst.config.ts`; its types only exist after
  `npx sst install` (run from `frontend/`).
- If a Sanity image fails to download during a production build, Astro only
  warns and ships a broken path. Check the build log.
- `sanity schema validate` warns that the intro's `feature` array members share a
  name with the `feature` section type. Renaming would affect stored content.

## Key files

| File                                 | What it does                                            |
| ------------------------------------ | ------------------------------------------------------- |
| `frontend/astro.config.mjs`          | Adapter, env schema, image domains, preview integration |
| `frontend/sst.config.ts`             | SST stages: static site (production), Lambda (QA)       |
| `frontend/lambda/server/handler.mjs` | QA Lambda entry                                         |
| `frontend/src/middleware.ts`         | Redirects: built list in production, live on QA and dev |
| `frontend/redirects.mjs`             | Builds production's redirect list from Sanity           |
| `frontend/src/lib/queries.ts`        | GROQ queries                                            |
| `frontend/src/lib/sanity.ts`         | Sanity clients, stega filter, `showDrafts`              |
| `frontend/src/lib/images.ts`         | Build-time vs CDN image URLs                            |
| `shared/routes.ts`                   | Route rules: fixed pages, slugged types, `documentPath` |
| `studio/presentation/resolve.ts`     | Presentation's URL ↔ document mapping, from the routes  |
| `studio/sanity.config.ts`            | Studio: singletons, Presentation, Deploy tool, Vision   |
| `studio/sanity.cli.ts`               | Studio host, deployment ID, TypeGen paths               |
| `.github/workflows/deploy.yml`       | Reusable build + SST deploy                             |
