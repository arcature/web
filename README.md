# Maestro marketing site

Astro + Tailwind CSS 4, with content managed in [Sanity](https://www.sanity.io).
Built from the
[Maestro for Mary](https://www.figma.com/design/LrBQkUzgYZ2Li4df1SQfU8/Maestro-for-Mary?node-id=1-357) Figma file.

## Develop

```bash
cp .env.example .env          # set PUBLIC_SANITY_PROJECT_ID=t88ezwbe
cp studio/.env.example studio/.env
npm install
npm install --prefix studio
npm run dev                   # site: http://localhost:4321
npm run studio                # Studio: http://localhost:3333
```

`npm run dev` shows published content. To try visual editing locally, add
`SANITY_PREVIEW=true` and a `SANITY_API_READ_TOKEN` to `.env`, restart, and open
**Presentation** in the local Studio.

After changing the schema (`studio/schemaTypes/`) or a query
(`src/lib/queries.ts`), run `npm run typegen` to regenerate
`src/sanity.types.ts`.

## Editing content

Content is edited in Sanity Studio at <https://maestro.sanity.studio>. Editors
sign in with a Sanity account; invite them under *sanity.io/manage → Members*.

- **Home page → Sections** is an ordered list of blocks. Drag to reorder, remove
  a block to hide it, and use **Add item** to insert any section type (you can
  add a section type more than once, e.g. several "Feature" rows).
- **Site settings** holds navigation, header buttons, and footer content.
- **Presentation** shows the page with your unpublished changes. Click any text
  to jump to its field. Changes reach the public site a few minutes after you
  **Publish**.

Headings are rendered in title case by CSS, so type them in sentence case.

| Block | Figma section |
| --- | --- |
| Hero | "Simplify everything behind the scenes" |
| Logo strip | Client logos |
| Intro with feature cards | "One platform. Every part of your organization." |
| Numbered accordion | "Built for the full patron lifecycle" |
| Split banner | "Leave the complexity behind" |
| Comparison | Legacy systems vs Maestro |
| Numbered grid | "One platform, built for every team" |
| Stats with bars | "How unified operations perform" |
| Statement with shaped image | "Built for the way…" |
| Feature (text + image) | The four alternating text/image rows |
| Call to action | "Your organization is ready…" |

## How it's built and deployed

`sst.config.ts` defines two stages on AWS, both deployed by
`.github/workflows/deploy.yml`:

| | Production | Preview |
| --- | --- | --- |
| Build | `npm run build`: every page prerendered with published content; Sanity images downloaded and optimized into `dist/client/_astro` | `SANITY_PREVIEW=true npm run build`: every page rendered on request |
| Hosting | S3 + CloudFront (static files only, no server) | Lambda (`lambda/server/handler.mjs`) behind CloudFront |
| Deploys | Push to `main`, and every **publish** in Sanity (webhook) | Push to `main` |
| Indexed | Until launch, blocked by **Site settings → Hide from search engines** | Never (`noindex`, `no-store`) |

The preview shows published content unless it's opened from Presentation, which
calls `/api/draft-mode/enable` with a short-lived secret. That sets a cookie that
switches the request to drafts, with click-to-edit overlays.

If a Sanity image can't be downloaded during a production build, Astro logs a
warning ("Unable to generate optimized image") but still finishes. Check the
build log if an image is missing on the site.

### One-time setup

1. **Sanity** (project `t88ezwbe`, dataset `production`). In *sanity.io/manage*:
   - *API → CORS origins*: add `http://localhost:4321` and the preview URL, with
     credentials allowed.
   - *API → Tokens*: create a **Viewer** token for the preview stage.
   - Set `SANITY_STUDIO_PREVIEW_URL` in `studio/.env` to the preview URL, then
     deploy the Studio with `npm run deploy --prefix studio`.
2. **GitHub.** Under *Settings → Environments*, create `production` and
   `preview`. Add repository variables `SANITY_PROJECT_ID`, `SANITY_DATASET`, and
   `SANITY_STUDIO_URL`, plus a `SITE_DOMAIN` per environment once the domains
   are chosen. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are reused.
3. **Preview secret.** Store the Viewer token for the preview stage:
   `npx sst secret set SanityReadToken <token> --stage preview`.
4. **Publish webhook.** In Sanity, *API → Webhooks → Create*:
   - URL: `https://api.github.com/repos/arcature/web/dispatches`, method `POST`
   - Filter: `_type in ["siteSettings", "homePage"]`; trigger on create, update,
     and delete (drafts off)
   - Projection: `{"event_type": "sanity-publish"}`
   - Headers: `Authorization: Bearer <token>` and
     `Accept: application/vnd.github+json`, where the token is a fine-grained
     GitHub token for `arcature/web` with *Contents: read and write*.

### Launching

Search engines are blocked until launch (`noindex` and `robots.txt`). To launch,
uncheck **Site settings → Hide from search engines** and publish.

## Notes

- **Font:** the design uses FT System (trial). Inter Tight stands in; change
  `--font-sans` in `src/styles/global.css` once a web license is in place.
- **Composite images** (UI mockups over photos) were exported flat from Figma.
  Shaped crops (hero, statement, footer) are SVG clip paths, so any photo can be
  swapped in the CMS without losing the shape.
- **Accessibility:** tag text is darkened from Figma's `#8f8f8f` to `#6b6b6b` to
  meet 4.5:1, and buttons are 44px tall (41px in Figma).
