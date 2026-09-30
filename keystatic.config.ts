import { config, fields, singleton } from '@keystatic/core';

// Keystatic names uploaded files after their position in the content
// (e.g. sections/0/value/image.jpg), so each singleton gets its own folder.
const imageField = (folder: string) => (label: string, description?: string) =>
  fields.image({
    label,
    description,
    directory: `src/assets/cms/${folder}`,
    publicPath: `/src/assets/cms/${folder}/`,
  });

const image = imageField('home');
const siteImage = imageField('site');

const alt = (label = 'Image alt text') =>
  fields.text({
    label,
    description: 'Describe the image for screen reader users. Leave empty only if the image is purely decorative.',
  });

const cta = (defaultLabel = 'Request demo') =>
  fields.object(
    {
      label: fields.text({ label: 'Button label', defaultValue: defaultLabel }),
      href: fields.text({ label: 'Button link', defaultValue: '#demo' }),
    },
    { label: 'Button' },
  );

const accent = (defaultValue: 'red' | 'blue' | 'olive' | 'ink') =>
  fields.select({
    label: 'Accent color',
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Blue', value: 'blue' },
      { label: 'Olive', value: 'olive' },
      { label: 'Black', value: 'ink' },
    ],
    defaultValue,
  });

const link = fields.object({
  label: fields.text({ label: 'Label', validation: { isRequired: true } }),
  href: fields.text({ label: 'Link', defaultValue: '#' }),
});

const linkList = (label: string) =>
  fields.array(link, { label, itemLabel: (props) => props.fields.label.value });

const multiline = (label: string, description?: string) =>
  fields.text({ label, description, multiline: true });

export default config({
  // The hosted admin (Netlify) commits to GitHub; `npm run dev` edits local files.
  storage:
    import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github'
      ? { kind: 'github', repo: { owner: 'arcature', name: 'web' } }
      : { kind: 'local' },

  ui: {
    brand: { name: 'Maestro' },
    navigation: ['home', 'site'],
  },

  singletons: {
    site: singleton({
      label: 'Site settings',
      path: 'src/content/site',
      format: { data: 'yaml' },
      schema: {
        title: fields.text({ label: 'Site title', defaultValue: 'Maestro' }),
        description: multiline('Meta description'),
        hideFromSearchEngines: fields.checkbox({
          label: 'Hide from search engines',
          description: 'Keep checked until launch. Unchecking lets Google and others index the site.',
          defaultValue: true,
        }),
        navigation: linkList('Main navigation'),
        login: fields.object(
          {
            label: fields.text({ label: 'Label', defaultValue: 'Log in' }),
            href: fields.text({ label: 'Link', defaultValue: '#' }),
          },
          { label: 'Log in button' },
        ),
        headerCta: cta(),
        footer: fields.object(
          {
            tagline: fields.text({ label: 'Tagline' }),
            image: siteImage('Background image', 'Shown inside the mountain shape behind the tagline.'),
            social: linkList('Social links'),
            copyright: fields.text({ label: 'Copyright line' }),
            credit: fields.object(
              {
                label: fields.text({ label: 'Label' }),
                href: fields.text({ label: 'Link' }),
              },
              { label: 'Credit' },
            ),
          },
          { label: 'Footer' },
        ),
      },
    }),

    home: singleton({
      label: 'Home page',
      path: 'src/content/home',
      format: { data: 'yaml' },
      schema: {
        sections: fields.blocks(
          {
            hero: {
              label: 'Hero',
              itemLabel: (props) => `Hero — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: multiline('Body'),
                cta: cta(),
                image: image('Image', 'Cropped into the stepped shape on the right.'),
                imageAlt: alt(),
              }),
            },

            logos: {
              label: 'Logo strip',
              itemLabel: (props) => `Logo strip (${props.fields.logos.elements.length})`,
              schema: fields.object({
                label: fields.text({
                  label: 'Accessible label',
                  description: 'Read by screen readers only.',
                  defaultValue: 'Trusted by',
                }),
                logos: fields.array(
                  fields.object({
                    name: fields.text({ label: 'Organization name (alt text)', validation: { isRequired: true } }),
                    image: image('Logo'),
                  }),
                  { label: 'Logos', itemLabel: (props) => props.fields.name.value },
                ),
              }),
            },

            intro: {
              label: 'Intro with feature cards',
              itemLabel: (props) => `Intro — ${props.fields.eyebrow.value}`,
              schema: fields.object({
                eyebrow: multiline('Label'),
                body: multiline('Statement'),
                cta: cta('Explore features'),
                features: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: multiline('Body'),
                  }),
                  { label: 'Feature cards', itemLabel: (props) => props.fields.title.value },
                ),
              }),
            },

            lifecycle: {
              label: 'Numbered accordion',
              itemLabel: (props) => `Accordion — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                cta: cta(),
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    tags: fields.array(fields.text({ label: 'Tag' }), {
                      label: 'Tags',
                      itemLabel: (props) => props.value,
                    }),
                    lead: fields.text({ label: 'Lead sentence' }),
                    body: multiline('Body'),
                    image: image('Image', 'Optional. Falls back to the first item’s image.'),
                    imageAlt: alt(),
                  }),
                  { label: 'Items', itemLabel: (props) => props.fields.title.value },
                ),
              }),
            },

            banner: {
              label: 'Split banner',
              itemLabel: (props) => `Banner — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: multiline('Body'),
                cta: cta(),
                accent: accent('blue'),
              }),
            },

            comparison: {
              label: 'Comparison',
              itemLabel: (props) => `Comparison — ${props.fields.before.fields.title.value} vs ${props.fields.after.fields.title.value}`,
              schema: fields.object({
                before: fields.object(
                  {
                    title: fields.text({ label: 'Title' }),
                    items: fields.array(fields.text({ label: 'Item' }), {
                      label: 'Items',
                      itemLabel: (props) => props.value,
                    }),
                  },
                  { label: 'Before (✕ list)' },
                ),
                after: fields.object(
                  {
                    title: fields.text({ label: 'Title' }),
                    items: fields.array(fields.text({ label: 'Item' }), {
                      label: 'Items',
                      itemLabel: (props) => props.value,
                    }),
                  },
                  { label: 'After (○ list)' },
                ),
              }),
            },

            teams: {
              label: 'Numbered grid',
              itemLabel: (props) => `Grid — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                accent: accent('olive'),
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: multiline('Body'),
                  }),
                  { label: 'Items', itemLabel: (props) => props.fields.title.value },
                ),
              }),
            },

            stats: {
              label: 'Stats with bars',
              itemLabel: (props) => `Stats — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: multiline('Body'),
                cta: cta(),
                stats: fields.array(
                  fields.object({
                    label: fields.text({ label: 'Label' }),
                    value: fields.text({ label: 'Value' }),
                    bar: fields.integer({
                      label: 'Bar height (%)',
                      description: 'Height of the colored bar, 0–100.',
                      defaultValue: 50,
                      validation: { min: 0, max: 100 },
                    }),
                  }),
                  { label: 'Stats', itemLabel: (props) => `${props.fields.value.value} — ${props.fields.label.value}` },
                ),
              }),
            },

            statement: {
              label: 'Statement with shaped image',
              itemLabel: (props) => `Statement — ${props.fields.lineOne.value}`,
              schema: fields.object({
                lineOne: fields.text({ label: 'First line (top left)' }),
                lineTwo: fields.text({ label: 'Second line (bottom right)' }),
                image: image('Image', 'Tinted olive and cropped into the center shape.'),
                imageAlt: alt(),
              }),
            },

            feature: {
              label: 'Feature (text + image)',
              itemLabel: (props) => `Feature — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: multiline('Body'),
                cta: cta(),
                image: image('Image'),
                imageAlt: alt(),
                imageSide: fields.select({
                  label: 'Image side',
                  options: [
                    { label: 'Right', value: 'right' },
                    { label: 'Left', value: 'left' },
                  ],
                  defaultValue: 'right',
                }),
              }),
            },

            cta: {
              label: 'Call to action',
              itemLabel: (props) => `CTA — ${props.fields.heading.value}`,
              schema: fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: multiline('Body'),
                cta: cta(),
              }),
            },
          },
          { label: 'Sections', description: 'Drag to reorder. Remove a section to hide it from the page.' },
        ),
      },
    }),
  },
});
