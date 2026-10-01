# Maestro marketing site

Astro + Tailwind CSS 4, with content managed in [Sanity](https://www.sanity.io).
Built from the
[Maestro for Mary](https://www.figma.com/design/LrBQkUzgYZ2Li4df1SQfU8/Maestro-for-Mary?node-id=1-357) Figma file.

## Develop

The repo is an npm workspace: the Astro site is in `frontend/` and the Sanity
Studio is in `studio/`, sharing one `package-lock.json`. Run these from the repo
root:

```bash
cp frontend/.env.example frontend/.env   # set PUBLIC_SANITY_PROJECT_ID=t88ezwbe
cp studio/.env.example studio/.env
npm install
npm run dev                   # site: http://localhost:4321, Studio: http://localhost:3333
```

Add a dependency to one package with `npm install <name> -w frontend` (or
`-w studio`).

`npm run dev` shows published content. To try visual editing locally, add
`SANITY_PREVIEW=true` and a `SANITY_API_READ_TOKEN` to `frontend/.env`, restart, and open
**Presentation** in the local Studio.

After changing the schema (`studio/schemaTypes/`) or a query
(`frontend/src/lib/queries.ts`), run `npm run typegen` to
regenerate `frontend/src/sanity.types.ts`.

## Editing content

Content is edited in Sanity Studio at <https://maestro.sanity.studio>. Editors
sign in with a Sanity account; invite them under _sanity.io/manage → Members_.

- **Home page → Sections** is an ordered list of blocks. Drag to reorder, remove
  a block to hide it, and use **Add item** to insert any section type (you can
  add a section type more than once, e.g. several "Feature" rows).
- **Site settings** holds navigation, header buttons, and footer content.
- **Presentation** shows the page with your unpublished changes. Click any text
  to jump to its field. Changes reach the public site a few minutes after you
  **Publish**.

Headings are rendered in title case by CSS, so type them in sentence case.

| Block                       | Figma section                                    |
| --------------------------- | ------------------------------------------------ |
| Hero                        | "Simplify everything behind the scenes"          |
| Logo strip                  | Client logos                                     |
| Intro with feature cards    | "One platform. Every part of your organization." |
| Numbered accordion          | "Built for the full patron lifecycle"            |
| Split banner                | "Leave the complexity behind"                    |
| Comparison                  | Legacy systems vs Maestro                        |
| Numbered grid               | "One platform, built for every team"             |
| Stats with bars             | "How unified operations perform"                 |
| Statement with shaped image | "Built for the way…"                             |
| Feature (text + image)      | The four alternating text/image rows             |
| Call to action              | "Your organization is ready…"                    |

## How it's built and deployed

`frontend/sst.config.ts` defines two stages on AWS. Each has a small workflow
(`qa.yml`, `production.yml`) that calls the shared `deploy.yml`:

|         | QA                                                                  | Production                                                                                                                                |
| ------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Branch  | `main`                                                              | `production`                                                                                                                              |
| Build   | `SANITY_PREVIEW=true npm run build`: every page rendered on request | `npm run build`: every page prerendered with published content; Sanity images downloaded and optimized into `frontend/dist/client/_astro` |
| Hosting | Lambda (`frontend/lambda/server/handler.mjs`) behind CloudFront     | S3 + CloudFront (static files only, no server)                                                                                            |
| Deploys | Push to `main`                                                      | Push to `production`, and every **publish** in Sanity (webhook)                                                                           |
| Indexed | Never (`noindex`, `no-store`)                                       | Until launch, blocked by **Site settings → Hide from search engines**                                                                     |

To release, merge `main` into `production`.

QA also serves as the draft preview for Presentation. It shows published content
unless it's opened from Presentation, which
calls `/api/draft-mode/enable` with a short-lived secret. That sets a cookie that
switches the request to drafts, with click-to-edit overlays.

If a Sanity image can't be downloaded during a production build, Astro logs a
warning ("Unable to generate optimized image") but still finishes. Check the
build log if an image is missing on the site.

### One-time setup

1. **Sanity** (project `t88ezwbe`, dataset `production`). In _sanity.io/manage_:
   - _API → CORS origins_: add `http://localhost:4321` and the QA URL, with
     credentials allowed.
   - _API → Tokens_: create a **Viewer** token for the QA stage.
   - Set `SANITY_STUDIO_PREVIEW_URL` in `studio/.env` to the QA URL, then
     deploy the Studio with `npm run deploy:studio`. After that, pushes to
     `main` that touch `studio/` deploy it (`deploy-studio.yml`).
   - _API → Tokens_: create a **Deploy Studio** token for GitHub Actions.
2. **GitHub.** Under _Settings → Environments_, create `qa` and
   `production`, then add (all workflows use these names):

   | Name                                            | Kind                                      | Value                                                  |
   | ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
   | `SANITY_PROJECT_ID`                             | Repository variable                       | `t88ezwbe`                                             |
   | `SANITY_DATASET`                                | Repository variable                       | `production`                                           |
   | `SANITY_STUDIO_URL`                             | Repository variable                       | `https://maestro.sanity.studio`                        |
   | `SANITY_STUDIO_PREVIEW_URL`                     | Repository variable                       | The QA URL                                             |
   | `SITE_DOMAIN`                                   | Environment variable (`qa`, `production`) | Each stage's domain, once chosen                       |
   | `SANITY_AUTH_TOKEN`                             | Repository secret                         | The Deploy Studio token                                |
   | `SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT` | Repository secret                         | `openssl rand -hex 64`, same value as in `studio/.env` |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`    | Repository secrets                        | Already set                                            |

3. **QA secret.** Store the Viewer token for the QA stage:
   `npx sst secret set SanityReadToken <token> --stage qa` (from `frontend/`).
4. **Publish webhook.** In Sanity, _API → Webhooks → Create_:
   - URL: `https://api.github.com/repos/arcature/web/dispatches`, method `POST`
   - Filter: `_type in ["siteSettings", "homePage"]`; trigger on create, update,
     and delete (drafts off)
   - Projection: `{"event_type": "sanity-publish"}`
   - Headers: `Authorization: Bearer <token>` and
     `Accept: application/vnd.github+json`, where the token is a fine-grained
     GitHub token for `arcature/web` with _Contents: read and write_.
5. **Deploy button (optional).** The Studio's **Deploy** tool can rebuild
   production on demand. Add a webhook there with the same URL and token as
   step 4; its GitHub event type defaults to `sanity-publish`. Set
   `SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT` first, so the token is stored
   encrypted.

### Launching

Search engines are blocked until launch (`noindex` and `robots.txt`). To launch,
uncheck **Site settings → Hide from search engines** and publish.

## Notes

- **Font:** the design uses FT System (trial). Inter Tight stands in; change
  `--font-sans` in `frontend/src/styles/global.css` once a web license is in place.
- **Composite images** (UI mockups over photos) were exported flat from Figma.
  Shaped crops (hero, statement, footer) are SVG clip paths, so any photo can be
  swapped in the CMS without losing the shape.
- **Accessibility:** tag text is darkened from Figma's `#8f8f8f` to `#6b6b6b` to
  meet 4.5:1, and buttons are 44px tall (41px in Figma).
