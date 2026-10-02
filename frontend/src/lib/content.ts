import type {
  HomeQueryResult,
  NotFoundQueryResult,
  SiteQueryResult,
} from '../sanity.types';
import { homeQuery, notFoundQuery, siteQuery } from './queries';
import { canReadDrafts, client, draftClient, showDrafts } from './sanity';

export type Site = NonNullable<SiteQueryResult>;
export type Home = NonNullable<HomeQueryResult>;
export type NotFound = NonNullable<NotFoundQueryResult>;
export type Section = Home['sections'][number];
export type SectionOf<K extends Section['_type']> = Omit<
  Extract<Section, { _type: K }>,
  '_type' | '_key'
>;

// QA and local dev show drafts, with stega for Presentation's click-to-edit;
// production (prerendered) gets published content.
if (import.meta.env.DEV && !canReadDrafts) {
  console.warn(
    '[content] SANITY_API_READ_TOKEN is not set, so dev shows published content only.',
  );
}

const contentClient = showDrafts ? draftClient() : client;

export async function getSite(): Promise<Site> {
  const site = await contentClient.fetch(siteQuery);

  if (!site) {
    throw new Error('Missing the "siteSettings" document in Sanity');
  }

  return site;
}

export async function getHome(): Promise<Home> {
  const home = await contentClient.fetch(homeQuery);

  if (!home) {
    throw new Error('Missing the "homePage" document in Sanity');
  }

  return home;
}

export async function getNotFound(): Promise<NotFound> {
  const notFound = await contentClient.fetch(notFoundQuery);

  if (!notFound) {
    throw new Error('Missing the "notFoundPage" document in Sanity');
  }

  return notFound;
}
