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
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Cpu,
  Usb,
  Wifi,
  Sparkles,
} from 'lucide-react-native';
import DevToggle, {
  type DeviceStatus,
  type NotificationMode,
  UNAVAILABLE_STATUS,
} from '@/modules/dev-toggle-native';
import { Card, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function NotificationSettings() {
  const t = useTheme();
  const [notifMode, setNotifMode] = useState<NotificationMode>('disabled');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(UNAVAILABLE_STATUS);
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [nm, st] = await Promise.all([
        DevToggle.getNotificationMode(),
        DevToggle.getStatus(),
      ]);
      setNotifMode(nm);
      setDeviceStatus(st);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getNotificationMode(),
      DevToggle.getStatus(),
    ]).then(([nm, st]) => {
      if (active) {
        setNotifMode(nm);
        setDeviceStatus(st);
      }
    }).catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadData();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [loadData]);

  const handleSelectMode = async (mode: NotificationMode) => {
    if (updating || notifMode === mode) return;
    setUpdating(true);
    try {
      if (mode !== 'disabled') {
        const hasPerm = await DevToggle.hasNotificationPermission();
        if (!hasPerm) {
          await DevToggle.requestNotificationPermission();
        }
      }
      const res = await DevToggle.setNotificationMode(mode);
      setNotifMode(res.mode);
      if (Platform.OS === 'android') {
        const modeLabels: Record<NotificationMode, string> = {
          always: 'Persistent Notification Enabled (Always On)',
          when_dev_active: 'Dynamic Notification Enabled (Active while Dev Mode ON)',
          disabled: 'Notification Disabled',
        };
        ToastAndroid.show(modeLabels[mode], ToastAndroid.SHORT);
      }
    } catch (err: any) {
      Alert.alert('Notification Error', err?.message || 'Could not update notification mode.');
    } finally {
      setUpdating(false);
    }
  };

  const devOn = deviceStatus.developerOptions === 'enabled';
  const usbOn = deviceStatus.usbDebugging === 'enabled';
  const wirelessOn = deviceStatus.wirelessDebugging === 'enabled';

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>STATUS BAR NOTIFICATION</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Quick Controls Notification</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Keep developer tools accessible directly from your Android status bar and lock screen with custom cybernetic toggle chips.
            </Text>
          </View>

          {/* Mode Selection */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>NOTIFICATION DISPLAY MODE</Text>
          </View>

          <View style={s.list}>
            {/* 1. Always Persistent */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Always Persistent Notification"
              onPress={() => handleSelectMode('always')}>
              <Card
                style={{
                  borderColor: notifMode === 'always' ? t.success : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'always' ? `${t.success}15` : t.canvas,
                  borderWidth: notifMode === 'always' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="success" size={44}>
                    <BellRing size={22} color={t.success} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Always Persistent</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Pins an ongoing notification with 1-tap toggles that remains in the status bar at all times.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'always' ? 'ACTIVE' : 'SELECT'}
                    tone={notifMode === 'always' ? 'success' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>

            {/* 2. Active While Dev Mode ON */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Active While Dev Mode ON"
              onPress={() => handleSelectMode('when_dev_active')}>
              <Card
                style={{
                  borderColor: notifMode === 'when_dev_active' ? t.accentCyan : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'when_dev_active' ? `${t.accentCyan}15` : t.canvas,
                  borderWidth: notifMode === 'when_dev_active' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="cyan" size={44}>
                    <Bell size={22} color={t.accentCyan} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Active While Dev Mode ON</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Automatically appears when Developer Options is ON, and disappears immediately when turned OFF.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'when_dev_active' ? 'ACTIVE' : 'SELECT'}
                    tone={notifMode === 'when_dev_active' ? 'cyan' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>

            {/* 3. Turn Off Notification */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn Off Notifications"
              onPress={() => handleSelectMode('disabled')}>
              <Card
                style={{
                  borderColor: notifMode === 'disabled' ? `${t.danger}80` : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'disabled' ? `${t.danger}12` : t.canvas,
                  borderWidth: notifMode === 'disabled' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="warning" size={44}>
                    <BellOff size={22} color={t.warning} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Turn Off Notifications</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Completely removes the background status bar notification and quick controls.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'disabled' ? 'OFF' : 'SELECT'}
                    tone={notifMode === 'disabled' ? 'warning' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>
          </View>

          {updating && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={t.accentCyan} size="small" />
              <Text style={[s.loadingText, { color: t.accentCyan }]}>Updating notification mode...</Text>
            </View>
          )}

          {/* Interactive Custom Notification Preview */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>ENGAGING NOTIFICATION PREVIEW</Text>
          </View>

          <Card style={{ backgroundColor: '#071610', borderColor: `${t.success}50`, borderWidth: 1.5 }}>
            <View style={s.previewHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color={t.success} />
                <Text style={[s.previewHeaderTitle, { color: t.textPrimary }]}>DEV MODE QUICK CONTROLS</Text>
              </View>
              <Pill label={devOn ? 'ACTIVE' : 'STANDBY'} tone={devOn ? 'success' : 'neutral'} />
            </View>

            <Text style={[s.previewSub, { color: t.textSecondary }]}>
              Interactive Android Notification Shade Bar
            </Text>

            {/* Simulated Custom RemoteViews Notification Chips */}
            <View style={s.previewChipsRow}>
              {/* Chip 1: Dev Mode */}
              <View
                style={[
                  s.previewChip,
                  {
                    backgroundColor: devOn ? '#15803D' : '#0E1D17',
                    borderColor: devOn ? '#4ADE80' : '#1A3328',
                  },
                ]}>
                <Cpu size={14} color={devOn ? '#FFFFFF' : '#7A9988'} />
                <Text style={[s.previewChipLabel, { color: devOn ? '#FFFFFF' : '#7A9988' }]}>DEV</Text>
                <Text style={[s.previewChipStatus, { color: devOn ? '#FFFFFF' : '#5C7A6B' }]}>
                  {devOn ? 'ON' : 'OFF'}
                </Text>
              </View>

              {/* Chip 2: USB ADB */}
              <View
                style={[
                  s.previewChip,
                  {
                    backgroundColor: usbOn ? '#15803D' : '#0E1D17',
                    borderColor: usbOn ? '#4ADE80' : '#1A3328',
                  },
                ]}>
                <Usb size={14} color={usbOn ? '#FFFFFF' : '#7A9988'} />
                <Text style={[s.previewChipLabel, { color: usbOn ? '#FFFFFF' : '#7A9988' }]}>USB</Text>
                <Text style={[s.previewChipStatus, { color: usbOn ? '#FFFFFF' : '#5C7A6B' }]}>
                  {usbOn ? 'ON' : 'OFF'}
                </Text>
              </View>

              {/* Chip 3: Wireless ADB */}
              <View
                style={[
                  s.previewChip,
                  {
                    backgroundColor: wirelessOn ? '#15803D' : '#0E1D17',
                    borderColor: wirelessOn ? '#4ADE80' : '#1A3328',
                  },
                ]}>
                <Wifi size={14} color={wirelessOn ? '#FFFFFF' : '#7A9988'} />
                <Text style={[s.previewChipLabel, { color: wirelessOn ? '#FFFFFF' : '#7A9988' }]}>WIFI</Text>
                <Text style={[s.previewChipStatus, { color: wirelessOn ? '#FFFFFF' : '#5C7A6B' }]}>
                  {wirelessOn ? (deviceStatus.wirelessEndpoint ? deviceStatus.wirelessEndpoint : 'ON') : 'OFF'}
                </Text>
              </View>
            </View>

            <View style={s.previewFooter}>
              <CheckCircle2 size={13} color={t.accentCyan} />
              <Text style={[s.previewFooterText, { color: t.textMuted }]}>
                Tapping chips directly toggles system state and updates live.
              </Text>
            </View>
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
    gap: 3,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewHeaderTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  previewSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 10,
  },
  previewChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  previewChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.2,
    gap: 2,
  },
  previewChipLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  previewChipStatus: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewFooterText: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
});

