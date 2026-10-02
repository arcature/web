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

`npm run dev` always shows draft content, so unpublished changes appear on
refresh. It reads them with `SANITY_API_READ_TOKEN` in `frontend/.env` (a
Viewer token); without one it falls back to published content. To try visual
editing locally, also add `SANITY_PREVIEW=true`, restart, and open
**Presentation** in the local Studio.

After changing the schema (`studio/schemaTypes/`) or a query
(`frontend/src/lib/queries.ts`), run `npm run typegen` to
regenerate `frontend/src/sanity.types.ts`.

## Editing content

Content is edited in Sanity Studio at <https://arcature.sanity.studio>. Editors
sign in with a Sanity account; invite them under _sanity.io/manage → Members_.

- **Home page → Sections** is an ordered list of blocks. Drag to reorder, remove
  a block to hide it, and use **Add item** to insert any section type (you can
  add a section type more than once, e.g. several "Feature" rows).
- **Site settings** is a folder of everything site-wide:
  - **Site settings**: the site title, the page title, description, keywords
    and indexing switch (**SEO**), and the sharing title, description and image
    plus the social profiles (**Social**). Each profile is a platform and
    username; the footer links to them in that order, and a profile with no
    username is left out.
  - **Main navigation**: the header links and its two buttons.
  - **Footer navigation**: the tagline, background image, footer links,
    copyright line and credit.
  - **404 page**: its title and sections, built like the home page.
  - **Redirects**: from an old path to a path or full URL, permanent (301) or
    temporary (302). QA tries them straight away, even unpublished; the live
    site picks them up once they're published and deployed.
- **Presentation** shows the page with your unpublished changes. Click any text
  to jump to its field.
- **Deploy** rebuilds the site with what's published. **Publish** your changes,
  then press the button there; they reach the public site a few minutes later.

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
| Hosting | Lambda (`frontend/lambda/server/handler.mjs`) behind CloudFront     | The same Lambda, mostly serving the prerendered files; no Sanity requests                                                                 |
| Deploys | Push to `main`                                                      | Push to `production`, and the Studio's **Deploy** tool                                                                                    |
| Indexed | Never (`noindex`, `no-store`)                                       | Until launch, blocked by **Site settings → SEO → Hide from search engines**                                                               |

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
2. **AWS** (us-east-1).
   - **Deploy credentials.** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
     belong to an IAM user that SST deploys as. It needs to create and update
     Lambda functions and their URL permissions, IAM roles for them, CloudFront
     distributions, cache policies and origin access controls, and the S3
     bucket and SSM parameters SST keeps its state in. Keys that could only
     sync to S3 won't be enough.
   - **Certificates.** For each stage's domain, request a public certificate in
     _ACM_, in **us-east-1** (CloudFront only uses certificates from there), and
     add the validation CNAME it shows at your DNS provider. Its ARN goes in
     `SITE_CERT_ARN`.
   - **DNS.** After the stage's first deploy with its domain, point the domain
     at the distribution's `*.cloudfront.net` address (CNAME, or ALIAS/ANAME
     for an apex domain). SST doesn't manage DNS (`dns: false`).
3. **GitHub.** Under _Settings → Environments_, create `qa` and
   `production`, then add (all workflows use these names):

   | Name                                            | Kind                                      | Value                                                                      |
   | ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
   | `SANITY_PROJECT_ID`                             | Repository variable                       | `t88ezwbe`                                                                 |
   | `SANITY_DATASET`                                | Repository variable                       | `production`                                                               |
   | `SANITY_STUDIO_URL`                             | Repository variable                       | `https://arcature.sanity.studio`                                           |
   | `SANITY_STUDIO_PREVIEW_URL`                     | Repository variable                       | The QA URL                                                                 |
   | `SITE_CERT_ARN`                                 | Environment variable (`qa`, `production`) | ARN of the ACM certificate (us-east-1) for that domain                     |
   | `SITE_DOMAIN`                                   | Environment variable (`qa`, `production`) | Each stage's domain, once chosen                                           |
   | `VIEWER_REQUEST_FUNCTION_ARN`                   | Environment variable (`qa`)               | Optional: ARN of an existing CloudFront Function to run on viewer requests |
   | `SANITY_API_READ_TOKEN`                         | Environment secret (`qa` only)            | The QA Viewer token; `gh secret set SANITY_API_READ_TOKEN --env qa`        |
   | `SANITY_AUTH_TOKEN`                             | Repository secret                         | The Deploy Studio token                                                    |
   | `SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT` | Repository secret                         | `openssl rand -hex 64`, same value as in `studio/.env`                     |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`    | Repository secrets                        | Already set; check the permissions in step 2                               |

4. **Deploy button.** Content reaches the sites when an editor presses the
   button in the Studio's **Deploy** tool (`sanity-plugin-webhooks-trigger`).
   With `SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT` set, so the token is
   stored encrypted, add a webhook there:
   - URL: `https://api.github.com/repos/arcature/web/dispatches`, method `POST`
   - Auth token: a fine-grained GitHub token for `arcature/web` with
     _Contents: read and write_
   - GitHub event type: `sanity-publish` (the default), which deploys production

### Launching

Search engines are blocked until launch (`noindex` and `robots.txt`). To launch,
uncheck **Site settings → SEO → Hide from search engines**, publish, and deploy
from the **Deploy** tool.

## Notes

- **Font:** the design uses FT System (trial). Inter Tight stands in; change
  `--font-sans` in `frontend/src/styles/global.css` once a web license is in place.
- **Composite images** (UI mockups over photos) were exported flat from Figma.
  Shaped crops (hero, statement, footer) are SVG clip paths, so any photo can be
  swapped in the CMS without losing the shape.
- **Accessibility:** tag text is darkened from Figma's `#8f8f8f` to `#6b6b6b` to
  meet 4.5:1, and buttons are 44px tall (41px in Figma).
