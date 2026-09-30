import { getImage } from 'astro:assets';

export interface CmsImage {
  src: string;
  width: number;
  height: number;
}

type QueriedImage = { src: string | null; width: number | null; height: number | null } | null | undefined;

/** Narrows a queried Sanity image to one that can be rendered, or undefined if it's missing. */
export function resolveImage(image: QueriedImage): CmsImage | undefined {
  if (!image?.src || !image.width || !image.height) {
    return undefined;
  }

  return { src: image.src, width: image.width, height: image.height };
}

/** Resized URL from Sanity's image CDN (used when rendering on request). */
export function sanityImageUrl(image: CmsImage, width: number): string {
  const url = new URL(image.src);
  url.searchParams.set('w', String(Math.round(Math.min(width, image.width))));
  url.searchParams.set('fit', 'max');
  url.searchParams.set('auto', 'format');

  return url.toString();
}

/**
 * URL for an image at (at most) the given width. Prerendered pages download and
 * optimize the image into the build output, so the public site never loads from
 * Sanity. Pages rendered on request (preview) use Sanity's CDN directly.
 */
export async function imageUrl(image: CmsImage, width: number, isPrerendered: boolean): Promise<string> {
  if (!isPrerendered) {
    return sanityImageUrl(image, width);
  }

  const targetWidth = Math.round(Math.min(width, image.width));
  const optimized = await getImage({
    src: image.src,
    width: targetWidth,
    height: Math.round((image.height * targetWidth) / image.width),
  });

  return optimized.src;
}
