import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import DevToggle, { UNAVAILABLE_STATUS, type DeviceStatus, type SettingName, type SettingState } from '@/modules/dev-toggle-native';
import { Button, Card, FeatureRow, IconBadge, Overline, Pill, type Tone } from '@/components/ui';
import { useOnboarding } from '@/state/onboarding';
import { radius, space, useTheme } from '@/theme';

const SETTINGS: { key: SettingName; icon: string; title: string; description: string }[] = [
  { key: 'developerOptions', icon: '⚙️', title: 'Developer options', description: 'Access to Android developer settings.' },
  { key: 'usbDebugging', icon: '🔌', title: 'USB debugging', description: 'Lets an authorized computer use ADB over USB.' },
  { key: 'wirelessDebugging', icon: '📶', title: 'Wireless debugging', description: 'ADB over your local Wi-Fi on supported devices.' },
];

const STATE_UI: Record<SettingState, { label: string; tone: Tone }> = {
  enabled: { label: 'On', tone: 'success' },
  disabled: { label: 'Off', tone: 'neutral' },
  unknown: { label: 'Unknown', tone: 'warning' },
};

export default function Dashboard() {
  const t = useTheme();
  const { reset } = useOnboarding();
  const [status, setStatus] = useState<DeviceStatus>(UNAVAILABLE_STATUS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SettingName | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await DevToggle.getStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    DevToggle.getStatus()
      .then(next => active && setStatus(next))
      .finally(() => active && setLoading(false));
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [refresh]);

  const granted = status.writeSecureSettings === 'granted';
  const enabledCount = SETTINGS.filter(x => status[x.key] === 'enabled').length;

  const open = async (key: SettingName) => {
    const result = await DevToggle.openSettings(key);
    if (!result.opened) Alert.alert('Open settings', result.message);
  };

  const toggle = async (key: SettingName) => {
    setBusy(key);
    try {
      const result = await DevToggle.setEnabled(key, status[key] !== 'enabled');
      await refresh();
      if (!result.changed) Alert.alert('Could not change setting', result.message);
    } finally {
      setBusy(null);
    }
  };

  const replayIntro = () =>
    Alert.alert('Replay introduction?', 'You will see the welcome, privacy and setup screens again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replay', onPress: () => reset() },
    ]);

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[t.primary]} tintColor={t.primary} />}>
          <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
            <View style={{ flex: 1, gap: 4 }}>
              <Overline>ANDROID UTILITY</Overline>
              <Text style={[s.title, { color: t.text }]}>Dev Toggle</Text>
            </View>
            <Pill label="On-device only" tone="success" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(350)}>
            <View style={[s.summary, { backgroundColor: t.primary }]}>
              <View style={s.summaryGlow} />
              <Text style={s.summaryLabel}>ACTIVE SETTINGS</Text>
              <Text style={s.summaryValue}>
                {enabledCount}
                <Text style={s.summaryTotal}> / {SETTINGS.length}</Text>
              </Text>
              <Text style={s.summaryText}>
                {granted ? 'Direct control enabled — toggle below.' : 'View-only mode. Finish ADB setup to toggle from here.'}
              </Text>
            </View>
          </Animated.View>

          {!granted && (
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <Card style={{ backgroundColor: t.warningSoft, borderColor: 'transparent' }}>
                <FeatureRow
                  tone="warning"
                  icon="🔑"
                  title="One step left"
                  body="Grant WRITE_SECURE_SETTINGS with ADB to switch these settings directly in the app."
                />
                <Button label="Start ADB setup" onPress={() => router.push('/setup')} />
              </Card>
            </Animated.View>
          )}

          <Text style={[s.section, { color: t.subtle }]}>SETTINGS</Text>
          {SETTINGS.map((item, i) => {
            const state = status[item.key];
            const ui = STATE_UI[state];
            return (
              <Animated.View key={item.key} entering={FadeInDown.delay(140 + i * 60).duration(350)}>
                <Card>
                  <View style={s.row}>
                    <IconBadge icon={item.icon} tone={state === 'enabled' ? 'success' : 'primary'} />
                    <View style={s.rowCopy}>
                      <Text style={[s.cardTitle, { color: t.text }]}>{item.title}</Text>
                      <Text style={[s.description, { color: t.muted }]}>{item.description}</Text>
                    </View>
                    {granted ? (
                      busy === item.key ? (
                        <ActivityIndicator color={t.primary} />
                      ) : (
                        <Switch
                          accessibilityLabel={`${item.title} ${state === 'enabled' ? 'on' : 'off'}`}
                          value={state === 'enabled'}
                          onValueChange={() => toggle(item.key)}
                          trackColor={{ false: t.border, true: t.success }}
                          thumbColor="#FFFFFF"
                        />
                      )
                    ) : (
                      <Pill label={ui.label} tone={ui.tone} />
                    )}
                  </View>
                  {state === 'unknown' && status.nativeAvailable && (
                    <Text style={[s.notice, { color: t.muted }]}>
                      Android couldn’t report this setting. Open Settings to confirm.
                    </Text>
                  )}
                  <Pressable accessibilityRole="button" onPress={() => open(item.key)} hitSlop={8}>
                    <Text style={[s.link, { color: t.primary }]}>Open in Android Settings →</Text>
                  </Pressable>
                </Card>
              </Animated.View>
            );
          })}

          <Text style={[s.section, { color: t.subtle }]}>PRIVACY & SECURITY</Text>
          <Card>
            <FeatureRow tone="success" icon="📱" title="Everything stays on this phone" body="No cloud, no account, nothing uploaded." />
            <FeatureRow tone="success" icon="🚫" title="No third-party access" body="No analytics, ads, trackers or third-party SDKs." />
            <FeatureRow
              tone={granted ? 'success' : 'neutral'}
              icon="🔐"
              title={`ADB permission: ${granted ? 'granted' : status.writeSecureSettings === 'denied' ? 'not granted' : 'unverified'}`}
              body="Only lets Dev Toggle change system settings. You can revoke it anytime."
            />
            <View style={s.actions}>
              <Button variant="secondary" label="ADB setup" onPress={() => router.push('/setup')} style={{ flex: 1 }} />
              <Button variant="ghost" label="Replay intro" onPress={replayIntro} style={{ flex: 1 }} />
            </View>
          </Card>

          {!status.nativeAvailable && !loading && (
            <View style={[s.note, { backgroundColor: t.surfaceAlt, borderRadius: radius.md }]}>
              <Text style={[s.noteText, { color: t.muted }]}>
                Live status needs this app’s Android development or production build. Expo Go can’t include the native module.
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
  content: { padding: space.xl, paddingBottom: 48, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.6 },
  summary: { borderRadius: radius.xl, padding: space.xl, gap: 4, overflow: 'hidden' },
  summaryGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FFFFFF1F', top: -110, right: -60 },
  summaryLabel: { color: '#FFFFFFB3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  summaryValue: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  summaryTotal: { fontSize: 22, color: '#FFFFFFA6', fontWeight: '800' },
  summaryText: { color: '#FFFFFFE0', fontSize: 14, lineHeight: 20 },
  section: { fontSize: 12, fontWeight: '900', letterSpacing: 1.3, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowCopy: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 18 },
  notice: { fontSize: 12.5, lineHeight: 18 },
  link: { fontSize: 13.5, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: space.sm },
  note: { padding: space.lg },
  noteText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
