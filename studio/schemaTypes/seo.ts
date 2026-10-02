import { defineArrayMember, defineField, type FieldDefinition } from 'sanity';

// SEO and social fields, as in FK Kit's studio/src/schemaTypes/shared/. Spread
// them into a document that defines `seo` and `social` groups.

type NoIndexOptions = Partial<
  Pick<FieldDefinition, 'title' | 'description'> & { initialValue: boolean }
>;

export const seoFields = (noIndex: NoIndexOptions = {}) => [
  defineField({
    title: 'SEO title',
    name: 'seoTitle',
    type: 'string',
    group: 'seo',
  }),
  defineField({
    title: 'SEO description',
    name: 'seoDescription',
    type: 'text',
    group: 'seo',
    rows: 3,
  }),
  defineField({
    title: 'SEO keywords',
    name: 'seoKeywords',
    type: 'array',
    of: [{ type: 'string' }],
    group: 'seo',
  }),
  defineField({
    title: 'No index',
    name: 'noIndex',
    type: 'boolean',
    group: 'seo',
    description:
      'Check this box to prevent search engines from indexing this page',
    initialValue: false,
    ...noIndex,
  }),
];

export const socialFields = () => [
  defineField({
    title: 'Social title',
    name: 'socialTitle',
    type: 'string',
    group: 'social',
  }),
  defineField({
    title: 'Social description',
    name: 'socialDescription',
    type: 'text',
    group: 'social',
    rows: 3,
  }),
  defineField({
    title: 'Social image',
    name: 'socialImage',
    type: 'image',
    description: 'Cropped to 1200 × 628 when shared.',
    group: 'social',
  }),
  defineField({
    title: 'Social image alt text',
    name: 'socialImageAlt',
    type: 'string',
    group: 'social',
  }),
];

// Platforms as in FK Kit's footerNavigation. The frontend builds each profile URL
// from the username (frontend/src/lib/social.ts), so keep the values in step.
const platforms = [
  { title: 'Facebook', value: 'facebook' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'LinkedIn', value: 'linkedin' },
  { title: 'X', value: 'twitter' },
  { title: 'YouTube', value: 'youtube' },
];

export const socialProfilesField = () =>
  defineField({
    title: 'Social profiles',
    name: 'socialProfiles',
    description:
      'Linked from the footer, in this order. The X username is also used for twitter:site.',
    type: 'array',
    group: 'social',
    of: [
      defineArrayMember({
        type: 'object',
        name: 'socialProfile',
        fields: [
          defineField({
            title: 'Platform',
            name: 'platform',
            type: 'string',
            options: { list: platforms },
            validation: (rule) => rule.required(),
          }),
          defineField({
            title: 'Username',
            name: 'username',
            type: 'string',
            description:
              'Without the @. For LinkedIn, the company page name from its URL.',
            validation: (rule) => rule.required(),
          }),
        ],
        preview: {
          select: { platform: 'platform', username: 'username' },
          prepare: ({ platform, username }) => ({
            title:
              platforms.find((option) => option.value === platform)?.title ??
              'Platform',
            subtitle: username ? `@${username}` : 'No username',
          }),
        },
      }),
    ],
    validation: (rule) =>
      rule.custom((profiles?: { platform?: string }[]) => {
        const seen = new Set<string>();
        for (const { platform } of profiles ?? []) {
          if (platform && seen.has(platform)) {
            return 'Each platform can only be added once.';
          }
          if (platform) seen.add(platform);
        }
        return true;
      }),
  });
