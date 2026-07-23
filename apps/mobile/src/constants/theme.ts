/**
 * "Tailor's atelier" palette — ink, chalk paper, and brass hardware, the vocabulary of a garment
 * tag rather than a generic SaaS default. Named tokens carry semantic meaning (brass = the one
 * accent; moss/rust = positive/negative states) so every screen draws from the same small set.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#15161B',
    background: '#F6F4EF',
    backgroundElement: '#EDEAE1',
    backgroundSelected: '#E2DDCF',
    textSecondary: '#5C6070',
    accent: '#A8763A',
    accentText: '#FFFFFF',
    positive: '#5F7A5E',
    negative: '#A2453A',
    border: '#DCD6C8',
  },
  dark: {
    text: '#F2EFE7',
    background: '#15161B',
    backgroundElement: '#1F2027',
    backgroundSelected: '#2A2C35',
    textSecondary: '#9CA0B0',
    accent: '#D6A153',
    accentText: '#15161B',
    positive: '#84A382',
    negative: '#D07868',
    border: '#33353F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Fraunces (display, tailored/editorial) + Work Sans (body, warm grotesque) — loaded via
 * expo-font's useFonts in the root layout, which registers these exact family names on web too.
 */
export const Fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  sans: 'WorkSans_400Regular',
  sansMedium: 'WorkSans_500Medium',
  sansSemiBold: 'WorkSans_600SemiBold',
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
