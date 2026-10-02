import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe';
import { HomeIcon } from '@sanity/icons/Home';
import { WarningOutlineIcon } from '@sanity/icons/WarningOutline';
import { defineArrayMember, defineField, defineType } from 'sanity';

import { sectionTypes } from './sections';
import { seoFields, socialFields, socialProfilesField } from './seo';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: EarthGlobeIcon,
  groups: [
    { name: 'settings', title: 'Settings', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Site title',
      type: 'string',
      initialValue: 'Maestro',
      group: 'settings',
    }),
    // Site-wide defaults; also the values for the home page.
    ...seoFields({
      title: 'Hide from search engines',
      description:
        'Keep checked until launch. Unchecking lets Google and others index the site.',
      initialValue: true,
    }),
    ...socialFields(),
    socialProfilesField(),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

const sectionsField = () =>
  defineField({
    name: 'sections',
    title: 'Sections',
    description: 'Drag to reorder. Remove a section to hide it from the page.',
    type: 'array',
    of: sectionTypes.map((section) =>
      defineArrayMember({ type: section.name }),
    ),
  });

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,
  fields: [sectionsField()],
  preview: { prepare: () => ({ title: 'Home page' }) },
});

export const notFoundPage = defineType({
  name: 'notFoundPage',
  title: '404 page',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      description:
        'Shown in the browser tab, followed by the site title. The page is never indexed.',
      type: 'string',
      initialValue: 'Page not found',
      validation: (rule) => rule.required(),
    }),
    sectionsField(),
  ],
  preview: { prepare: () => ({ title: '404 page' }) },
});
