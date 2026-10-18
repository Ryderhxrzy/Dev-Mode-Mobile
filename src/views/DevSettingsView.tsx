import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import LocalizedText from '@/components/LocalizedText';
import SunMedium from 'lucide-react-native/icons/sun-medium';
import Hand from 'lucide-react-native/icons/hand';
import Crosshair from 'lucide-react-native/icons/crosshair';
import Gauge from 'lucide-react-native/icons/gauge';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Shield from 'lucide-react-native/icons/shield';
import Trash2 from 'lucide-react-native/icons/trash';
import Layers from 'lucide-react-native/icons/layers';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Wifi from 'lucide-react-native/icons/wifi';
import Globe from 'lucide-react-native/icons/globe';
import Zap from 'lucide-react-native/icons/zap';
import DevToggle, {
  type AnimationScales,
  type ExtraSettingName,
  type NotificationMode,
  type SettingState,
} from '@/modules/dev-toggle-native';
import { Button, Card, CyberToggle, IconContainer, Overline } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';
import { SCALE_OPTIONS } from '@/views/DashboardView';

const ALL_EXTRA_SETTINGS: {
  key: ExtraSettingName;
  title: string;
  icon: 'stayAwake' | 'showTouches' | 'pointerLocation' | 'keepWirelessOn';
}[] = [
  // Web Remote Dashboard disabled.
  // {
  //   key: 'webRemote',
  //   title: 'Web Remote Dashboard (Local Dev Only)',
  //   icon: 'webRemote',
  // },
  {
    key: 'stayAwake',
    title: 'Stay Awake While Charging',
    icon: 'stayAwake',
  },
  {
    key: 'showTouches',
    title: 'Show Visual Touch Taps',
    icon: 'showTouches',
  },
  {
    key: 'pointerLocation',
    title: 'Pointer Location Tracker',
    icon: 'pointerLocation',
  },
  // Web Remote Dashboard disabled.
  // {
  //   key: 'autoWirelessConnect',
  //   title: 'Local Network Auto-Pairing',
  //   icon: 'keepWirelessOn',
  // },
  {
    key: 'keepWirelessOn',
    title: 'Keep Wireless Debugging On',
    icon: 'keepWirelessOn',
  },
];

const EXTRA_SETTINGS = ALL_EXTRA_SETTINGS;

export function DevSettingsView() {
  const t = useTheme();
  const [permission, setPermission] = useState<boolean>(false);
  const [canWriteSys, setCanWriteSys] = useState<boolean>(false);
  const [shizukuStatus, setShizukuStatus] = useState<string>('unavailable');
  const [busy, setBusy] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [animationScales, setAnimationScales] = useState<AnimationScales>({
    window: 1.0,
    transition: 1.0,
    animator: 1.0,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settings, setSettings] = useState<Record<ExtraSettingName, SettingState>>({
    stayAwake: 'unknown',
    showTouches: 'unknown',
    pointerLocation: 'unknown',
    keepWirelessOn: 'unknown',
  });
  const [notifMode, setNotifMode] = useState<NotificationMode>('always');
  const loadData = useCallback(async () => {
    try {
      const [perm, scales, extra, mode, canSys, shizuku] = await Promise.all([
        DevToggle.getPermissionStatus?.() ?? DevToggle.getStatus().then(s => s.writeSecureSettings),
        DevToggle.getAnimationScales(),
        DevToggle.getExtraSettings().catch(() => ({
          stayAwake: 'unknown',
          showTouches: 'unknown',
          pointerLocation: 'unknown',
          keepWirelessOn: 'unknown',
        } as Record<ExtraSettingName, SettingState>)),
        DevToggle.getNotificationMode?.().catch(() => 'always' as NotificationMode),
        DevToggle.canWriteSystemSettings?.().catch(() => false),
        DevToggle.getShizukuStatus?.().catch(() => 'unavailable'),
      ]);
      setPermission(perm === 'granted');
      setAnimationScales(scales);
      if (extra) setSettings(extra);
      if (mode) setNotifMode(mode);
      if (typeof canSys === 'boolean') setCanWriteSys(canSys);
      if (shizuku) setShizukuStatus(shizuku);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getPermissionStatus?.() ?? DevToggle.getStatus().then(s => s.writeSecureSettings),
      DevToggle.getAnimationScales(),
      DevToggle.getExtraSettings().catch(() => ({
        stayAwake: 'unknown',
        showTouches: 'unknown',
        pointerLocation: 'unknown',
        keepWirelessOn: 'unknown',
      } as Record<ExtraSettingName, SettingState>)),
      DevToggle.getNotificationMode?.().catch(() => 'always' as NotificationMode),
      DevToggle.canWriteSystemSettings?.().catch(() => false),
      DevToggle.getShizukuStatus?.().catch(() => 'unavailable'),
    ]).then(([perm, scales, extra, mode, canSys, shizuku]) => {
      if (!active) return;
      setPermission(perm === 'granted');
      setAnimationScales(scales);
      if (extra) setSettings(extra);
      if (mode) setNotifMode(mode);
      if (typeof canSys === 'boolean') setCanWriteSys(canSys);
      if (shizuku) setShizukuStatus(shizuku);
    }).catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadData();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [loadData]);

  const toggleExtra = async (key: ExtraSettingName) => {
    setBusy(key);
    try {
      const isEnabled = settings[key] === 'enabled';
      const willEnable = !isEnabled;
      const res = await DevToggle.setExtraSetting(key, willEnable);
      setSettings(prev => ({ ...prev, [key]: willEnable ? 'enabled' : 'disabled' }));
      if (!res.changed) {
        Alert.alert('Action Failed', res.message);
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show(`${willEnable ? 'Enabled' : 'Disabled'}`, ToastAndroid.SHORT);
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const applyQuickPreset = async () => {
    setBusy('speedBoost');
    try {
      const res = await DevToggle.setAnimationScale('all', 0.5);
      await loadData();
      if (!res.changed) {
        Alert.alert('Error', res.message);
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Speed Boost Active: 0.5x scales applied', ToastAndroid.SHORT);
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const selectScale = async (scale: number) => {
    setDropdownOpen(false);
    setBusy('scale');
    try {
      const res = await DevToggle.setAnimationScale('all', scale);
      await loadData();
      if (!res.changed) {
        Alert.alert('Error', res.message);
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show(`Animation Scale: ${scale}x`, ToastAndroid.SHORT);
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const handleInstantCleanup = async () => {
    setCleaningUp(true);
    try {
      await Promise.all([
        DevToggle.setAnimationScale('all', 1.0),
        DevToggle.setExtraSetting('stayAwake', false),
        DevToggle.setExtraSetting('showTouches', false),
        DevToggle.setExtraSetting('pointerLocation', false),
      ]);
      await loadData();
      Alert.alert(
        'Cleanup Complete',
        'Settings restored.'
      );
    } catch {
      Alert.alert('Cleanup Error', 'Failed to complete cleanup. Please check permissions.');
    } finally {
      setCleaningUp(false);
    }
  };

  const confirmCleanup = () => {
    Alert.alert(
      'Perform Instant Cleanup?',
      'Reset animations and overlays?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Everything', style: 'destructive', onPress: handleInstantCleanup },
      ]
    );
  };

  const currentScaleObj =
    SCALE_OPTIONS.find(opt => Math.abs(opt.value - animationScales.window) < 0.05) ?? {
      label: `${animationScales.window}x (Custom)`,
      value: animationScales.window,
      short: `${animationScales.window}X`,
    };

  const renderExtraIcon = (type: string, isEnabled: boolean) => {
    switch (type) {
      case 'stayAwake':
        return <SunMedium size={22} color={isEnabled ? t.success : t.accentCyan} />;
      case 'showTouches':
        return <Hand size={22} color={isEnabled ? t.success : t.accentCyan} />;
      case 'pointerLocation':
        return <Crosshair size={22} color={isEnabled ? t.success : t.warning} />;
      case 'keepWirelessOn':
        return <Wifi size={22} color={isEnabled ? t.success : t.accentCyan} />;
      // Web Remote Dashboard disabled.
      // case 'webRemote':
      //   return <Globe size={22} color={isEnabled ? t.success : t.accentCyan} />;
      default:
        return <SunMedium size={22} color={t.accentCyan} />;
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Overline>SYSTEM CONFIGURATION</Overline>
          <LocalizedText style={[s.title, { color: t.textPrimary }]}>Developer Settings</LocalizedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open language settings"
          onPress={() => router.push('/language-settings' as never)}>
          <Card style={{ borderColor: `${t.accentCyan}30` }}>
            <View style={s.row}>
              <IconContainer tone="cyan" size={44}>
                <Globe size={22} color={t.accentCyan} />
              </IconContainer>
              <View style={s.rowCopy}>
                <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>App Language</LocalizedText>
              </View>
              <ChevronRight size={18} color={t.accentCyan} />
            </View>
          </Card>
        </Pressable>

        {/* Section: System Extensions & Tools */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>EXTENSIONS & SYSTEM TOOLS</LocalizedText>
        </View>

        <View style={s.list}>
          {/* App Shield Auto-Off Navigation Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open App Shield Auto-Off Settings"
            onPress={() => router.push('/app-shield' as never)}>
            <Card style={{ borderColor: `${t.accentCyan}30` }}>
              <View style={s.row}>
                <IconContainer tone="cyan" size={44}>
                  <ShieldCheck size={22} color={t.accentCyan} />
                </IconContainer>
                <View style={s.rowCopy}>
                  <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>App Shield & Auto-Off</LocalizedText>
                </View>
                <CompactBadge label="SECURITY" color={t.success} />
                <ChevronRight size={18} color={t.accentCyan} />
              </View>
            </Card>
          </Pressable>

          {/* Widgets Configuration Navigation */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Widget Settings"
            onPress={() => router.push('/widget-settings')}>
            <Card style={{ borderColor: `${t.accentCyan}30` }}>
              <View style={s.row}>
                <IconContainer tone="cyan" size={44}>
                  <Layers size={22} color={t.accentCyan} />
                </IconContainer>
                <View style={s.rowCopy}>
                  <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Home Screen Widgets</LocalizedText>
                </View>
                <ChevronRight size={18} color={t.accentCyan} />
              </View>
            </Card>
          </Pressable>

          {/* Persistent Notification Shade Configuration */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Notification Shade Settings"
            onPress={() => router.push('/notification-settings')}>
            <Card style={{ borderColor: `${t.accentCyan}30` }}>
              <View style={s.row}>
                <IconContainer tone="cyan" size={44}>
                  <BellRing size={22} color={t.accentCyan} />
                </IconContainer>
                <View style={s.rowCopy}>
                  <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Persistent Notification Shade</LocalizedText>
                </View>
                <CompactBadge
                  label={notifMode === 'always' ? 'ON' : notifMode === 'when_dev_active' ? 'AUTO' : 'OFF'}
                  color={notifMode === 'disabled' ? t.textMuted : t.primary}
                />
                <ChevronRight size={18} color={t.accentCyan} />
              </View>
            </Card>
          </Pressable>

          {/* Security & System Privacy Configuration */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Security and Privacy Settings"
            onPress={() => router.push('/security-settings')}>
            <Card style={{ borderColor: `${t.accentCyan}30` }}>
              <View style={s.row}>
                <IconContainer tone="cyan" size={44}>
                  <Shield size={22} color={t.accentCyan} />
                </IconContainer>
                <View style={s.rowCopy}>
                  <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Security & Privacy</LocalizedText>
                </View>
                <CompactBadge
                  label={permission ? 'GRANTED' : shizukuStatus === 'authorized' ? 'SHIZUKU' : 'PENDING'}
                  color={permission || shizukuStatus === 'authorized' ? t.success : t.warning}
                />
                <ChevronRight size={18} color={t.accentCyan} />
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Section: Extra Developer Settings Toggles */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>DEVELOPER TOOLS & TWEAKS</LocalizedText>
        </View>

        <View style={s.list}>
          {EXTRA_SETTINGS.map(item => {
            const isEnabled = settings[item.key] === 'enabled';
            const isChanging = busy === item.key;

            return (
              <Card key={item.key} style={{ borderColor: isEnabled ? `${t.success}60` : `${t.accentCyan}20` }}>
                <View style={s.row}>
                  <IconContainer tone={isEnabled ? 'success' : 'cyan'} size={44}>
                    {renderExtraIcon(item.icon, isEnabled)}
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>{item.title}</LocalizedText>
                  </View>
                  {isChanging ? (
                    <ActivityIndicator size="small" color={t.accentCyan} />
                  ) : (
                    <CyberToggle
                      accessibilityLabel={`Toggle ${item.title}`}
                      value={isEnabled}
                      onValueChange={() => toggleExtra(item.key)}
                      disabled={!permission && !canWriteSys && shizukuStatus !== 'authorized'}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        {/* Section: Animation Scales Tuner */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>GLOBAL ANIMATION SPEED</LocalizedText>
        </View>

        <Card style={{ borderColor: `${t.primary}40`, backgroundColor: t.canvasElevated }}>
          <View style={s.row}>
            <IconContainer tone="primary" size={44}>
              <Gauge size={22} color={t.primary} />
            </IconContainer>
            <View style={s.rowCopy}>
              <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Animation Duration Scale</LocalizedText>
            </View>
            <CompactBadge label={currentScaleObj.short} color={t.primary} />
          </View>

          {/* Dropdown Selector */}
          <View style={s.dropdownWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select animation scale preset"
              onPress={() => setDropdownOpen(!dropdownOpen)}
              style={[s.dropdownBtn, { borderColor: t.cardBorder, backgroundColor: t.canvas }]}>
              <LocalizedText style={[s.dropdownBtnText, { color: t.textPrimary }]}>
                {currentScaleObj.label}
              </LocalizedText>
              {dropdownOpen ? (
                <ChevronUp size={18} color={t.primary} />
              ) : (
                <ChevronDown size={18} color={t.textSecondary} />
              )}
            </Pressable>

            {dropdownOpen && (
              <View style={[s.dropdownMenu, { backgroundColor: t.canvas, borderColor: t.cardBorder }]}>
                {SCALE_OPTIONS.map(opt => {
                  const isSelected = Math.abs(opt.value - animationScales.window) < 0.05;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Set scale to ${opt.label}`}
                      onPress={() => selectScale(opt.value)}
                      style={[
                        s.dropdownItem,
                        isSelected && { backgroundColor: `${t.primary}18` },
                      ]}>
                      <LocalizedText
                        style={[
                          s.dropdownItemText,
                          { color: isSelected ? t.primary : t.textPrimary, fontWeight: isSelected ? '700' : '400' },
                        ]}>
                        {opt.label}
                      </LocalizedText>
                      {isSelected && <Check size={16} color={t.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </Card>

        {/* Section: Snappy Speed Booster */}
        <Card style={{ borderColor: `${t.primary}50`, backgroundColor: t.canvasElevated }}>
          <View style={s.row}>
            <IconContainer tone="primary" size={44}>
              <Zap size={22} color={t.primary} />
            </IconContainer>
            <View style={s.rowCopy}>
              <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Snappy Speed Booster</LocalizedText>
            </View>
          </View>
          <Button
            label={busy === 'speedBoost' ? 'Boosting...' : 'Apply 0.5x Speed Boost'}
            variant="primary"
            icon={<Zap size={16} color="#FFFFFF" />}
            onPress={applyQuickPreset}
            disabled={busy === 'speedBoost' || !permission}
            style={{ marginTop: space.sm }}
          />
        </Card>

        {/* Section: Instant Cleanup & Reset */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>RESET & RESTORATION</LocalizedText>
        </View>

        <Card style={{ borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: t.canvasElevated }}>
          <View style={s.row}>
            <IconContainer tone="danger" size={44}>
              <Trash2 size={22} color={t.danger} />
            </IconContainer>
            <View style={s.rowCopy}>
              <LocalizedText style={[s.rowTitle, { color: t.textPrimary }]}>Instant Cleanup</LocalizedText>
            </View>
          </View>
          <Button
            label={cleaningUp ? 'Resetting System...' : 'Perform Instant Cleanup'}
            variant="secondary"
            icon={<Trash2 size={16} color={t.danger} />}
            onPress={confirmCleanup}
            disabled={cleaningUp || !permission}
            style={{ marginTop: space.sm, borderColor: 'rgba(239, 68, 68, 0.35)' }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function CompactBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.compactBadge, { borderColor: `${color}50`, backgroundColor: `${color}12` }]}>
      <LocalizedText style={[s.compactBadgeText, { color }]}>{label}</LocalizedText>
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
  },
  header: {
    gap: 4,
    paddingBottom: space.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    marginTop: space.xs,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  compactBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  dropdownWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.sm,
    marginTop: space.xs,
    gap: space.xs,
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
    marginTop: 4,
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
});
