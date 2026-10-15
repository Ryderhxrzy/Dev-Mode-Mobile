import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Cpu from 'lucide-react-native/icons/cpu';
import Crosshair from 'lucide-react-native/icons/crosshair';
import Hand from 'lucide-react-native/icons/hand';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import SunMedium from 'lucide-react-native/icons/sun-medium';
import Usb from 'lucide-react-native/icons/usb';
import Wifi from 'lucide-react-native/icons/wifi';
import Zap from 'lucide-react-native/icons/zap';
import LocalizedText from '@/components/LocalizedText';
import { Button, Card, CyberToggle, IconContainer, Pill } from '@/components/ui';
import DevToggle, {
  UNAVAILABLE_STATUS,
  type AnimationScales,
  type DeviceStatus,
  type PerformanceMetrics,
  type SettingName,
} from '@/modules/dev-toggle-native';
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

export interface DashboardViewProps {
  onStatusChange?: (status: DeviceStatus) => void;
  onOpenSettings?: () => void;
}

export function DashboardView({ onStatusChange, onOpenSettings }: DashboardViewProps) {
  const t = useTheme();
  const { reset } = useOnboarding();
  const [status, setStatus] = useState<DeviceStatus>(UNAVAILABLE_STATUS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Animation scales
  const [animationScales, setAnimationScales] = useState<AnimationScales>({
    window: 1.0,
    transition: 1.0,
    animator: 1.0,
  });

  // Extra dev settings (Stay awake, Show touches, Pointer location)
  const [extraSettings, setExtraSettings] = useState<{
    stayAwake: string;
    showTouches: string;
    pointerLocation: string;
  }>({
    stayAwake: 'unknown',
    showTouches: 'unknown',
    pointerLocation: 'unknown',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [newStatus, scales, extra, perf] = await Promise.all([
        DevToggle.getStatus(),
        DevToggle.getAnimationScales(),
        DevToggle.getExtraSettings().catch(() => ({ stayAwake: 'unknown', showTouches: 'unknown', pointerLocation: 'unknown' } as any)),
        DevToggle.getPerformanceMetrics().catch(() => null),
      ]);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      setAnimationScales(scales);
      if (perf) setMetrics(perf);
      if (extra) {
        setExtraSettings({
          stayAwake: extra.stayAwake || 'unknown',
          showTouches: extra.showTouches || 'unknown',
          pointerLocation: extra.pointerLocation || 'unknown',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getStatus(),
      DevToggle.getAnimationScales(),
      DevToggle.getExtraSettings().catch(() => ({ stayAwake: 'unknown', showTouches: 'unknown', pointerLocation: 'unknown' } as any)),
      DevToggle.getPerformanceMetrics().catch(() => null),
    ]).then(([st, sc, extra, perf]) => {
      if (active) {
        setStatus(st);
        onStatusChange?.(st);
        setAnimationScales(sc);
        if (perf) setMetrics(perf);
        if (extra) {
          setExtraSettings({
            stayAwake: extra.stayAwake || 'unknown',
            showTouches: extra.showTouches || 'unknown',
            pointerLocation: extra.pointerLocation || 'unknown',
          });
        }
        setLoading(false);
      }
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });

    const pollInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        Promise.all([
          DevToggle.getStatus(),
          DevToggle.getAnimationScales(),
          DevToggle.getExtraSettings().catch(() => ({ stayAwake: 'unknown', showTouches: 'unknown', pointerLocation: 'unknown' } as any)),
          DevToggle.getPerformanceMetrics().catch(() => null),
        ]).then(([st, sc, extra, perf]) => {
          if (active) {
            setStatus(st);
            onStatusChange?.(st);
            setAnimationScales(sc);
            if (perf) setMetrics(perf);
            if (extra) {
              setExtraSettings({
                stayAwake: extra.stayAwake || 'unknown',
                showTouches: extra.showTouches || 'unknown',
                pointerLocation: extra.pointerLocation || 'unknown',
              });
            }
          }
        }).catch(() => {});
      }
    }, 1500);

    return () => {
      active = false;
      sub.remove();
      clearInterval(pollInterval);
    };
  }, [refresh, onStatusChange]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 2200);
    }
  }, []);

  const devOptionsEnabled = status.developerOptions === 'enabled';
  const granted = status.writeSecureSettings === 'granted';

  const toggle = useCallback(
    async (key: SettingName) => {
      setBusy(key);
      try {
        const willEnable = status[key] !== 'enabled';
        const result = await DevToggle.setEnabled(key, willEnable);

        if (key === 'developerOptions' && !willEnable) {
          const currentStatus = await DevToggle.getStatus();
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
    [status, refresh, showToast]
  );

  const toggleExtra = useCallback(
    async (setting: 'stayAwake' | 'showTouches' | 'pointerLocation') => {
      setBusy(setting);
      try {
        const willEnable = extraSettings[setting] !== 'enabled';
        const res = await DevToggle.setExtraSetting(setting, willEnable);
        setExtraSettings(prev => ({ ...prev, [setting]: willEnable ? 'enabled' : 'disabled' }));
        if (!res.changed) {
          showToast(res.message || 'Action failed');
        } else {
          const names: Record<string, string> = {
            stayAwake: 'Stay Awake While Charging',
            showTouches: 'Visual Touch Taps',
            pointerLocation: 'Pointer Location Tracker',
          };
          showToast(`${names[setting]}: ${willEnable ? 'Enabled' : 'Disabled'}`);
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

  useEffect(() => {
    if (status.wirelessDebugging !== 'enabled') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      if (cancelled) return;
      try {
        const ep = await DevToggle.getWirelessEndpoint?.();
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

  const applyQuickPreset = async () => {
    setBusy('preset');
    try {
      const res = await DevToggle.setAnimationScale('all', 0.5);
      await refresh();
      if (!res.changed) {
        Alert.alert('Error', res.message);
      } else {
        showToast('Speed Boost Applied: 0.5x scales');
      }
    } finally {
      setBusy(null);
    }
  };

  const selectScale = async (scale: number) => {
    setBusy('scale');
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
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={[t.accentCyan]}
            tintColor={t.accentCyan}
          />
        }>
        {/* Master Developer Options Switch Banner */}
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
                <LocalizedText style={[s.switchTitle, { color: t.textPrimary }]}>Developer Options</LocalizedText>
                <LocalizedText style={[s.switchDesc, { color: t.textSecondary }]}>
                  {devOptionsEnabled
                    ? 'System developer mode active'
                    : 'Disabled in system settings'}
                </LocalizedText>
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
                <Button
                  label="Authorize"
                  variant="primary"
                  onPress={() => onOpenSettings?.()}
                />
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Status Chip Bar */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)} style={s.statusChipRow}>
          <View style={[s.statusChip, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
            <View style={[s.dot, { backgroundColor: devOptionsEnabled ? '#22C55E' : '#EF4444' }]} />
            <LocalizedText style={[s.statusChipLabel, { color: t.textSecondary }]}>DEV MODE</LocalizedText>
            <LocalizedText style={[s.statusChipValue, { color: devOptionsEnabled ? t.success : t.textMuted }]}>
              {devOptionsEnabled ? 'ON' : 'OFF'}
            </LocalizedText>
          </View>
          <View style={[s.statusChip, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
            <View style={[s.dot, { backgroundColor: status.usbDebugging === 'enabled' ? '#22C55E' : '#64748B' }]} />
            <LocalizedText style={[s.statusChipLabel, { color: t.textSecondary }]}>USB ADB</LocalizedText>
            <LocalizedText style={[s.statusChipValue, { color: status.usbDebugging === 'enabled' ? t.success : t.textMuted }]}>
              {status.usbDebugging === 'enabled' ? 'ON' : 'OFF'}
            </LocalizedText>
          </View>
          <View style={[s.statusChip, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
            <View style={[s.dot, { backgroundColor: status.wirelessDebugging === 'enabled' ? '#22C55E' : '#64748B' }]} />
            <LocalizedText style={[s.statusChipLabel, { color: t.textSecondary }]}>WI-FI ADB</LocalizedText>
            <LocalizedText style={[s.statusChipValue, { color: status.wirelessDebugging === 'enabled' ? t.success : t.textMuted }]}>
              {status.wirelessDebugging === 'enabled' ? 'ON' : 'OFF'}
            </LocalizedText>
          </View>
        </Animated.View>

        {/* Section: Core Hardware Controls */}
        <Animated.View entering={FadeInDown.delay(90).duration(300)}>
          <View style={s.sectionHeader}>
            <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>CORE HARDWARE CONTROLS</LocalizedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh settings" onPress={refresh}>
              <LocalizedText style={[s.refreshText, { color: t.accentCyan }]}>SYNC</LocalizedText>
            </Pressable>
          </View>

          <View style={s.list}>
            {/* USB Debugging */}
            <Card style={{ borderColor: status.usbDebugging === 'enabled' ? `${t.success}60` : `${t.accentCyan}20` }}>
              <View style={s.cardRow}>
                <IconContainer tone={status.usbDebugging === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Usb size={20} color={status.usbDebugging === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.cardCopy}>
                  <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>USB Debugging</LocalizedText>
                  <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>Allow physical USB cable ADB debugging commands</LocalizedText>
                </View>
                {busy === 'usbDebugging' ? (
                  <ActivityIndicator color={t.accentCyan} />
                ) : (
                  <CyberToggle
                    accessibilityLabel="Toggle USB Debugging"
                    value={status.usbDebugging === 'enabled'}
                    onValueChange={() => toggle('usbDebugging')}
                    disabled={!granted}
                  />
                )}
              </View>
            </Card>

            {/* Wireless Debugging */}
            <Card style={{ borderColor: status.wirelessDebugging === 'enabled' ? `${t.success}60` : `${t.accentCyan}20` }}>
              <View style={s.cardRow}>
                <IconContainer tone={status.wirelessDebugging === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Wifi size={20} color={status.wirelessDebugging === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.cardCopy}>
                  <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Wireless Debugging</LocalizedText>
                  <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>
                    {status.wirelessDebugging === 'enabled' && status.wirelessEndpoint
                      ? `Active on ${status.wirelessEndpoint}`
                      : 'Execute ADB commands over Wi-Fi network'}
                  </LocalizedText>
                </View>
                {busy === 'wirelessDebugging' ? (
                  <ActivityIndicator color={t.accentCyan} />
                ) : (
                  <CyberToggle
                    accessibilityLabel="Toggle Wireless Debugging"
                    value={status.wirelessDebugging === 'enabled'}
                    onValueChange={() => toggle('wirelessDebugging')}
                    disabled={!granted}
                  />
                )}
              </View>
            </Card>
          </View>
        </Animated.View>

        {/* Extra Dev Settings */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <View style={s.sectionHeader}>
            <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>DEVELOPER TOOLS & TWEAKS</LocalizedText>
          </View>

          <View style={s.list}>
            <Card style={{ borderColor: extraSettings.stayAwake === 'enabled' ? `${t.success}60` : `${t.accentCyan}20` }}>
              <View style={s.cardRow}>
                <IconContainer tone={extraSettings.stayAwake === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <SunMedium size={20} color={extraSettings.stayAwake === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.cardCopy}>
                  <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Stay Awake While Charging</LocalizedText>
                  <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>Screen will not sleep when connected to power</LocalizedText>
                </View>
                {busy === 'stayAwake' ? (
                  <ActivityIndicator color={t.accentCyan} />
                ) : (
                  <CyberToggle
                    accessibilityLabel="Toggle Stay Awake"
                    value={extraSettings.stayAwake === 'enabled'}
                    onValueChange={() => toggleExtra('stayAwake')}
                  />
                )}
              </View>
            </Card>

            <Card style={{ borderColor: extraSettings.showTouches === 'enabled' ? `${t.success}60` : `${t.accentCyan}20` }}>
              <View style={s.cardRow}>
                <IconContainer tone={extraSettings.showTouches === 'enabled' ? 'success' : 'cyan'} size={44}>
                  <Hand size={20} color={extraSettings.showTouches === 'enabled' ? t.success : t.accentCyan} />
                </IconContainer>
                <View style={s.cardCopy}>
                  <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Visual Touch Taps</LocalizedText>
                  <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>Show circular visual highlights on screen touches</LocalizedText>
                </View>
                {busy === 'showTouches' ? (
                  <ActivityIndicator color={t.accentCyan} />
                ) : (
                  <CyberToggle
                    accessibilityLabel="Toggle Visual Touches"
                    value={extraSettings.showTouches === 'enabled'}
                    onValueChange={() => toggleExtra('showTouches')}
                  />
                )}
              </View>
            </Card>

            <Card style={{ borderColor: extraSettings.pointerLocation === 'enabled' ? `${t.success}60` : `${t.warning}30` }}>
              <View style={s.cardRow}>
                <IconContainer tone={extraSettings.pointerLocation === 'enabled' ? 'success' : 'warning'} size={44}>
                  <Crosshair size={20} color={extraSettings.pointerLocation === 'enabled' ? t.success : t.warning} />
                </IconContainer>
                <View style={s.cardCopy}>
                  <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Pointer Location Tracker</LocalizedText>
                  <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>Coordinate overlay showing touch paths and pressure</LocalizedText>
                </View>
                {busy === 'pointerLocation' ? (
                  <ActivityIndicator color={t.warning} />
                ) : (
                  <CyberToggle
                    accessibilityLabel="Toggle Pointer Location"
                    value={extraSettings.pointerLocation === 'enabled'}
                    onValueChange={() => toggleExtra('pointerLocation')}
                  />
                )}
              </View>
            </Card>
          </View>
        </Animated.View>

        {/* Animation Scales Quick Presets */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <View style={s.sectionHeader}>
            <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>SYSTEM ANIMATION TUNER</LocalizedText>
          </View>

          <Card style={{ borderColor: `${t.primary}30` }}>
            <View style={s.scaleHeaderRow}>
              <View>
                <LocalizedText style={[s.scaleTitle, { color: t.textPrimary }]}>Global Animation Speed</LocalizedText>
                <LocalizedText style={[s.scaleSubtitle, { color: t.textSecondary }]}>
                  Current: {currentScaleObj.label}
                </LocalizedText>
              </View>
              <Pill label={currentScaleObj.short} tone="primary" />
            </View>

            <View style={s.scalePillRow}>
              {SCALE_OPTIONS.map(opt => {
                const isSelected = Math.abs(opt.value - animationScales.window) < 0.05;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Set scale to ${opt.label}`}
                    onPress={() => selectScale(opt.value)}
                    style={({ pressed }) => [
                      s.scaleChip,
                      {
                        backgroundColor: isSelected ? t.primary : t.canvas,
                        borderColor: isSelected ? t.primary : t.cardBorder,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <LocalizedText
                      style={[
                        s.scaleChipText,
                        { color: isSelected ? '#FFFFFF' : t.textSecondary },
                      ]}>
                      {opt.short}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* Quick Speed Boost Banner */}
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Card style={{ borderColor: `${t.primary}50`, backgroundColor: t.canvasElevated }}>
            <View style={s.presetRow}>
              <IconContainer tone="primary" size={44}>
                <Zap size={22} color={t.primary} />
              </IconContainer>
              <View style={s.presetCopy}>
                <LocalizedText style={[s.presetTitle, { color: t.textPrimary }]}>Snappy Speed Booster</LocalizedText>
                <LocalizedText style={[s.presetDesc, { color: t.textSecondary }]}>
                  Tune all animations to 0.5x for instant UI response and ultra-fast transitions.
                </LocalizedText>
              </View>
            </View>
            <Button
              label={busy === 'preset' ? 'Applying...' : 'Apply 0.5x Speed Boost'}
              icon={<Zap size={16} color="#FFFFFF" />}
              variant="primary"
              disabled={busy === 'preset'}
              onPress={applyQuickPreset}
              style={{ marginTop: space.sm }}
            />
          </Card>
        </Animated.View>

        {/* Live Performance & Hardware Stats */}
        {metrics && (
          <Animated.View entering={FadeInDown.delay(210).duration(300)}>
            <View style={s.sectionHeader}>
              <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>DEVICE METRICS & HARDWARE</LocalizedText>
            </View>
            <View style={s.statsGrid}>
              <View style={[s.statCard, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                <LocalizedText style={[s.statLabel, { color: t.textMuted }]}>BATTERY</LocalizedText>
                <LocalizedText style={[s.statValue, { color: t.textPrimary }]}>{metrics.battery.level}%</LocalizedText>
                <LocalizedText style={[s.statSub, { color: metrics.battery.isCharging ? t.success : t.textSecondary }]}>
                  {metrics.battery.isCharging ? 'Charging' : 'Discharging'}
                </LocalizedText>
              </View>
              <View style={[s.statCard, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                <LocalizedText style={[s.statLabel, { color: t.textMuted }]}>RAM USED</LocalizedText>
                <LocalizedText style={[s.statValue, { color: t.textPrimary }]}>{metrics.ram.percentage}%</LocalizedText>
                <LocalizedText style={[s.statSub, { color: t.textSecondary }]}>{metrics.ram.usedMb}MB / {metrics.ram.totalMb}MB</LocalizedText>
              </View>
              <View style={[s.statCard, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                <LocalizedText style={[s.statLabel, { color: t.textMuted }]}>CPU CORES</LocalizedText>
                <LocalizedText style={[s.statValue, { color: t.textPrimary }]}>{metrics.cpu.cores} Cores</LocalizedText>
                <LocalizedText style={[s.statSub, { color: t.textSecondary }]}>Thermal: {metrics.thermal.status || 'Normal'}</LocalizedText>
              </View>
              <View style={[s.statCard, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                <LocalizedText style={[s.statLabel, { color: t.textMuted }]}>AUTH STATE</LocalizedText>
                <LocalizedText style={[s.statValue, { color: granted ? t.success : t.warning, fontSize: 13 }]}>
                  {granted ? 'Authorized' : 'Pending'}
                </LocalizedText>
                <LocalizedText style={[s.statSub, { color: t.textSecondary }]}>Secure settings</LocalizedText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Local Dev Replay button */}
        {__DEV__ && (
          <View style={s.devRow}>
            <Button
              variant="secondary"
              label="Replay Intro"
              icon={<RotateCcw size={15} color={t.textSecondary} />}
              onPress={replayIntro}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {!status.nativeAvailable && !loading && (
          <View style={[s.unsupportedBox, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
            <LocalizedText style={[s.unsupportedText, { color: t.textMuted }]}>
              Live hardware queries require an Android development or production build APK. Expo Go environment runs in mock mode.
            </LocalizedText>
          </View>
        )}
      </ScrollView>

      {toastMessage && (
        <Animated.View entering={FadeInUp.duration(180)} exiting={FadeOutDown.duration(180)} style={[s.bottomToast, { bottom: 84 }]} pointerEvents="none">
          <View style={s.toastContainer}>
            <CheckCircle2 size={16} color="#22C55E" />
            <LocalizedText style={s.toastText}>{toastMessage}</LocalizedText>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 110,
    gap: space.md,
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontFamily: fonts.heading,
    fontSize: 16.5,
  },
  switchDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 16,
  },
  statusChipRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statusChipValue: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  refreshText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  list: {
    gap: space.sm,
  },
  scaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  scaleTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  scaleSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  scalePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  scaleChipText: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  presetCopy: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontFamily: fonts.heading,
    fontSize: 15.5,
  },
  presetDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  statSub: {
    fontFamily: fonts.body,
    fontSize: 11.5,
  },
  devRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  unsupportedBox: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  unsupportedText: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
  bottomToast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    alignItems: 'center',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F2318',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  toastText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
