import type {
  HomeQueryResult,
  NotFoundQueryResult,
  SiteQueryResult,
} from '../sanity.types';
import { homeQuery, notFoundQuery, siteQuery } from './queries';
import {
  canReadDrafts,
  client,
  draftClient,
  isDraftMode,
  type RequestContext,
} from './sanity';

export type Site = NonNullable<SiteQueryResult>;
export type Home = NonNullable<HomeQueryResult>;
export type NotFound = NonNullable<NotFoundQueryResult>;
export type Section = Home['sections'][number];
export type SectionOf<K extends Section['_type']> = Omit<
  Extract<Section, { _type: K }>,
  '_type' | '_key'
>;

// Local dev always shows drafts. Deployed, drafts (with stega) are only for
// QA requests in draft mode; prerendered pages get published content.
const devDrafts = import.meta.env.DEV && canReadDrafts;

if (import.meta.env.DEV && !canReadDrafts) {
  console.warn(
    '[content] SANITY_API_READ_TOKEN is not set, so dev shows published content only.',
  );
}

const clientFor = (context: RequestContext) =>
  devDrafts || isDraftMode(context) ? draftClient() : client;

export async function getSite(context: RequestContext): Promise<Site> {
  const site = await clientFor(context).fetch(siteQuery);

  if (!site) {
    throw new Error('Missing the "siteSettings" document in Sanity');
  }

  return site;
}

export async function getHome(context: RequestContext): Promise<Home> {
  const home = await clientFor(context).fetch(homeQuery);

  if (!home) {
    throw new Error('Missing the "homePage" document in Sanity');
  }

  return home;
}

export async function getNotFound(context: RequestContext): Promise<NotFound> {
  const notFound = await clientFor(context).fetch(notFoundQuery);

  if (!notFound) {
    throw new Error('Missing the "notFoundPage" document in Sanity');
  }

  return notFound;
}
