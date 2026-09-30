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

`npm run build` prerenders every page to `dist/client`; only `/keystatic` and
`/api/keystatic` run on the Node server (`node dist/server/entry.mjs`). In
production, set the variables in `.env.example` so editors sign in with GitHub
and their changes are committed to the repo, which triggers a rebuild.

If editing will only happen locally, you can drop the adapter and deploy
`dist/` as a static site.

## Notes

- **Font:** the design uses FT System (trial). Inter Tight stands in; change
  `--font-sans` in `src/styles/global.css` once a web license is in place.
- **Composite images** (UI mockups over photos) were exported flat from Figma.
  Shaped crops (hero, statement, footer) are SVG clip paths, so any photo can be
  swapped in the CMS without losing the shape.
- **Accessibility:** tag text is darkened from Figma's `#8f8f8f` to `#6b6b6b` to
  meet 4.5:1, and buttons are 44px tall (41px in Figma).
