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

// QA and local dev show drafts; production (prerendered) gets published
// content. Stega is added per request, inside Presentation only (see
// src/lib/stega.ts), via `Astro.locals`.
if (import.meta.env.DEV && !canReadDrafts) {
  console.warn(
    '[content] SANITY_API_READ_TOKEN is not set, so dev shows published content only.',
  );
}

type ContentOptions = Pick<App.Locals, 'stega'>;

const clientFor = ({ stega }: ContentOptions) =>
  showDrafts ? draftClient(Boolean(stega)) : client;

export async function getSite(options: ContentOptions = {}): Promise<Site> {
  const site = await clientFor(options).fetch(siteQuery);

  if (!site) {
    throw new Error('Missing the "siteSettings" document in Sanity');
  }

  return site;
}

export async function getHome(options: ContentOptions = {}): Promise<Home> {
  const home = await clientFor(options).fetch(homeQuery);

  if (!home) {
    throw new Error('Missing the "homePage" document in Sanity');
  }

  return home;
}

export async function getNotFound(
  options: ContentOptions = {},
): Promise<NotFound> {
  const notFound = await clientFor(options).fetch(notFoundQuery);

  if (!notFound) {
    throw new Error('Missing the "notFoundPage" document in Sanity');
  }

  return notFound;
}
