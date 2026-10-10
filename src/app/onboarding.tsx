import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdbSetupGuide, APP_ID, useWriteSecurePermission } from '@/components/adb-setup';
import { Button, Card, CodeBlock, FeatureRow, IconBadge, Overline } from '@/components/ui';
import { useOnboarding } from '@/state/onboarding';
import { radius, space, useTheme } from '@/theme';

const PAGES = ['welcome', 'privacy', 'how', 'adb'] as const;

export default function Onboarding() {
  const t = useTheme();
  const { finish } = useOnboarding();
  const { permission, check } = useWriteSecurePermission();
  const [page, setPage] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;
  const canContinue = current !== 'privacy' || acknowledged;

  const next = () => (isLast ? finish() : setPage(p => p + 1));

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <View style={s.header}>
          <View style={s.dots}>
            {PAGES.map((p, i) => (
              <View
                key={p}
                style={[s.dot, { backgroundColor: i <= page ? t.primary : t.border, width: i === page ? 26 : 8 }]}
              />
            ))}
          </View>
          <Text style={[s.skip, { color: t.subtle }]}>
            {page + 1} / {PAGES.length}
          </Text>
        </View>

        <ScrollView key={current} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(380)} style={s.page}>
            {current === 'welcome' && <Welcome />}
            {current === 'privacy' && <Privacy acknowledged={acknowledged} onToggle={() => setAcknowledged(a => !a)} />}
            {current === 'how' && <HowItWorks />}
            {current === 'adb' && (
              <>
                <PageHeader
                  overline="FINAL STEP"
                  title="Connect with ADB"
                  subtitle="Grant one permission from your computer so Dev Toggle can switch developer settings for you. You only need to do this once."
                />
                <AdbSetupGuide permission={permission} onCheck={check} />
              </>
            )}
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.duration(300)} style={[s.footer, { borderColor: t.border, backgroundColor: t.bg }]}>
          {page > 0 && <Button variant="ghost" label="Back" onPress={() => setPage(p => p - 1)} style={s.backBtn} />}
          <Button
            style={s.nextBtn}
            disabled={!canContinue}
            onPress={next}
            label={
              current === 'welcome'
                ? 'Get started'
                : isLast
                  ? permission === 'granted'
                    ? 'Go to dashboard'
                    : 'Skip for now'
                  : 'Continue'
            }
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function PageHeader({ overline, title, subtitle }: { overline: string; title: string; subtitle: string }) {
  const t = useTheme();
  return (
    <View style={s.pageHeader}>
      <Overline>{overline}</Overline>
      <Text style={[s.title, { color: t.text }]}>{title}</Text>
      <Text style={[s.subtitle, { color: t.muted }]}>{subtitle}</Text>
    </View>
  );
}

function Welcome() {
  const t = useTheme();
  return (
    <>
      <View style={[s.hero, { backgroundColor: t.primary }]}>
        <View style={s.heroGlow} />
        <Text style={s.heroIcon}>🛠️</Text>
        <Text style={s.heroTitle}>Dev Toggle</Text>
        <Text style={s.heroText}>Android developer settings, one tap away.</Text>
      </View>
      <PageHeader
        overline="WELCOME"
        title="Build, test and connect faster"
        subtitle="Dev Toggle gives you quick access to the Android settings you use every day while developing."
      />
      <Card>
        <FeatureRow icon="⚙️" title="Developer options" body="See and switch developer mode at a glance." />
        <FeatureRow icon="🔌" title="USB debugging" body="Turn ADB over USB on or off instantly." />
        <FeatureRow icon="📶" title="Wireless debugging" body="Connect ADB over Wi-Fi on supported devices." />
      </Card>
    </>
  );
}

function Privacy({ acknowledged, onToggle }: { acknowledged: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <>
      <View style={s.center}>
        <IconBadge icon="🛡️" tone="success" size={72} />
      </View>
      <PageHeader
        overline="PRIVACY & SECURITY"
        title="Your data never leaves your phone"
        subtitle="Dev Toggle is built to be private by design. Here is exactly what that means."
      />
      <Card>
        <FeatureRow
          tone="success"
          icon="📱"
          title="Stored only on this device"
          body="Setting statuses and your preferences live in this app's private storage on your phone. Nothing is synced to any cloud."
        />
        <FeatureRow
          tone="success"
          icon="🚫"
          title="No third-party access"
          body="No analytics, no ads, no trackers and no third-party SDKs. No one else can see what you do in the app."
        />
        <FeatureRow
          tone="success"
          icon="👤"
          title="No account, no sign-up"
          body="There is nothing to register. We never ask for your name, email or phone number."
        />
        <FeatureRow
          tone="success"
          icon="📡"
          title="Nothing is uploaded"
          body="The app does not send your data to any server. The only link it opens is the official Android download page, in your browser."
        />
        <FeatureRow
          tone="success"
          icon="🗑️"
          title="You stay in control"
          body="Uninstalling removes everything. You can revoke the ADB permission at any time."
        />
      </Card>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acknowledged }}
        onPress={onToggle}
        style={[s.ack, { backgroundColor: t.surface, borderColor: acknowledged ? t.success : t.border }]}>
        <View style={[s.check, { borderColor: acknowledged ? t.success : t.subtle, backgroundColor: acknowledged ? t.success : 'transparent' }]}>
          {acknowledged && <Text style={s.checkMark}>✓</Text>}
        </View>
        <Text style={[s.ackText, { color: t.text }]}>I understand how Dev Toggle handles my data</Text>
      </Pressable>
    </>
  );
}

function HowItWorks() {
  const t = useTheme();
  return (
    <>
      <PageHeader
        overline="HOW IT WORKS"
        title="One permission, full control"
        subtitle="Android protects developer settings. To change them from an app, it needs a special permission that can only be granted from a computer using ADB."
      />
      <Card>
        <Step n={1} title="Install ADB on your computer" body="Free, official Android Platform Tools." />
        <Step n={2} title="Connect your phone by USB" body="With USB debugging turned on." />
        <Step n={3} title="Run one command" body="Grants WRITE_SECURE_SETTINGS to Dev Toggle only." />
        <Step n={4} title="Toggle from the app" body="No more digging through Settings menus." last />
      </Card>
      <Card style={{ backgroundColor: t.surfaceAlt }}>
        <FeatureRow
          icon="🔐"
          title="What this permission can do"
          body="It lets Dev Toggle change system settings like developer options and debugging. It cannot read your messages, photos, files or accounts."
        />
        <Text style={[s.small, { color: t.muted }]}>Changed your mind? Revoke it anytime with:</Text>
        <CodeBlock command={`adb shell pm revoke ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`} />
      </Card>
    </>
  );
}

function Step({ n, title, body, last }: { n: number; title: string; body: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={s.step}>
      <View style={s.stepRail}>
        <View style={[s.stepNum, { backgroundColor: t.primary }]}>
          <Text style={s.stepNumText}>{n}</Text>
        </View>
        {!last && <View style={[s.stepLine, { backgroundColor: t.border }]} />}
      </View>
      <View style={s.stepCopy}>
        <Text style={[s.stepTitle, { color: t.text }]}>{title}</Text>
        <Text style={[s.small, { color: t.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.md, minHeight: 48 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  skip: { fontWeight: '700', fontSize: 14 },
  content: { padding: space.xl, paddingTop: space.sm, paddingBottom: space.xxl },
  page: { gap: space.xl },
  pageHeader: { gap: space.sm },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.4 },
  subtitle: { fontSize: 15.5, lineHeight: 23 },
  hero: { borderRadius: radius.xl, padding: space.xxl, paddingVertical: 40, alignItems: 'center', gap: space.sm, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFFFFF22', top: -120, right: -80 },
  heroIcon: { fontSize: 54 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  heroText: { color: '#FFFFFFD9', fontSize: 15, textAlign: 'center' },
  center: { alignItems: 'center', paddingTop: space.sm },
  ack: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1.5 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  ackText: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  step: { flexDirection: 'row', gap: space.md },
  stepRail: { alignItems: 'center' },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  stepLine: { width: 2, flex: 1, marginTop: 4, minHeight: 14 },
  stepCopy: { flex: 1, gap: 2, paddingBottom: space.sm },
  stepTitle: { fontSize: 15, fontWeight: '800' },
  small: { fontSize: 13.5, lineHeight: 19.5 },
  footer: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
