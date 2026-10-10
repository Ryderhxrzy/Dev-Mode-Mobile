import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Cpu,
  Usb,
  Wifi,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Sliders,
  RotateCcw,
  Lock,
  EyeOff,
  Zap,
  Gauge,
  Layers,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import DevToggle, {
  UNAVAILABLE_STATUS,
  type AnimationScales,
  type DeviceStatus,
  type SettingName,
} from '@/modules/dev-toggle-native';
import { Button, Card, FeatureRow, IconContainer, Overline, Pill } from '@/components/ui';
import { useOnboarding } from '@/state/onboarding';
import { fonts, radius, space, useTheme } from '@/theme';

const SETTINGS: {
  key: SettingName;
  iconType: 'cpu' | 'usb' | 'wifi';
  title: string;
  description: string;
}[] = [
  {
    key: 'developerOptions',
    iconType: 'cpu',
    title: 'Developer Options',
    description: 'System-wide Android developer settings toggle.',
  },
  {
    key: 'usbDebugging',
    iconType: 'usb',
    title: 'USB Debugging',
    description: 'Permits authorized computers to debug device over USB cable.',
  },
  {
    key: 'wirelessDebugging',
    iconType: 'wifi',
    title: 'Wireless Debugging',
    description: 'Accepts local Wi-Fi ADB connections on supported Android versions.',
  },
];

const ANIMATION_PRESETS = [
  { label: 'Off (0x)', value: 0.0 },
  { label: '0.5x (Optimized)', value: 0.5 },
  { label: '1.0x (Default)', value: 1.0 },
  { label: '1.5x', value: 1.5 },
];

export default function Dashboard() {
  const t = useTheme();
  const { reset } = useOnboarding();
  const [status, setStatus] = useState<DeviceStatus>(UNAVAILABLE_STATUS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Animation scales
  const [animationScales, setAnimationScales] = useState<AnimationScales>({
    window: 1.0,
    transition: 1.0,
    animator: 1.0,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [newStatus, scales] = await Promise.all([
        DevToggle.getStatus(),
        DevToggle.getAnimationScales(),
      ]);
      setStatus(newStatus);
      setAnimationScales(scales);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([DevToggle.getStatus(), DevToggle.getAnimationScales()]).then(([st, sc]) => {
      if (active) {
        setStatus(st);
        setAnimationScales(sc);
        setLoading(false);
      }
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [refresh]);

  const granted = status.writeSecureSettings === 'granted';
  const devOptionsEnabled = status.developerOptions === 'enabled';
  const isSpeedOptimized =
    animationScales.window <= 0.5 &&
    animationScales.transition <= 0.5 &&
    animationScales.animator <= 0.5;

  const open = async (key: SettingName) => {
    const result = await DevToggle.openSettings(key);
    if (!result.opened) Alert.alert('Open Settings', result.message);
  };

  const toggle = async (key: SettingName) => {
    setBusy(key);
    try {
      const result = await DevToggle.setEnabled(key, status[key] !== 'enabled');
      await refresh();
      if (!result.changed) Alert.alert('Action Denied', result.message);
    } finally {
      setBusy(null);
    }
  };

  // Speed Optimization Toggle (Default: 0.5x when turned on)
  const toggleSpeedOptimization = async (enable: boolean) => {
    setBusy('speedOptimizer');
    const targetScale = enable ? 0.5 : 1.0;
    try {
      const res = await DevToggle.setAnimationScale('all', targetScale);
      await refresh();
      if (!res.changed) Alert.alert('Optimization Failed', res.message);
    } finally {
      setBusy(null);
    }
  };

  const changeAnimationScale = async (scale: number) => {
    setBusy('customScale');
    try {
      const res = await DevToggle.setAnimationScale('all', scale);
      await refresh();
      if (!res.changed) Alert.alert('Error', res.message);
    } finally {
      setBusy(null);
    }
  };

  const replayIntro = () =>
    Alert.alert('Replay Onboarding?', 'Return to the welcome, privacy breakdown, and ADB setup screens.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replay', onPress: () => reset() },
    ]);

  const renderIcon = (type: 'cpu' | 'usb' | 'wifi', active: boolean) => {
    switch (type) {
      case 'cpu':
        return <Cpu size={22} color={active ? t.success : t.accentCyan} />;
      case 'usb':
        return <Usb size={22} color={active ? t.success : t.primaryLight} />;
      case 'wifi':
        return <Wifi size={22} color={active ? t.success : t.accentCyan} />;
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              colors={[t.accentCyan]}
              tintColor={t.accentCyan}
            />
          }>
          {/* Top Bar with brand icon */}
          <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
            <View style={s.brandGroup}>
              <Image
                source={require('@/assets/images/icon2.png')}
                style={s.headerLogoImage}
                resizeMode="contain"
              />
              <View style={{ gap: 2 }}>
                <Overline>DEVICE CONTROL</Overline>
                <Text style={[s.title, { color: t.textPrimary }]}>Dev Mode</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Extra Settings"
              onPress={() => router.push('/dev-settings')}
              style={({ pressed }) => [s.settingsBtn, { backgroundColor: t.canvasElevated, opacity: pressed ? 0.7 : 1 }]}>
              <SettingsIcon size={18} color={t.textPrimary} />
            </Pressable>
          </Animated.View>

          {/* Master Developer Options Switch Banner */}
          <Animated.View entering={FadeInDown.delay(30).duration(300)}>
            <Card
              style={{
                borderColor: devOptionsEnabled ? `${t.success}60` : t.cardBorder,
                backgroundColor: devOptionsEnabled ? t.canvasElevated : t.canvas,
              }}>
              <View style={s.masterRow}>
                <IconContainer tone={devOptionsEnabled ? 'success' : 'neutral'} size={48}>
                  <Cpu size={24} color={devOptionsEnabled ? t.success : t.textMuted} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.masterTitle, { color: t.textPrimary }]}>Developer Options</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    {devOptionsEnabled ? 'Developer mode is currently ON' : 'Developer mode is currently OFF'}
                  </Text>
                </View>
                {granted ? (
                  busy === 'developerOptions' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <Switch
                      accessibilityLabel="Developer Options Master Switch"
                      value={devOptionsEnabled}
                      onValueChange={() => toggle('developerOptions')}
                      trackColor={{ false: t.borderSubtle, true: t.success }}
                      thumbColor="#FFFFFF"
                    />
                  )
                ) : (
                  <Pill label={devOptionsEnabled ? 'ON' : 'OFF'} tone={devOptionsEnabled ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Speed & Animation Scales Optimizer Card (0.5x default) */}
          <Animated.View entering={FadeInDown.delay(60).duration(300)}>
            <Card style={{ borderColor: isSpeedOptimized ? `${t.neonGlow}50` : t.cardBorder }}>
              <View style={s.masterRow}>
                <IconContainer tone={isSpeedOptimized ? 'cyan' : 'neutral'} size={48}>
                  <Zap size={24} color={isSpeedOptimized ? t.neonGlow : t.textMuted} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.masterTitle, { color: t.textPrimary }]}>Device Speed Booster</Text>
                    <Pill
                      label={isSpeedOptimized ? '0.5X ACTIVE' : `${animationScales.window}X`}
                      tone={isSpeedOptimized ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Optimizes Android UI animations to 0.5x for snappy, instant app switching and responses.
                  </Text>
                </View>

                {granted ? (
                  busy === 'speedOptimizer' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <Switch
                      accessibilityLabel="Speed Optimizer Switch"
                      value={isSpeedOptimized}
                      onValueChange={toggleSpeedOptimization}
                      trackColor={{ false: t.borderSubtle, true: t.success }}
                      thumbColor="#FFFFFF"
                    />
                  )
                ) : (
                  <Pill label={isSpeedOptimized ? '0.5X' : '1.0X'} tone={isSpeedOptimized ? 'success' : 'neutral'} />
                )}
              </View>

              {/* Animation Scales Preset Customizer */}
              {granted && (
                <View style={s.scalesSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Gauge size={14} color={t.accentCyan} />
                    <Text style={[s.scaleLabel, { color: t.textSecondary }]}>Customize Animation Duration Scale:</Text>
                  </View>

                  <View style={s.presetsRow}>
                    {ANIMATION_PRESETS.map(preset => {
                      const isSelected = Math.abs(animationScales.window - preset.value) < 0.05;
                      return (
                        <Pressable
                          key={preset.label}
                          accessibilityRole="button"
                          onPress={() => changeAnimationScale(preset.value)}
                          style={[
                            s.presetChip,
                            {
                              backgroundColor: isSelected ? t.primaryGlow : t.canvasElevated,
                              borderColor: isSelected ? t.primaryLight : t.cardBorder,
                            },
                          ]}>
                          <Text
                            style={[
                              s.presetChipText,
                              { color: isSelected ? t.textPrimary : t.textSecondary },
                            ]}>
                            {preset.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Pending Permission Notice */}
          {!granted && (
            <Animated.View entering={FadeInDown.delay(90).duration(300)}>
              <Card style={{ backgroundColor: t.warningSoft, borderColor: `${t.warning}40` }}>
                <FeatureRow
                  tone="warning"
                  icon={<ShieldAlert size={20} color={t.warning} />}
                  title="ADB Permission Required"
                  body="Grant WRITE_SECURE_SETTINGS from your computer to unlock direct toggles and animation booster."
                />
                <Button
                  variant="primary"
                  label="Authorize via ADB Guide"
                  icon={<Sliders size={16} color="#FFFFFF" />}
                  onPress={() => router.push('/setup')}
                />
              </Card>
            </Animated.View>
          )}

          {/* Quick Hardware Switches */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>HARDWARE SWITCHES</Text>
          </View>

          {SETTINGS.filter(x => x.key !== 'developerOptions').map((item, i) => {
            const state = status[item.key];
            const isEnabled = state === 'enabled';

            return (
              <Animated.View key={item.key} entering={FadeInDown.delay(110 + i * 40).duration(300)}>
                <Card>
                  <View style={s.switchRow}>
                    <IconContainer tone={isEnabled ? 'success' : 'cyan'} size={44}>
                      {renderIcon(item.iconType, isEnabled)}
                    </IconContainer>

                    <View style={s.switchCopy}>
                      <Text style={[s.switchTitle, { color: t.textPrimary }]}>{item.title}</Text>
                      <Text style={[s.switchDesc, { color: t.textSecondary }]}>{item.description}</Text>
                    </View>

                    {granted ? (
                      busy === item.key ? (
                        <ActivityIndicator color={t.accentCyan} />
                      ) : (
                        <Switch
                          accessibilityLabel={`${item.title} switch`}
                          value={isEnabled}
                          onValueChange={() => toggle(item.key)}
                          trackColor={{ false: t.borderSubtle, true: t.success }}
                          thumbColor="#FFFFFF"
                        />
                      )
                    ) : (
                      <Pill label={isEnabled ? 'ON' : 'OFF'} tone={isEnabled ? 'success' : 'neutral'} />
                    )}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => open(item.key)}
                    style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={[s.linkText, { color: t.accentCyan }]}>Open in System Settings</Text>
                    <ExternalLink size={14} color={t.accentCyan} />
                  </Pressable>
                </Card>
              </Animated.View>
            );
          })}

          {/* Additional Settings & Tools Access */}
          <Animated.View entering={FadeInDown.delay(180).duration(300)}>
            <Card style={{ backgroundColor: t.canvasElevated }}>
              <View style={s.switchRow}>
                <IconContainer tone="cyan" size={44}>
                  <Layers size={22} color={t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.switchTitle, { color: t.textPrimary }]}>More Developer Settings</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Stay awake while plugged in, show visual touch taps, pointer tracking, and more.
                  </Text>
                </View>
              </View>
              <Button
                variant="secondary"
                label="Open Extra Settings"
                icon={<Sliders size={16} color="#FFFFFF" />}
                onPress={() => router.push('/dev-settings')}
              />
            </Card>
          </Animated.View>

          {/* Security & Device Guarantee Section */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>SECURITY & PRIVACY</Text>
          </View>

          <Card>
            <FeatureRow
              tone="success"
              icon={<ShieldCheck size={20} color={t.success} />}
              title="Device-Exclusive Data"
              body="No third-party access. All toggle preferences and metrics remain 100% on this smartphone."
            />
            <FeatureRow
              tone="success"
              icon={<EyeOff size={20} color={t.success} />}
              title="Zero Telemetry & Offline"
              body="No ads, background analytics, or online servers required."
            />
            <FeatureRow
              tone={granted ? 'success' : 'neutral'}
              icon={<Lock size={20} color={granted ? t.success : t.textMuted} />}
              title={`ADB Permission: ${granted ? 'Verified Active' : 'Not Granted'}`}
              body="Restricted exclusively to system developer settings."
            />

            <View style={s.actionRow}>
              <Button
                variant="secondary"
                label="ADB Guide"
                icon={<Sliders size={15} color="#FFFFFF" />}
                onPress={() => router.push('/setup')}
                style={{ flex: 1 }}
              />
              <Button
                variant="ghost"
                label="Replay Intro"
                icon={<RotateCcw size={15} color={t.textSecondary} />}
                onPress={replayIntro}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {!status.nativeAvailable && !loading && (
            <View style={[s.unsupportedBox, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
              <Text style={[s.unsupportedText, { color: t.textMuted }]}>
                Live hardware queries require an Android development or production build APK. Expo Go environment runs in mock mode.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 28,
    gap: space.md,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.sm,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerLogoImage: {
    width: 38,
    height: 38,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  masterTitle: {
    fontFamily: fonts.heading,
    fontSize: 16.5,
  },
  scalesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.md,
    gap: space.sm,
  },
  scaleLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: space.xs,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
  },
  sectionHeader: { marginTop: space.xs },
  sectionTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  switchCopy: {
    flex: 1,
    gap: 3,
  },
  switchTitle: {
    fontFamily: fonts.heading,
    fontSize: 15.5,
  },
  switchDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  linkText: {
    fontFamily: fonts.headingMedium,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
  unsupportedBox: {
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  unsupportedText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
  },
});
