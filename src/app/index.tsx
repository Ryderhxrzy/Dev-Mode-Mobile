import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Cpu,
  Usb,
  Wifi,
  ShieldAlert,
  Sliders,
  RotateCcw,
  Zap,
  CheckCircle2,
  Settings as SettingsIcon,
  SunMedium,
  Hand,
} from 'lucide-react-native';
import DevToggle, {
  UNAVAILABLE_STATUS,
  type AnimationScales,
  type DeviceStatus,
  type SettingName,
} from '@/modules/dev-toggle-native';
import { Button, Card, CyberToggle, FeatureRow, IconContainer, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useOnboarding } from '@/state/onboarding';
import { fonts, radius, space, useTheme } from '@/theme';

export const SCALE_OPTIONS = [
  { label: '0.0x (Off - Instant)', value: 0.0, short: '0.0X' },
  { label: '0.25x (Ultra Fast)', value: 0.25, short: '0.25X' },
  { label: '0.5x (Optimized - Default)', value: 0.5, short: '0.5X' },
  { label: '0.75x (Snappy)', value: 0.75, short: '0.75X' },
  { label: '1.0x (Standard Default)', value: 1.0, short: '1.0X' },
  { label: '1.5x (Relaxed)', value: 1.5, short: '1.5X' },
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

  // Extra dev settings (Stay awake & Show touches)
  const [extraSettings, setExtraSettings] = useState<{
    stayAwake: string;
    showTouches: string;
  }>({
    stayAwake: 'unknown',
    showTouches: 'unknown',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [newStatus, scales, extra] = await Promise.all([
        DevToggle.getStatus(),
        DevToggle.getAnimationScales(),
        DevToggle.getExtraSettings().catch(() => ({ stayAwake: 'unknown', showTouches: 'unknown' } as any)),
      ]);
      setStatus(newStatus);
      setAnimationScales(scales);
      if (extra) {
        setExtraSettings({
          stayAwake: extra.stayAwake || 'unknown',
          showTouches: extra.showTouches || 'unknown',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getStatus(),
      DevToggle.getAnimationScales(),
      DevToggle.getExtraSettings().catch(() => ({ stayAwake: 'unknown', showTouches: 'unknown' } as any)),
    ]).then(([st, sc, extra]) => {
      if (active) {
        setStatus(st);
        setAnimationScales(sc);
        if (extra) {
          setExtraSettings({
            stayAwake: extra.stayAwake || 'unknown',
            showTouches: extra.showTouches || 'unknown',
          });
        }
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
  const isSpeedOptimized = animationScales.window <= 0.5 && animationScales.transition <= 0.5;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    if (Platform.OS === 'android') {
      try {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } catch {}
    }
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const toggle = useCallback(
    async (key: SettingName) => {
      setBusy(key);
      try {
        const currentStatus = await DevToggle.getStatus();
        const willEnable = currentStatus[key] !== 'enabled';

        if ((key === 'usbDebugging' || key === 'wirelessDebugging') && willEnable) {
          if (currentStatus.developerOptions !== 'enabled') {
            const label = key === 'usbDebugging' ? 'USB Debugging' : 'Wireless Debugging';
            showToast(`Developer Mode must be ON to enable ${label}`);
            return;
          }
        }

        const result = await DevToggle.setEnabled(key, willEnable);

        if (key === 'developerOptions' && !willEnable) {
          if (currentStatus.usbDebugging === 'enabled') {
            await DevToggle.setEnabled('usbDebugging', false);
          }
          if (currentStatus.wirelessDebugging === 'enabled') {
            await DevToggle.setEnabled('wirelessDebugging', false);
          }
        }

        await refresh();
        if (!result.changed) {
          showToast(result.message || 'Action Denied');
        } else {
          const labels: Record<SettingName, string> = {
            developerOptions: 'Developer Options',
            usbDebugging: 'USB Debugging',
            wirelessDebugging: 'Wireless Debugging',
          };
          showToast(`${labels[key]}: ${willEnable ? 'Enabled' : 'Disabled'}`);
        }
      } finally {
        setBusy(null);
      }
    },
    [refresh, showToast]
  );

  const toggleExtra = useCallback(
    async (setting: 'stayAwake' | 'showTouches') => {
      setBusy(setting);
      try {
        const willEnable = extraSettings[setting] !== 'enabled';
        const res = await DevToggle.setExtraSetting(setting, willEnable);
        setExtraSettings(prev => ({ ...prev, [setting]: willEnable ? 'enabled' : 'disabled' }));
        if (!res.changed) {
          showToast(res.message || 'Action failed');
        } else {
          const name = setting === 'stayAwake' ? 'Stay Awake While Charging' : 'Visual Touch Taps';
          showToast(`${name}: ${willEnable ? 'Enabled' : 'Disabled'}`);
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to update setting');
      } finally {
        setBusy(null);
      }
    },
    [extraSettings, showToast]
  );

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const u = event.url;
      if (!u) return;
      if (u.includes('toggle/developerOptions')) {
        toggle('developerOptions');
      } else if (u.includes('toggle/usbDebugging')) {
        toggle('usbDebugging');
      } else if (u.includes('toggle/wirelessDebugging')) {
        toggle('wirelessDebugging');
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(initUrl => {
      if (initUrl) handleUrl({ url: initUrl });
    });

    return () => sub.remove();
  }, [toggle]);

  // Auto-resolve wireless endpoint when wireless debugging is active
  useEffect(() => {
    if (status.wirelessDebugging !== 'enabled') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      if (cancelled) return;
      try {
        const ep = await DevToggle.getWirelessEndpoint();
        if (cancelled) return;
        if (ep) {
          setStatus(prev => (prev.wirelessEndpoint !== ep ? { ...prev, wirelessEndpoint: ep } : prev));
        }
      } catch {}

      attempts++;
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(poll, attempts < 4 ? 700 : 1400);
      }
    };

    const timer = setTimeout(poll, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status.wirelessDebugging]);

  // Speed Booster: Direct toggle to 0.5x when turned ON, 1.0x when turned OFF
  const toggleSpeedBooster = async (enable: boolean) => {
    setBusy('speedOptimizer');
    const targetScale = enable ? 0.5 : 1.0;
    try {
      const res = await DevToggle.setAnimationScale('all', targetScale);
      await refresh();
      if (!res.changed) {
        Alert.alert('Optimization Failed', res.message);
      } else {
        showToast(`Device Speed Booster: ${enable ? '0.5x Enabled' : 'Disabled (1.0x)'}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const selectCustomScale = async (scale: number) => {
    setBusy('customScale');
    try {
      const res = await DevToggle.setAnimationScale('all', scale);
      await refresh();
      if (!res.changed) {
        Alert.alert('Error', res.message);
      } else {
        showToast(`Animation Scale: ${scale}x`);
      }
    } finally {
      setBusy(null);
    }
  };

  const replayIntro = () =>
    Alert.alert('Replay Onboarding?', 'Return to the welcome, privacy breakdown, and ADB setup screens.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replay', onPress: () => reset() },
    ]);

  const currentScaleObj =
    SCALE_OPTIONS.find(opt => Math.abs(opt.value - animationScales.window) < 0.05) ?? {
      label: `${animationScales.window}x (Custom)`,
      value: animationScales.window,
      short: `${animationScales.window}X`,
    };

  return (
    <ScreenBackground>
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
          {/* Top Bar with Centered App Icon & Developer Options Redirection */}
          <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Developer Options in Settings"
              onPress={() => {
                void DevToggle.openSettings('developerOptions');
              }}
              style={({ pressed }) => [s.brandGroup, { opacity: pressed ? 0.75 : 1 }]}>
              <View style={s.headerLogoContainer}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={s.headerLogoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[s.title, { color: t.textPrimary }]}>Dev Mode</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Developer Settings"
              onPress={() => router.push('/dev-settings')}
              style={({ pressed }) => [s.settingsBtn, { backgroundColor: t.canvasElevated, opacity: pressed ? 0.7 : 1 }]}>
              <SettingsIcon size={20} color={t.textPrimary} />
            </Pressable>
          </Animated.View>

          {/* Master Developer Options Switch Banner (Prominently Highlighted) */}
          <Animated.View entering={FadeInDown.delay(30).duration(300)}>
            <Card
              style={{
                borderColor: devOptionsEnabled ? `${t.success}90` : `${t.accentCyan}40`,
                backgroundColor: devOptionsEnabled ? t.canvasElevated : t.canvas,
                borderWidth: 1.5,
              }}>
              <View style={s.switchRow}>
                <IconContainer tone={devOptionsEnabled ? 'success' : 'cyan'} size={44}>
                  <Cpu size={22} color={devOptionsEnabled ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.switchTitle, { color: t.textPrimary }]}>Developer Options</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    {devOptionsEnabled
                      ? 'System developer mode active'
                      : 'Disabled in system settings'}
                  </Text>
                </View>
                {granted ? (
                  busy === 'developerOptions' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="Developer Options Master Switch"
                      value={devOptionsEnabled}
                      onValueChange={() => toggle('developerOptions')}
                      size="md"
                    />
                  )
                ) : (
                  <Pill label={devOptionsEnabled ? 'ON' : 'OFF'} tone={devOptionsEnabled ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Pending Permission Notice */}
          {!granted && (
            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
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

          {/* Core Hardware Debugging Switches */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>CORE DEBUGGING CONTROLS</Text>
          </View>

          {/* USB Debugging */}
          <Animated.View entering={FadeInDown.delay(90).duration(300)}>
            <Card>
              <View style={s.switchRow}>
                <IconContainer tone={status.usbDebugging === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Usb size={22} color={status.usbDebugging === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.switchTitle, { color: t.textPrimary }]}>USB Debugging</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Permits authorized computers to debug device over USB cable.
                  </Text>
                </View>
                {granted ? (
                  busy === 'usbDebugging' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="USB Debugging switch"
                      value={status.usbDebugging === 'enabled'}
                      onValueChange={() => toggle('usbDebugging')}
                      size="md"
                    />
                  )
                ) : (
                  <Pill label={status.usbDebugging === 'enabled' ? 'ON' : 'OFF'} tone={status.usbDebugging === 'enabled' ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Wireless Debugging with IP:Port Indicator */}
          <Animated.View entering={FadeInDown.delay(120).duration(300)}>
            <Card>
              <View style={s.switchRow}>
                <IconContainer tone={status.wirelessDebugging === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Wifi size={22} color={status.wirelessDebugging === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[s.switchTitle, { color: t.textPrimary }]}>Wireless Debugging</Text>
                    {status.wirelessDebugging === 'enabled' && (
                      status.wirelessEndpoint ? (
                        status.wirelessEndpoint.includes(':') ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Copy Wireless ADB Address"
                            onPress={async () => {
                              await Clipboard.setStringAsync(status.wirelessEndpoint!);
                              showToast(`Copied: ${status.wirelessEndpoint}`);
                            }}>
                            <Pill label={status.wirelessEndpoint} tone="success" />
                          </Pressable>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Open Wireless Debugging Settings"
                            onPress={async () => {
                              showToast('Opening Wireless Debugging Settings to view port...');
                              await DevToggle.openSettings('wirelessDebugging');
                            }}>
                            <Pill label={`${status.wirelessEndpoint} (Resolving...)`} tone="cyan" />
                          </Pressable>
                        )
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Open Wireless Debugging Settings"
                          onPress={async () => {
                            showToast('Opening Wireless Debugging Settings...');
                            await DevToggle.openSettings('wirelessDebugging');
                          }}>
                          <Pill label="Querying Socket..." tone="neutral" />
                        </Pressable>
                      )
                    )}
                  </View>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    {status.wirelessDebugging === 'enabled'
                      ? status.wirelessEndpoint?.includes(':')
                        ? `Listening on ${status.wirelessEndpoint}. Tap badge to copy "adb connect ${status.wirelessEndpoint}".`
                        : status.wirelessEndpoint
                          ? `Device IP is ${status.wirelessEndpoint}. Tap badge to open Wireless Debugging settings & view Port.`
                          : 'Wireless debugging is active. Ensure Wi-Fi is connected to display your IP:Port endpoint.'
                      : 'Accepts local Wi-Fi ADB connections on supported Android versions.'}
                  </Text>
                </View>
                {granted ? (
                  busy === 'wirelessDebugging' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="Wireless Debugging switch"
                      value={status.wirelessDebugging === 'enabled'}
                      onValueChange={() => toggle('wirelessDebugging')}
                      size="md"
                    />
                  )
                ) : (
                  <Pill label={status.wirelessDebugging === 'enabled' ? 'ON' : 'OFF'} tone={status.wirelessDebugging === 'enabled' ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Section: Device Speed Booster (Positioned Directly Below Core Controls) */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>DEVICE SPEED BOOSTER</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(140).duration(300)}>
            <Card
              style={{
                borderColor: isSpeedOptimized ? `${t.success}60` : t.cardBorder,
                backgroundColor: isSpeedOptimized ? t.canvasElevated : t.canvas,
              }}>
              <View style={s.masterRow}>
                <IconContainer tone={isSpeedOptimized ? 'success' : 'cyan'} size={44}>
                  <Zap size={22} color={isSpeedOptimized ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.masterTitle, { color: t.textPrimary }]}>Animation Speed</Text>
                    <Pill
                      label={isSpeedOptimized ? '0.5X BOOST' : currentScaleObj.short}
                      tone={isSpeedOptimized ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Sets UI animation scale to 0.5x for snappy, instant app responses.
                  </Text>
                </View>

                {granted ? (
                  busy === 'speedOptimizer' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="Speed Optimizer Switch"
                      value={isSpeedOptimized}
                      onValueChange={toggleSpeedBooster}
                      size="md"
                      tone="cyan"
                    />
                  )
                ) : (
                  <Pill label={isSpeedOptimized ? '0.5X' : '1.0X'} tone={isSpeedOptimized ? 'success' : 'neutral'} />
                )}
              </View>

              {/* Compact Preset Chips */}
              {granted && (
                <View style={[s.scalesSection, { paddingTop: space.sm }]}>
                  <View style={s.presetsRow}>
                    {SCALE_OPTIONS.slice(0, 4).map(opt => {
                      const isSelected = Math.abs(animationScales.window - opt.value) < 0.05;
                      return (
                        <Pressable
                          key={opt.value}
                          accessibilityRole="button"
                          onPress={() => selectCustomScale(opt.value)}
                          style={[
                            s.presetChip,
                            {
                              backgroundColor: isSelected ? t.successSoft : t.canvasElevated,
                              borderColor: isSelected ? t.success : t.borderSubtle,
                            },
                          ]}>
                          <Text
                            style={[
                              s.presetChipText,
                              { color: isSelected ? t.success : t.textSecondary, fontWeight: isSelected ? '700' : '400' },
                            ]}>
                            {opt.short}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Extended Developer Switches Section */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>EXTENDED DEVELOPER SWITCHES</Text>
          </View>

          {/* Stay Awake While Charging */}
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <Card>
              <View style={s.switchRow}>
                <IconContainer tone={extraSettings.stayAwake === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <SunMedium size={22} color={extraSettings.stayAwake === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.switchTitle, { color: t.textPrimary }]}>Stay Awake While Charging</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Screen stays on indefinitely while plugged into AC power or USB.
                  </Text>
                </View>
                {granted ? (
                  busy === 'stayAwake' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="Stay Awake switch"
                      value={extraSettings.stayAwake === 'enabled'}
                      onValueChange={() => toggleExtra('stayAwake')}
                      size="md"
                    />
                  )
                ) : (
                  <Pill label={extraSettings.stayAwake === 'enabled' ? 'ON' : 'OFF'} tone={extraSettings.stayAwake === 'enabled' ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Show Visual Touch Taps */}
          <Animated.View entering={FadeInDown.delay(180).duration(300)}>
            <Card>
              <View style={s.switchRow}>
                <IconContainer tone={extraSettings.showTouches === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Hand size={22} color={extraSettings.showTouches === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.switchCopy}>
                  <Text style={[s.switchTitle, { color: t.textPrimary }]}>Show Visual Touch Taps</Text>
                  <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                    Displays circular tap highlights wherever fingers touch the screen.
                  </Text>
                </View>
                {granted ? (
                  busy === 'showTouches' ? (
                    <ActivityIndicator color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel="Show Touches switch"
                      value={extraSettings.showTouches === 'enabled'}
                      onValueChange={() => toggleExtra('showTouches')}
                      size="md"
                    />
                  )
                ) : (
                  <Pill label={extraSettings.showTouches === 'enabled' ? 'ON' : 'OFF'} tone={extraSettings.showTouches === 'enabled' ? 'success' : 'neutral'} />
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Quick Link to Developer Settings for Pointer Location & More */}
          <Animated.View entering={FadeInDown.delay(195).duration(300)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/dev-settings')}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <Card style={{ backgroundColor: t.canvasElevated, borderColor: t.cardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 3, flex: 1 }}>
                    <Text style={[s.switchTitle, { color: t.textPrimary }]}>More Developer Options</Text>
                    <Text style={[s.switchDesc, { color: t.textSecondary }]}>
                      Pointer tracker crosshairs, custom scales, and full Android settings.
                    </Text>
                  </View>
                  <Pill label="SETTINGS" tone="primary" />
                </View>
              </Card>
            </Pressable>
          </Animated.View>

          {/* In Development Mode Only: Debug Actions */}
          {__DEV__ && (
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
          )}

          {!status.nativeAvailable && !loading && (
            <View style={[s.unsupportedBox, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
              <Text style={[s.unsupportedText, { color: t.textMuted }]}>
                Live hardware queries require an Android development or production build APK. Expo Go environment runs in mock mode.
              </Text>
            </View>
          )}
        </ScrollView>

        {toastMessage && (
          <Animated.View entering={FadeInUp.duration(180)} exiting={FadeOutDown.duration(180)} style={s.bottomToast} pointerEvents="none">
            <View style={s.toastContainer}>
              <CheckCircle2 size={16} color="#22C55E" />
              <Text style={s.toastText}>{toastMessage}</Text>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 32,
    gap: space.md,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: '#050D0A',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 44,
    height: 44,
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
  statusPillRow: {
    marginTop: 4,
    flexDirection: 'row',
  },
  scalesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.md,
    gap: space.sm,
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
  scaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dropdownBtnText: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  dropdownMenu: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 11,
  },
  dropdownItemText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
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
    fontSize: 15,
  },
  switchDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  unsupportedBox: {
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    marginTop: space.xs,
  },
  unsupportedText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  bottomToast: {
    position: 'absolute',
    bottom: 24,
    left: space.md,
    right: space.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: '#0E1D17',
    borderColor: '#22C55E',
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontFamily: fonts.monoBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
});
