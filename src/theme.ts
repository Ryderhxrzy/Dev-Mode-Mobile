import { useColorScheme } from 'react-native';

const palette = {
  light: {
    bg: '#F3F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EAF1FD',
    border: '#E2E8F2',
    text: '#0E1B2E',
    muted: '#5D6B80',
    subtle: '#8A97AA',
    primary: '#1877F2',
    primarySoft: '#E3EEFF',
    onPrimary: '#FFFFFF',
    success: '#12955F',
    successSoft: '#E4F6EE',
    warning: '#B7791F',
    warningSoft: '#FFF5E0',
    danger: '#D1495B',
    dangerSoft: '#FDECEE',
    code: '#0E1A2B',
    codeText: '#D7E8FF',
  },
  dark: {
    bg: '#080E1A',
    surface: '#111A2B',
    surfaceAlt: '#16233A',
    border: '#1F2C44',
    text: '#F3F6FB',
    muted: '#A3B0C4',
    subtle: '#6E7C93',
    primary: '#4A94FF',
    primarySoft: '#14284A',
    onPrimary: '#FFFFFF',
    success: '#3CCB8A',
    successSoft: '#0F2E22',
    warning: '#F2B544',
    warningSoft: '#2E2513',
    danger: '#FF6B7D',
    dangerSoft: '#341820',
    code: '#050A14',
    codeText: '#CFE2FF',
  },
};

export type Theme = (typeof palette)['light'] & { dark: boolean };

export function useTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  return { ...(dark ? palette.dark : palette.light), dark };
}

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

