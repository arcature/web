import { defineArrayMember, defineField, defineType } from 'sanity';

import { cta, image, linkList, multiline, text } from './fields';
import { sectionTypes } from './sections';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Site title',
      type: 'string',
      initialValue: 'Maestro',
    }),
    multiline('description', 'Meta description'),
    defineField({
      name: 'hideFromSearchEngines',
      title: 'Hide from search engines',
      description:
        'Keep checked until launch. Unchecking lets Google and others index the site.',
      type: 'boolean',
      initialValue: true,
    }),
    linkList('navigation', 'Main navigation'),
    cta('Log in', 'login', 'Log in button'),
    cta('Request demo', 'headerCta', 'Header button'),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        text('tagline', 'Tagline'),
        image(
          'image',
          'Background image',
          'Shown inside the mountain shape behind the tagline.',
        ),
        linkList('social', 'Social links'),
        text('copyright', 'Copyright line'),
        defineField({
          name: 'credit',
          title: 'Credit',
          type: 'object',
          fields: [text('label', 'Label'), text('href', 'Link')],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  fields: [
    defineField({
      name: 'sections',
      title: 'Sections',
      description:
        'Drag to reorder. Remove a section to hide it from the page.',
      type: 'array',
      of: sectionTypes.map((section) =>
        defineArrayMember({ type: section.name }),
      ),
    }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
});
