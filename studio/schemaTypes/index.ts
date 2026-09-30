import { homePage, siteSettings } from './documents';
import { sectionTypes } from './sections';

export const schemaTypes = [homePage, siteSettings, ...sectionTypes];

/** Documents that exist exactly once, with a fixed ID. */
export const singletons = [
  { type: homePage.name, id: 'homePage', title: 'Home page' },
  { type: siteSettings.name, id: 'siteSettings', title: 'Site settings' },
];
