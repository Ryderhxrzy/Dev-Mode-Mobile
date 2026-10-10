import { useColorScheme } from 'react-native';

const palette = {
  dark: {
    // Android Robot Emerald / Neon Terminal Aesthetic (matching new-icon.png)
    bg: '#050D0A',           // Deepest terminal bio-black / dark forest obsidian
    canvas: 'rgba(11, 23, 19, 0.86)',       // Matrix dark green card canvas with subtle glassmorphism
    canvasElevated: 'rgba(17, 34, 28, 0.90)',
    cardBorder: 'rgba(34, 197, 94, 0.25)', // Bio-green border
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    
    // Main Brand Greens (Sampled from icon2.png)
    primary: '#16A34A',       // Android Emerald Green matching theme and icon2.png
    primaryGlow: 'rgba(22, 163, 74, 0.28)',
    primaryLight: '#22C55E',  // Neon green highlight
    accentCyan: '#10B981',    // Emerald / Spring Green
    accentCyanGlow: 'rgba(16, 185, 129, 0.22)',
    neonGlow: '#4ADE80',      // Vivid lime-green accent matching the toggle button rim

    // State Tones
    success: '#22C55E',       // Neon Emerald
    successSoft: 'rgba(34, 197, 94, 0.16)',
    warning: '#F59E0B',       // Amber
    warningSoft: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',        // Crimson
    dangerSoft: 'rgba(239, 68, 68, 0.15)',

    // Typography
    textPrimary: '#F0FDF4',   // Very pale mint-tinted white for super crisp readability
    textSecondary: '#86EFAC', // Soft pale green for subtitles
    textMuted: '#4ADE8088',   // Muted green-gray
    onPrimary: '#FFFFFF',     // Crisp white text on darkened emerald green button

    // Code/Terminal Box
    codeBg: '#030806',
    codeBorder: 'rgba(34, 197, 94, 0.35)',
    codeText: '#86EFAC',
  },
  light: {
    // Clean, crisp high-contrast green developer theme
    bg: '#F2FBF5',
    canvas: '#FFFFFF',
    canvasElevated: '#E8F7ED',
    cardBorder: 'rgba(22, 163, 74, 0.18)',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',

    primary: '#15803D',
    primaryGlow: 'rgba(21, 128, 61, 0.14)',
    primaryLight: '#16A34A',
    accentCyan: '#059669',
    accentCyanGlow: 'rgba(5, 150, 105, 0.14)',
    neonGlow: '#16A34A',

    success: '#16A34A',
    successSoft: 'rgba(22, 163, 74, 0.12)',
    warning: '#D97706',
    warningSoft: 'rgba(217, 119, 6, 0.12)',
    danger: '#DC2626',
    dangerSoft: 'rgba(220, 38, 38, 0.12)',

    textPrimary: '#052E16',
    textSecondary: '#166534',
    textMuted: '#3F6212',
    onPrimary: '#FFFFFF',

    codeBg: '#052E16',
    codeBorder: 'rgba(22, 163, 74, 0.3)',
    codeText: '#86EFAC',
  },
};

export type Theme = (typeof palette)['dark'] & { dark: boolean };

export function useTheme(): Theme {
  const isDark = useColorScheme() === 'dark';
  return { ...(isDark ? palette.dark : palette.light), dark: isDark };
}

export const fonts = {
  heading: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_500Medium',
  body: 'SpaceGrotesk_400Regular',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 16, // Standard 16px screen margin across Android/iOS
  xxl: 24,
};
