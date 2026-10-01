import { defineField } from 'sanity';

export type Accent = 'red' | 'blue' | 'olive' | 'ink';

export const image = (name: string, title: string, description?: string) =>
  defineField({ name, title, description, type: 'image' });

export const alt = (name = 'imageAlt', title = 'Image alt text') =>
  defineField({
    name,
    title,
    type: 'string',
    description:
      'Describe the image for screen reader users. Leave empty only if the image is purely decorative.',
  });

export const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, description, type: 'string' });

export const multiline = (name: string, title: string, description?: string) =>
  defineField({ name, title, description, type: 'text', rows: 3 });

export const cta = (
  defaultLabel = 'Request demo',
  name = 'cta',
  title = 'Button',
) =>
  defineField({
    name,
    title,
    type: 'object',
    options: { collapsible: true, collapsed: false },
    fields: [
      defineField({
        name: 'label',
        title: 'Button label',
        type: 'string',
        initialValue: defaultLabel,
      }),
      defineField({
        name: 'href',
        title: 'Button link',
        type: 'string',
        initialValue: '#demo',
      }),
    ],
  });

export const accent = (initialValue: Accent) =>
  defineField({
    name: 'accent',
    title: 'Accent color',
    type: 'string',
    options: {
      list: [
        { title: 'Red', value: 'red' },
        { title: 'Blue', value: 'blue' },
        { title: 'Olive', value: 'olive' },
        { title: 'Black', value: 'ink' },
      ],
      layout: 'radio',
      direction: 'horizontal',
    },
    initialValue,
  });

export const linkList = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      {
        type: 'object',
        name: 'link',
        fields: [
          defineField({
            name: 'label',
            title: 'Label',
            type: 'string',
            validation: (rule) => rule.required(),
          }),
          defineField({
            name: 'href',
            title: 'Link',
            type: 'string',
            initialValue: '#',
          }),
        ],
        preview: { select: { title: 'label', subtitle: 'href' } },
      },
    ],
  });

export const stringList = (name: string, title: string, itemTitle: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [{ type: 'string', title: itemTitle }],
  });
