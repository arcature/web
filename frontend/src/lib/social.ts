// Social profiles from Site settings → Social. The platform values match the
// list in studio/schemaTypes/seo.ts.
const platforms = {
  facebook: {
    label: 'Facebook',
    url: (u: string) => `https://www.facebook.com/${u}`,
  },
  instagram: {
    label: 'Instagram',
    url: (u: string) => `https://www.instagram.com/${u}/`,
  },
  linkedin: {
    label: 'LinkedIn',
    url: (u: string) => `https://www.linkedin.com/company/${u}/`,
  },
  twitter: { label: 'X', url: (u: string) => `https://x.com/${u}` },
  youtube: {
    label: 'YouTube',
    url: (u: string) => `https://www.youtube.com/@${u}`,
  },
} as const;

type Platform = keyof typeof platforms;

interface QueriedProfile {
  platform: string | null;
  username: string | null;
}

export interface SocialLink {
  platform: Platform;
  label: string;
  href: string;
}

/** Usernames are entered without the @, but tolerate one. */
export const cleanUsername = (username: string | null | undefined) =>
  username?.trim().replace(/^@/, '') || undefined;

const isPlatform = (platform: string | null): platform is Platform =>
  platform !== null && Object.hasOwn(platforms, platform);

/** Footer links, in the editor's order. Profiles missing a platform or username are skipped. */
export function socialLinks(profiles: QueriedProfile[]): SocialLink[] {
  return profiles.flatMap(({ platform, username }) => {
    const handle = cleanUsername(username);

    if (!isPlatform(platform) || !handle) {
      return [];
    }

    const { label, url } = platforms[platform];

    return [{ platform, label, href: url(encodeURIComponent(handle)) }];
  });
}

/** The X username, for twitter:site. */
export const twitterUsername = (profiles: QueriedProfile[]) =>
  cleanUsername(
    profiles.find((profile) => profile.platform === 'twitter')?.username,
  );
