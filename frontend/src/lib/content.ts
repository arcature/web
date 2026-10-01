import type { HomeQueryResult, SiteQueryResult } from '../sanity.types';
import { homeQuery, siteQuery } from './queries';
import {
  client,
  draftClient,
  isDraftMode,
  type RequestContext,
} from './sanity';

export type Site = NonNullable<SiteQueryResult>;
export type Home = NonNullable<HomeQueryResult>;
export type Section = Home['sections'][number];
export type SectionOf<K extends Section['_type']> = Omit<
  Extract<Section, { _type: K }>,
  '_type' | '_key'
>;

// Published content for prerendered pages; drafts (with stega) for preview requests in draft mode.
const clientFor = (context: RequestContext) =>
  isDraftMode(context) ? draftClient() : client;

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
