import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'secondary' ? t.primarySoft : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : t.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      <Text style={[s.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>
  );
}

export function IconBadge({ icon, tone = 'primary', size = 44 }: { icon: string; tone?: Tone; size?: number }) {
  const t = useTheme();
  const { soft } = toneColors(t, tone);
  return (
    <View style={[s.icon, { width: size, height: size, borderRadius: size / 3, backgroundColor: soft }]}>
      <Text style={{ fontSize: size * 0.48 }}>{icon}</Text>
    </View>
  );
}

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export function toneColors(t: ReturnType<typeof useTheme>, tone: Tone) {
  switch (tone) {
    case 'success':
      return { fg: t.success, soft: t.successSoft };
    case 'warning':
      return { fg: t.warning, soft: t.warningSoft };
    case 'danger':
      return { fg: t.danger, soft: t.dangerSoft };
    case 'neutral':
      return { fg: t.subtle, soft: t.surfaceAlt };
    default:
      return { fg: t.primary, soft: t.primarySoft };
  }
}

export function Pill({ label, tone }: { label: string; tone: Tone }) {
  const t = useTheme();
  const { fg, soft } = toneColors(t, tone);
  return (
    <View style={[s.pill, { backgroundColor: soft }]}>
      <View style={[s.dot, { backgroundColor: fg }]} />
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Overline({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[s.overline, { color: t.primary }]}>{children}</Text>;
}

export function CodeBlock({ command }: { command: string }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <View style={[s.code, { backgroundColor: t.code }]}>
      <Text selectable style={[s.codeText, { color: t.codeText }]}>
        <Text style={{ color: t.subtle }}>$ </Text>
        {command}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy command"
        onPress={copy}
        style={({ pressed }) => [s.copy, { opacity: pressed ? 0.7 : 1 }]}>
        <Text style={s.copyText}>{copied ? '✓ Copied' : 'Copy'}</Text>
      </Pressable>
    </View>
  );
}

export function FeatureRow({ icon, title, body, tone }: { icon: string; title: string; body: string; tone?: Tone }) {
  const t = useTheme();
  return (
    <View style={s.feature}>
      <IconBadge icon={icon} tone={tone} size={40} />
      <View style={s.featureCopy}>
        <Text style={[s.featureTitle, { color: t.text }]}>{title}</Text>
        <Text style={[s.featureBody, { color: t.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  button: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  card: { borderRadius: radius.lg, padding: space.xl, gap: space.lg, borderWidth: StyleSheet.hairlineWidth },
  icon: { alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '800' },
  overline: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  code: { borderRadius: radius.md, padding: space.lg, paddingRight: 84, minHeight: 52, justifyContent: 'center' },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  copy: { position: 'absolute', right: 8, top: 8, backgroundColor: '#FFFFFF1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  copyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  feature: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { fontSize: 15, fontWeight: '800' },
  featureBody: { fontSize: 13.5, lineHeight: 19.5 },
});

