import { defineArrayMember, defineField, defineType } from 'sanity';

import { accent, alt, cta, image, multiline, stringList, text } from './fields';

const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    multiline('body', 'Body'),
    cta(),
    image('image', 'Image', 'Cropped into the stepped shape on the right.'),
    alt(),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({ title: `Hero — ${title ?? ''}`, media }),
  },
});

const logos = defineType({
  name: 'logos',
  title: 'Logo strip',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Accessible label',
      description: 'Read by screen readers only.',
      type: 'string',
      initialValue: 'Trusted by',
    }),
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'logo',
          fields: [
            defineField({
              name: 'name',
              title: 'Organization name (alt text)',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            image('image', 'Logo'),
          ],
          preview: { select: { title: 'name', media: 'image' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { logos: 'logos' },
    prepare: ({ logos }) => ({
      title: `Logo strip (${Array.isArray(logos) ? logos.length : 0})`,
    }),
  },
});

const intro = defineType({
  name: 'intro',
  title: 'Intro with feature cards',
  type: 'object',
  fields: [
    multiline('eyebrow', 'Label'),
    multiline('body', 'Statement'),
    cta('Explore features'),
    defineField({
      name: 'features',
      title: 'Feature cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'feature',
          fields: [text('title', 'Title'), multiline('body', 'Body')],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'eyebrow' },
    prepare: ({ title }) => ({ title: `Intro — ${title ?? ''}` }),
  },
});

const lifecycle = defineType({
  name: 'lifecycle',
  title: 'Numbered accordion',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    cta(),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'item',
          fields: [
            text('title', 'Title'),
            stringList('tags', 'Tags', 'Tag'),
            text('lead', 'Lead sentence'),
            multiline('body', 'Body'),
            image(
              'image',
              'Image',
              'Optional. Falls back to the first item’s image.',
            ),
            alt(),
          ],
          preview: { select: { title: 'title', media: 'image' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: `Accordion — ${title ?? ''}` }),
  },
});

const banner = defineType({
  name: 'banner',
  title: 'Split banner',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    multiline('body', 'Body'),
    cta(),
    accent('blue'),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: `Banner — ${title ?? ''}` }),
  },
});

const comparisonColumn = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: [text('title', 'Title'), stringList('items', 'Items', 'Item')],
  });

const comparison = defineType({
  name: 'comparison',
  title: 'Comparison',
  type: 'object',
  fields: [
    comparisonColumn('before', 'Before (✕ list)'),
    comparisonColumn('after', 'After (○ list)'),
  ],
  preview: {
    select: { before: 'before.title', after: 'after.title' },
    prepare: ({ before, after }) => ({
      title: `Comparison — ${before ?? ''} vs ${after ?? ''}`,
    }),
  },
});

const teams = defineType({
  name: 'teams',
  title: 'Numbered grid',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    accent('olive'),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'item',
          fields: [text('title', 'Title'), multiline('body', 'Body')],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: `Grid — ${title ?? ''}` }),
  },
});

const stats = defineType({
  name: 'stats',
  title: 'Stats with bars',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    multiline('body', 'Body'),
    cta(),
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            text('label', 'Label'),
            text('value', 'Value'),
            defineField({
              name: 'bar',
              title: 'Bar height (%)',
              description: 'Height of the colored bar, 0–100.',
              type: 'number',
              initialValue: 50,
              validation: (rule) => rule.integer().min(0).max(100),
            }),
          ],
          preview: {
            select: { value: 'value', label: 'label' },
            prepare: ({ value, label }) => ({
              title: `${value ?? ''} — ${label ?? ''}`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: `Stats — ${title ?? ''}` }),
  },
});

const statement = defineType({
  name: 'statement',
  title: 'Statement with shaped image',
  type: 'object',
  fields: [
    text('lineOne', 'First line (top left)'),
    text('lineTwo', 'Second line (bottom right)'),
    image('image', 'Image', 'Tinted olive and cropped into the center shape.'),
    alt(),
  ],
  preview: {
    select: { title: 'lineOne', media: 'image' },
    prepare: ({ title, media }) => ({
      title: `Statement — ${title ?? ''}`,
      media,
    }),
  },
});

const feature = defineType({
  name: 'feature',
  title: 'Feature (text + image)',
  type: 'object',
  fields: [
    text('heading', 'Heading'),
    multiline('body', 'Body'),
    cta(),
    image('image', 'Image'),
    alt(),
    defineField({
      name: 'imageSide',
      title: 'Image side',
      type: 'string',
      options: {
        list: [
          { title: 'Right', value: 'right' },
          { title: 'Left', value: 'left' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'right',
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({
      title: `Feature — ${title ?? ''}`,
      media,
    }),
  },
});

const callToAction = defineType({
  name: 'cta',
  title: 'Call to action',
  type: 'object',
  fields: [text('heading', 'Heading'), multiline('body', 'Body'), cta()],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: `CTA — ${title ?? ''}` }),
  },
});

export const sectionTypes = [
  hero,
  logos,
  intro,
  lifecycle,
  banner,
  comparison,
  teams,
  stats,
  statement,
  feature,
  callToAction,
];
