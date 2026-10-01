import { defineQuery } from 'groq';

// Images come back with the dimensions Astro needs to optimize them at build time.
const image = `{ "src": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }`;
const button = `{ label, href }`;

export const siteQuery =
  defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
  title,
  description,
  hideFromSearchEngines,
  "navigation": coalesce(navigation[]${button}, []),
  login${button},
  headerCta${button},
  footer{
    tagline,
    "image": image${image},
    "social": coalesce(social[]${button}, []),
    copyright,
    credit${button}
  }
}`);

// Lists fall back to [] so components can map over them even on half-finished drafts.
export const homeQuery =
  defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{
  "sections": coalesce(sections[]{
    _key,
    _type,
    _type == "hero" => { heading, body, cta${button}, "image": image${image}, imageAlt },
    _type == "logos" => { label, "logos": coalesce(logos[]{ _key, name, "image": image${image} }, []) },
    _type == "intro" => { eyebrow, body, cta${button}, "features": coalesce(features[]{ _key, title, body }, []) },
    _type == "lifecycle" => {
      heading,
      cta${button},
      "items": coalesce(items[]{ _key, title, "tags": coalesce(tags, []), lead, body, "image": image${image}, imageAlt }, [])
    },
    _type == "banner" => { heading, body, cta${button}, accent },
    _type == "comparison" => {
      "before": { "title": before.title, "items": coalesce(before.items, []) },
      "after": { "title": after.title, "items": coalesce(after.items, []) }
    },
    _type == "teams" => { heading, accent, "items": coalesce(items[]{ _key, title, body }, []) },
    _type == "stats" => { heading, body, cta${button}, "stats": coalesce(stats[]{ _key, label, value, bar }, []) },
    _type == "statement" => { lineOne, lineTwo, "image": image${image}, imageAlt },
    _type == "feature" => { heading, body, cta${button}, "image": image${image}, imageAlt, imageSide },
    _type == "cta" => { heading, body, cta${button} }
  }, [])
}`);
