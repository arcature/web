import { homePage, notFoundPage, siteSettings } from './documents';
import { footerNavigation, mainNavigation } from './navigation';
import { redirect } from './redirect';
import { sectionTypes } from './sections';

export const schemaTypes = [
  homePage,
  notFoundPage,
  siteSettings,
  mainNavigation,
  footerNavigation,
  redirect,
  ...sectionTypes,
];

/** Documents that exist exactly once, with a fixed ID (the same as the type). */
export const singletonTypes = new Set<string>([
  homePage.name,
  notFoundPage.name,
  siteSettings.name,
  mainNavigation.name,
  footerNavigation.name,
]);
