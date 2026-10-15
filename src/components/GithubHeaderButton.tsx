import React from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius, useTheme } from '@/theme';

export const GITHUB_REPO_URL = 'https://github.com/Ryderhxrzy/Dev-Mode-Mobile';
export const GITHUB_ISSUES_URL = 'https://github.com/Ryderhxrzy/Dev-Mode-Mobile/issues';

export function GithubIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        fill={color}
      />
    </Svg>
  );
}

export interface GithubHeaderButtonProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
  borderRadius?: number;
  color?: string;
}

export function GithubHeaderButton({
  style,
  size = 36,
  borderRadius,
  color,
}: GithubHeaderButtonProps) {
  const t = useTheme();

  const handlePress = () => {
    Linking.openURL(GITHUB_REPO_URL).catch(() => {});
  };

  const computedRadius = borderRadius !== undefined ? borderRadius : size <= 38 ? radius.sm : radius.md;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View source code on GitHub"
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: computedRadius,
          backgroundColor: t.canvasElevated,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <GithubIcon size={Math.round(size * 0.52)} color={color ?? t.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
