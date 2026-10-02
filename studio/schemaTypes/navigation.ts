import { MenuIcon } from '@sanity/icons/Menu';
import { defineField, defineType } from 'sanity';

import { cta, image, linkList, text } from './fields';

// Header and footer navigation, as separate singletons like clio's
// mainNavigation and footerNavigation.

export const mainNavigation = defineType({
  name: 'mainNavigation',
  title: 'Main navigation',
  type: 'document',
  icon: MenuIcon,
  fields: [
    linkList('items', 'Navigation items'),
    cta('Log in', 'login', 'Log in button'),
    cta('Request demo', 'cta', 'Call to action button'),
  ],
  preview: { prepare: () => ({ title: 'Main navigation' }) },
});

export const footerNavigation = defineType({
  name: 'footerNavigation',
  title: 'Footer navigation',
  type: 'document',
  icon: MenuIcon,
  fields: [
    text('tagline', 'Tagline'),
    image(
      'image',
      'Background image',
      'Shown inside the mountain shape behind the tagline.',
    ),
    linkList('items', 'Navigation items'),
    text('copyright', 'Copyright line'),
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'object',
      fields: [text('label', 'Label'), text('href', 'Link')],
    }),
  ],
  preview: { prepare: () => ({ title: 'Footer navigation' }) },
});
