import { createReader } from '@keystatic/core/reader';
import type { ImageMetadata } from 'astro';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

export type Site = NonNullable<Awaited<ReturnType<typeof reader.singletons.site.read>>>;
export type Home = NonNullable<Awaited<ReturnType<typeof reader.singletons.home.read>>>;
export type Section = Home['sections'][number];
export type SectionOf<K extends Section['discriminant']> = Extract<Section, { discriminant: K }>['value'];

export async function getSite(): Promise<Site> {
  const site = await reader.singletons.site.read();

  if (!site) {
    throw new Error('Missing src/content/site.yaml');
  }

  return site;
}

export async function getHome(): Promise<Home> {
  const home = await reader.singletons.home.read();

  if (!home) {
    throw new Error('Missing src/content/home.yaml');
  }

  return home;
}

// Keystatic stores images as "/src/assets/cms/..." paths; map them to Astro
// image imports so they go through the asset pipeline.
const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/cms/**/*.{jpg,jpeg,png,webp,avif,gif,svg}',
  { eager: true },
);

export function resolveImage(path: string | null | undefined): ImageMetadata | undefined {
  if (!path) {
    return undefined;
  }

  const image = images[path];

  if (!image) {
    console.warn(`[content] Image not found: ${path}`);

    return undefined;
  }

  return image.default;
}
