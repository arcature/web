export type Accent = 'red' | 'blue' | 'olive' | 'ink';

export const accentBg: Record<Accent, string> = {
  red: 'bg-red',
  blue: 'bg-blue',
  olive: 'bg-olive',
  ink: 'bg-ink',
};

/** Color sequence the design uses for cards and bars. */
export const accentCycle: Accent[] = ['red', 'blue', 'olive'];
