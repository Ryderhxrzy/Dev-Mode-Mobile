import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import DevToggle, { type PermissionStatus } from '@/modules/dev-toggle-native';
import { Button, Card, CodeBlock, IconBadge, Pill } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';

export const APP_ID = 'com.devtoggle.app';
export const GRANT_COMMAND = `adb shell pm grant ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`;
const PLATFORM_TOOLS_URL = 'https://developer.android.com/tools/releases/platform-tools';

type Step = { icon: string; title: string; body: string; command?: string; action?: 'download' | 'devOptions' };

const STEPS: Step[] = [
  {
    icon: '💻',
    title: 'Install Android Platform Tools',
    body: 'On your computer, download Platform Tools (it includes ADB) from the official Android site. Extract the ZIP, open the platform-tools folder, then open a terminal there (on Windows: click the address bar, type cmd, press Enter).',
    action: 'download',
  },
  {
    icon: '🔌',
    title: 'Turn on USB debugging',
    body: 'Settings → About phone → tap Build number 7 times. Then open Developer options, turn on USB debugging, and connect your phone with a data-capable USB cable.',
    action: 'devOptions',
  },
  {
    icon: '🔍',
    title: 'Verify the connection',
    body: 'Run this command. Accept the "Allow USB debugging?" prompt on your phone. Your device should be listed as "device" — if it says "unauthorized", check your phone for the prompt.',
    command: 'adb devices',
  },
  {
    icon: '🔑',
    title: 'Grant the permission',
    body: 'Run this one-time command. It only gives Dev Toggle permission to change developer settings. Come back here afterwards — the status below updates automatically.',
    command: GRANT_COMMAND,
  },
];

export function useWriteSecurePermission() {
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const check = useCallback(async () => setPermission(await DevToggle.getPermissionStatus()), []);
  useEffect(() => {
    let active = true;
    DevToggle.getPermissionStatus().then(value => active && setPermission(value));
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [check]);
  return { permission, check };
}

export function AdbSetupGuide({ permission, onCheck }: { permission: PermissionStatus; onCheck: () => void }) {
  const t = useTheme();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <View style={s.wrap}>
      <View style={s.progress}>
        {STEPS.map((item, i) => (
          <View
            key={item.title}
            style={[s.progressBar, { backgroundColor: i <= step ? t.primary : t.border }]}
          />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(260)}>
        <Card>
          <View style={s.stepHead}>
            <IconBadge icon={current.icon} />
            <View style={{ flex: 1 }}>
              <Text style={[s.stepLabel, { color: t.primary }]}>
                STEP {step + 1} OF {STEPS.length}
              </Text>
              <Text style={[s.stepTitle, { color: t.text }]}>{current.title}</Text>
            </View>
          </View>
          <Text style={[s.body, { color: t.muted }]}>{current.body}</Text>
          {current.command && <CodeBlock command={current.command} />}
          {current.action === 'download' && (
            <Button variant="secondary" label="Open official download page ↗" onPress={() => Linking.openURL(PLATFORM_TOOLS_URL)} />
          )}
          {current.action === 'devOptions' && (
            <Button variant="secondary" label="Open Developer options" onPress={() => DevToggle.openSettings('developerOptions')} />
          )}
          <View style={s.nav}>
            <Button variant="ghost" label="Back" disabled={step === 0} onPress={() => setStep(x => x - 1)} style={s.navBtn} />
            {last ? (
              <Button variant="secondary" label="Check permission" onPress={onCheck} style={s.navBtn} />
            ) : (
              <Button variant="secondary" label="Next step" onPress={() => setStep(x => x + 1)} style={s.navBtn} />
            )}
          </View>
        </Card>
      </Animated.View>

      <PermissionStatusCard permission={permission} />

      <Text style={[s.tip, { color: t.subtle }]}>
        Trouble? Make sure “adb devices” shows “device”, reconnect the cable, re-accept the USB prompt, then run the grant
        command again. The permission may need to be granted again after reinstalling the app.
      </Text>
    </View>
  );
}

export function PermissionStatusCard({ permission }: { permission: PermissionStatus }) {
  const t = useTheme();
  const granted = permission === 'granted';
  return (
    <Animated.View
      key={permission}
      entering={FadeIn.duration(300)}
      style={[s.status, { backgroundColor: granted ? t.successSoft : t.warningSoft }]}>
      <Text style={{ fontSize: 22 }}>{granted ? '✅' : '⏳'}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[s.statusTitle, { color: t.text }]}>
          {granted ? 'Permission granted' : permission === 'denied' ? 'Waiting for permission' : 'Unable to verify'}
        </Text>
        <Text style={[s.statusBody, { color: t.muted }]}>
          {granted
            ? 'You can now toggle developer settings directly from Dev Toggle.'
            : 'Status is read live from Android. Complete the steps above, then come back.'}
        </Text>
      </View>
      <Pill label={granted ? 'Ready' : 'Pending'} tone={granted ? 'success' : 'warning'} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.lg },
  progress: { flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 5, borderRadius: 5 },
  stepHead: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  stepLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  stepTitle: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  body: { fontSize: 14, lineHeight: 21 },
  nav: { flexDirection: 'row', gap: space.sm },
  navBtn: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  statusTitle: { fontSize: 15, fontWeight: '800' },
  statusBody: { fontSize: 13, lineHeight: 18 },
  tip: { fontSize: 12, lineHeight: 18 },
});
