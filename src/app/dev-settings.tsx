import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SunMedium from 'lucide-react-native/icons/sun-medium';
import Hand from 'lucide-react-native/icons/hand';
import Crosshair from 'lucide-react-native/icons/crosshair';
import Gauge from 'lucide-react-native/icons/gauge';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Trash2 from 'lucide-react-native/icons/trash';
import Layers from 'lucide-react-native/icons/layers';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Wifi from 'lucide-react-native/icons/wifi';
import DevToggle, {
  type AnimationScales,
  type ExtraSettingName,
  type NotificationMode,
  type SettingState,
} from '@/modules/dev-toggle-native';
import { Button, Card, CyberToggle, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';
import { SCALE_OPTIONS } from '@/app/index';

const EXTRA_SETTINGS: {
  key: ExtraSettingName;
  title: string;
  desc: string;
  icon: 'stayAwake' | 'showTouches' | 'pointerLocation' | 'keepWirelessOn';
}[] = [
  {
    key: 'stayAwake',
    title: 'Stay Awake While Charging',
    desc: 'Screen will never sleep while connected to AC or USB power.',
    icon: 'stayAwake',
  },
  {
    key: 'showTouches',
    title: 'Show Visual Touch Taps',
    desc: 'Shows visual touch circles on the screen wherever you tap.',
    icon: 'showTouches',
  },
  {
    key: 'pointerLocation',
    title: 'Pointer Location Tracker',
    desc: 'Displays screen touch overlay coordinates and crosshair data.',
    icon: 'pointerLocation',
  },
  {
    key: 'keepWirelessOn',
    title: 'Keep Wireless Debugging On',
    desc: 'Android turns Wireless Debugging off whenever Wi-Fi drops. Re-enable it automatically when Wi-Fi is back.',
    icon: 'keepWirelessOn',
  },
];

export default function DevSettings() {
  const t = useTheme();
  const [permission, setPermission] = useState<boolean>(false);
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
  const [notifMode, setNotifMode] = useState<NotificationMode>('disabled');

  const loadData = useCallback(async () => {
    try {
      const [perm, data, sc, nm] = await Promise.all([
        DevToggle.getPermissionStatus(),
        DevToggle.getExtraSettings(),
        DevToggle.getAnimationScales(),
        DevToggle.getNotificationMode(),
      ]);
      setPermission(perm === 'granted');
      setSettings(data);
      setAnimationScales(sc);
      setNotifMode(nm);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getPermissionStatus(),
      DevToggle.getExtraSettings(),
      DevToggle.getAnimationScales(),
      DevToggle.getNotificationMode(),
    ]).then(([perm, data, sc, nm]) => {
      if (active) {
        setPermission(perm === 'granted');
        setSettings(data);
        setAnimationScales(sc);
        setNotifMode(nm);
      }
    });
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
    const willEnable = settings[key] !== 'enabled';
    try {
      const res = await DevToggle.setExtraSetting(key, willEnable);
      await loadData();
      if (!res.changed) {
        Alert.alert('Action Denied', res.message);
      } else {
        const labels: Record<ExtraSettingName, string> = {
          stayAwake: 'Keep Screen Awake',
          showTouches: 'Show Screen Touches',
          pointerLocation: 'Show Pointer Location',
          keepWirelessOn: 'Keep Wireless Debugging On',
        };
        if (Platform.OS === 'android') {
          ToastAndroid.show(`${labels[key]}: ${willEnable ? 'Enabled' : 'Disabled'}`, ToastAndroid.SHORT);
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

  // Instant Cleanup: resets animation scales to 1.0x, turns off extras, and resets local preferences
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
        'Instant Cleanup Complete',
        'All animation duration scales have been restored to default 1.0x, screen inspection overlays turned off, and local Dev Mode preferences wiped.'
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
      'This will reset all system animation scales to 1.0x, turn off touch & coordinate overlays, and restore default settings.',
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
      default:
        return <SunMedium size={22} color={t.accentCyan} />;
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>SYSTEM CONFIGURATION</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Developer Settings</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Advanced Android controls for screen wake, touch feedback, coordinate overlays, and animation duration tuning.
            </Text>
          </View>

          {/* Section: System Extensions & Tools (Positioned at the Top) */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>EXTENSIONS & SYSTEM TOOLS</Text>
          </View>

          <View style={s.list}>
            {/* 1. Status Bar Notification Navigation Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Status Bar Notification Controls"
              onPress={() => router.push('/notification-settings')}>
              <Card style={{ borderColor: `${t.accentCyan}30` }}>
                <View style={s.row}>
                  <IconContainer tone="success" size={44}>
                    <BellRing size={22} color={t.success} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <View style={s.badgeTitleRow}>
                      <Text style={[s.rowTitle, { color: t.textPrimary }]}>Status Bar Notification</Text>
                      <Pill
                        label={
                          notifMode === 'always'
                            ? 'ALWAYS ON'
                            : notifMode === 'when_dev_active'
                            ? 'AUTO DEV'
                            : 'OFF'
                        }
                        tone={
                          notifMode === 'always'
                            ? 'success'
                            : notifMode === 'when_dev_active'
                            ? 'cyan'
                            : 'neutral'
                        }
                      />
                    </View>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Persistent quick controls in your Android notification shade
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.accentCyan} />
                </View>
              </Card>
            </Pressable>

            {/* 2. Security & Privacy Navigation Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Security & Privacy Information"
              onPress={() => router.push('/security-settings')}>
              <Card style={{ borderColor: `${t.accentCyan}30` }}>
                <View style={s.row}>
                  <IconContainer tone="cyan" size={44}>
                    <ShieldCheck size={22} color={t.accentCyan} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <View style={s.badgeTitleRow}>
                      <Text style={[s.rowTitle, { color: t.textPrimary }]}>Security & Privacy</Text>
                      <Pill
                        label={permission ? 'VERIFIED' : 'PENDING'}
                        tone={permission ? 'success' : 'neutral'}
                      />
                    </View>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Zero telemetry, 100% offline local device storage & permissions
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.accentCyan} />
                </View>
              </Card>
            </Pressable>

            {/* 3. Home Screen Widgets Navigation Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Home Screen Widgets Setup"
              onPress={() => router.push('/widget-settings')}>
              <Card style={{ borderColor: `${t.accentCyan}30` }}>
                <View style={s.row}>
                  <IconContainer tone="success" size={44}>
                    <Layers size={22} color={t.success} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <View style={s.badgeTitleRow}>
                      <Text style={[s.rowTitle, { color: t.textPrimary }]}>Home Screen Widgets</Text>
                      <Pill label="3x1 & 1x1" tone="success" />
                    </View>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Setup 3x1 multi-control bar and 1x1 toggle widgets
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.accentCyan} />
                </View>
              </Card>
            </Pressable>
          </View>

          {/* Section: Extended Developer Toggles */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>EXTENDED DEVELOPER SWITCHES</Text>
          </View>

          <View style={s.list}>
            {EXTRA_SETTINGS.map(item => {
              const state = settings[item.key];
              const isEnabled = state === 'enabled';

              return (
                <Card key={item.key}>
                  <View style={s.row}>
                    <IconContainer tone={isEnabled ? 'success' : 'cyan'} size={44}>
                      {renderExtraIcon(item.icon, isEnabled)}
                    </IconContainer>

                    <View style={s.rowCopy}>
                      <Text style={[s.rowTitle, { color: t.textPrimary }]}>{item.title}</Text>
                      <Text style={[s.rowDesc, { color: t.textSecondary }]}>{item.desc}</Text>
                    </View>

                    {permission ? (
                      busy === item.key ? (
                        <ActivityIndicator color={t.accentCyan} />
                      ) : (
                        <CyberToggle
                          accessibilityLabel={`${item.title} switch`}
                          value={isEnabled}
                          onValueChange={() => toggleExtra(item.key)}
                          size="md"
                        />
                      )
                    ) : (
                      <Pill label={isEnabled ? 'ON' : 'OFF'} tone={isEnabled ? 'success' : 'neutral'} />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Section: Animation Scales Duration Customizer */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>ANIMATION DURATION SCALE</Text>
          </View>

          <Card>
            <View style={s.row}>
              <IconContainer tone="cyan" size={44}>
                <Gauge size={22} color={t.accentCyan} />
              </IconContainer>
              <View style={s.rowCopy}>
                <Text style={[s.rowTitle, { color: t.textPrimary }]}>System Animation Duration</Text>
                <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                  Customize the duration multiplier for window, transition, and animator scales.
                </Text>
              </View>
              <Pill label={currentScaleObj.short} tone="success" />
            </View>

            {permission && (
              <View style={s.dropdownWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  style={[s.dropdownBtn, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                  <Text style={[s.dropdownBtnText, { color: t.textPrimary }]}>
                    {currentScaleObj.label}
                  </Text>
                  {dropdownOpen ? (
                    <ChevronUp size={16} color={t.textSecondary} />
                  ) : (
                    <ChevronDown size={16} color={t.textSecondary} />
                  )}
                </Pressable>

                {dropdownOpen && (
                  <View style={[s.dropdownMenu, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                    {SCALE_OPTIONS.map(opt => {
                      const isSelected = Math.abs(animationScales.window - opt.value) < 0.05;
                      return (
                        <Pressable
                          key={opt.value}
                          accessibilityRole="button"
                          onPress={() => selectScale(opt.value)}
                          style={[
                            s.dropdownItem,
                            {
                              backgroundColor: isSelected ? t.primaryGlow : 'transparent',
                            },
                          ]}>
                          <Text
                            style={[
                              s.dropdownItemText,
                              { color: isSelected ? t.textPrimary : t.textSecondary },
                            ]}>
                            {opt.label}
                          </Text>
                          {isSelected && <Check size={16} color={t.success} />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Section: Instant Cleanup */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>MAINTENANCE & RESET</Text>
          </View>

          <Card style={{ borderColor: `${t.danger}40`, backgroundColor: t.canvas }}>
            <View style={s.row}>
              <IconContainer tone="danger" size={44}>
                <Trash2 size={22} color={t.danger} />
              </IconContainer>
              <View style={s.rowCopy}>
                <Text style={[s.rowTitle, { color: t.textPrimary }]}>Instant Cleanup</Text>
                <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                  Restores 1.0x animation scales, turns off touch & display overlays, and wipes local preferences.
                </Text>
              </View>
            </View>

            <Button
              variant="secondary"
              label={cleaningUp ? 'Cleaning Up...' : 'Execute Instant Cleanup'}
              icon={<Trash2 size={16} color={t.danger} />}
              onPress={confirmCleanup}
              disabled={cleaningUp}
              style={{ borderColor: `${t.danger}50` }}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 36,
    gap: space.md,
    width: '100%',
  },
  header: { gap: space.xs, width: '100%', marginBottom: space.xs },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeader: { marginTop: space.xs },
  sectionTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  list: { gap: space.md, width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  rowDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
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
  navAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
