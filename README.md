# Maestro marketing site

Astro + Tailwind CSS 4, with content managed in [Keystatic](https://keystatic.com)
(open source, git-based headless CMS). Built from the
[Maestro for Mary](https://www.figma.com/design/LrBQkUzgYZ2Li4df1SQfU8/Maestro-for-Mary?node-id=1-357) Figma file.

## Develop

```bash
npm install
npm run dev
```

- Site: http://localhost:4321
- CMS: http://localhost:4321/keystatic

## Editing content

All copy and images live in `src/content/*.yaml` and `src/assets/cms/`, and are
edited through the Keystatic admin:

- **Home page → Sections** is an ordered list of blocks. Drag to reorder, use the
  trash icon to remove, and **Add** to insert any section type (you can add a
  section type more than once, e.g. several "Feature" rows).
- **Site settings** holds navigation, header buttons, and footer content.

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

## Deploying

There are two deploy targets, built from the same code:

| | Public site | CMS admin |
| --- | --- | --- |
| Host | AWS S3 + CloudFront | Netlify |
| Build | `npm run build` (static `dist/`) | `npm run build` with `KEYSTATIC_ADMIN=true` (set in `netlify.toml`) |
| Deploys | On every push to `main` (`.github/workflows/static.yml`) | On every push to `main` (Netlify's GitHub integration) |

Editors sign in to the admin with their GitHub account; anyone with write access
to `arcature/web` can edit. Each save is a commit to `main`, which redeploys the
public site in a minute or two. The admin host redirects `/` to `/keystatic` and
is never indexed.

### One-time admin setup

1. **Create the Netlify site.** In Netlify, choose *Add new site → Import an
   existing project*, pick `arcature/web`, and keep the settings from
   `netlify.toml`. Note the site URL (e.g. `https://maestro-cms.netlify.app`).
2. **Create the Keystatic GitHub App.** Locally, run
   `PUBLIC_KEYSTATIC_STORAGE=github npm run dev`, open
   <http://127.0.0.1:4321/keystatic>, and follow the prompt to create a GitHub
   App. Create it under the **arcature** organization. Keystatic writes the
   credentials to `.env` (git-ignored).
3. **Point the app at Netlify.** In the GitHub App's settings, add the callback
   URL `https://<netlify-site>/api/keystatic/github/oauth/callback`, then install
   the app on `arcature/web` only.
4. **Copy the credentials to Netlify.** Add every variable from your `.env` (see
   `.env.example`) under *Site configuration → Environment variables*, then
   redeploy.
5. **Invite editors.** Give each editor write access to `arcature/web`. The first
   time they open the admin, they authorize the GitHub App.

### Launching

Search engines are blocked until launch (`noindex` and `robots.txt`). To launch,
uncheck **Site settings → Hide from search engines** in the CMS.

## Notes

- **Font:** the design uses FT System (trial). Inter Tight stands in; change
  `--font-sans` in `src/styles/global.css` once a web license is in place.
- **Composite images** (UI mockups over photos) were exported flat from Figma.
  Shaped crops (hero, statement, footer) are SVG clip paths, so any photo can be
  swapped in the CMS without losing the shape.
- **Accessibility:** tag text is darkened from Figma's `#8f8f8f` to `#6b6b6b` to
  meet 4.5:1, and buttons are 44px tall (41px in Figma).
