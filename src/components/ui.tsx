import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, Copy } from 'lucide-react-native';
import { fonts, radius, space, useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cyan';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  accessibilityLabel?: string;
}) {
  const t = useTheme();

  let bg = t.primary; // Android Emerald Green (#16A34A), aligned with icon2.png and theme
  let fg = '#FFFFFF';  // Crisp white text matching icons
  let border = 'rgba(74, 222, 128, 0.35)'; // Neon bio-green accent border matching icon2.png toggle rim

  if (variant === 'cyan') {
    bg = t.primary;
    fg = '#FFFFFF';
    border = 'rgba(74, 222, 128, 0.40)';
  } else if (variant === 'secondary') {
    bg = t.canvasElevated;
    fg = '#FFFFFF';
    border = t.cardBorder;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    fg = t.textSecondary;
    border = 'transparent';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border !== 'transparent' ? 1 : 0,
          opacity: disabled ? 0.35 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {icon && <View style={s.btnIcon}>{icon}</View>}
      <Text style={[s.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: t.canvas,
          borderColor: t.cardBorder,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export type Tone = 'primary' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral';

export function toneColors(t: ReturnType<typeof useTheme>, tone: Tone) {
  switch (tone) {
    case 'cyan':
      return { fg: t.accentCyan, soft: t.accentCyanGlow };
    case 'success':
      return { fg: t.success, soft: t.successSoft };
    case 'warning':
      return { fg: t.warning, soft: t.warningSoft };
    case 'danger':
      return { fg: t.danger, soft: t.dangerSoft };
    case 'neutral':
      return { fg: t.textMuted, soft: t.canvasElevated };
    default:
      return { fg: t.primaryLight, soft: t.primaryGlow };
  }
}

export function IconContainer({
  children,
  tone = 'primary',
  size = 44,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: number;
}) {
  const t = useTheme();
  const { fg, soft } = toneColors(t, tone);
  return (
    <View
      style={[
        s.iconBox,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: soft,
          borderColor: `${fg}30`,
        },
      ]}>
      {children}
    </View>
  );
}

export function Pill({ label, tone = 'primary' }: { label: string; tone?: Tone }) {
  const t = useTheme();
  const { fg, soft } = toneColors(t, tone);
  return (
    <View style={[s.pill, { backgroundColor: soft, borderColor: `${fg}40` }]}>
      <View style={[s.dot, { backgroundColor: fg }]} />
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Overline({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[s.overline, { color: t.accentCyan }]}>{children}</Text>;
}

export function CodeBlock({ command }: { command: string }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[s.code, { backgroundColor: t.codeBg, borderColor: t.codeBorder }]}>
      <Text selectable style={[s.codeText, { color: t.codeText }]}>
        <Text style={{ color: t.textMuted }}>$ </Text>
        {command}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy command"
        onPress={copy}
        style={({ pressed }) => [
          s.copy,
          {
            backgroundColor: copied ? t.successSoft : 'rgba(255, 255, 255, 0.08)',
            borderColor: copied ? t.success : t.borderSubtle,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        {copied ? (
          <>
            <Check size={14} color={t.success} />
            <Text style={[s.copyText, { color: t.success }]}>Copied</Text>
          </>
        ) : (
          <>
            <Copy size={14} color={t.textPrimary} />
            <Text style={[s.copyText, { color: t.textPrimary }]}>Copy</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export function FeatureRow({
  icon,
  title,
  body,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone?: Tone;
}) {
  const t = useTheme();
  return (
    <View style={s.feature}>
      <IconContainer tone={tone} size={42}>
        {icon}
      </IconContainer>
      <View style={s.featureCopy}>
        <Text style={[s.featureTitle, { color: t.textPrimary }]}>{title}</Text>
        <Text style={[s.featureBody, { color: t.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

export interface CyberToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
  tone?: 'success' | 'cyan';
  accessibilityLabel?: string;
}

export function CyberToggle({
  value,
  onValueChange,
  disabled = false,
  size = 'md',
  tone = 'success',
  accessibilityLabel,
}: CyberToggleProps) {
  const t = useTheme();
  const isLg = size === 'lg';

  const trackWidth = isLg ? 62 : 52;
  const trackHeight = isLg ? 34 : 28;
  const thumbSize = isLg ? 26 : 22;
  const travel = trackWidth - thumbSize - 6;

  const activeColor = tone === 'cyan' ? t.accentCyan : t.success;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={[
          s.cyberTrack,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackHeight / 2,
            backgroundColor: value ? `${activeColor}24` : 'rgba(255, 255, 255, 0.06)',
            borderColor: value ? activeColor : 'rgba(255, 255, 255, 0.16)',
            shadowColor: value ? activeColor : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: value ? 0.5 : 0,
            shadowRadius: 8,
            elevation: value ? 4 : 0,
          },
        ]}>
        {/* Micro text indicator inside track */}
        <View style={s.cyberTrackInner}>
          {value ? (
            <Text
              style={[
                s.cyberLabelOn,
                {
                  color: activeColor,
                  left: isLg ? 8 : 7,
                  fontSize: isLg ? 10 : 8.5,
                },
              ]}>
              ON
            </Text>
          ) : (
            <Text
              style={[
                s.cyberLabelOff,
                {
                  color: t.textMuted,
                  right: isLg ? 8 : 7,
                  fontSize: isLg ? 9.5 : 8,
                },
              ]}>
              OFF
            </Text>
          )}
        </View>

        {/* Sliding Thumb */}
        <View
          style={[
            s.cyberThumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              transform: [{ translateX: value ? travel : 0 }],
              backgroundColor: value ? '#FFFFFF' : '#475569',
              borderColor: value ? activeColor : 'rgba(255, 255, 255, 0.2)',
            },
          ]}>
          <View
            style={[
              s.cyberThumbDot,
              {
                width: isLg ? 8 : 6,
                height: isLg ? 8 : 6,
                borderRadius: isLg ? 4 : 3,
                backgroundColor: value ? activeColor : '#1E293B',
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  btnIcon: {
    marginRight: 2,
  },
  buttonText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    width: '100%',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  overline: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  code: {
    borderRadius: radius.md,
    padding: space.lg,
    paddingRight: 96,
    minHeight: 54,
    justifyContent: 'center',
    borderWidth: 1,
  },
  codeText: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    lineHeight: 20,
  },
  copy: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  copyText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  feature: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  featureCopy: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  featureBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  cyberTrack: {
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'relative',
  },
  cyberTrackInner: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  cyberLabelOn: {
    position: 'absolute',
    fontFamily: fonts.monoBold,
    letterSpacing: 0.5,
    fontWeight: '800',
  },
  cyberLabelOff: {
    position: 'absolute',
    fontFamily: fonts.monoBold,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  cyberThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  cyberThumbDot: {},
});
