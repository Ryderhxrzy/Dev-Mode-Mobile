import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import LocalizedText from '@/components/LocalizedText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Cpu from 'lucide-react-native/icons/cpu';
import Wifi from 'lucide-react-native/icons/wifi';
import Usb from 'lucide-react-native/icons/usb';
import Lock from 'lucide-react-native/icons/lock';
import EyeOff from 'lucide-react-native/icons/eye-off';
import UserX from 'lucide-react-native/icons/user-x';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Trash2 from 'lucide-react-native/icons/trash';
import Check from 'lucide-react-native/icons/check';
import Zap from 'lucide-react-native/icons/zap';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Terminal from 'lucide-react-native/icons/terminal';
import Layers from 'lucide-react-native/icons/layers';
import Sliders from 'lucide-react-native/icons/sliders-vertical';
import { AdbSetupGuide, useWriteSecurePermission } from '@/components/adb-setup';
import { Button, Card, FeatureRow, IconContainer, Overline } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useOnboarding } from '@/state/onboarding';
import { fonts, radius, space, useTheme } from '@/theme';

const PAGES = ['welcome', 'privacy', 'how', 'adb'] as const;

export default function Onboarding() {
  const t = useTheme();
  const { finish } = useOnboarding();
  const { permission, checking, check } = useWriteSecurePermission();
  const [page, setPage] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;
  const canContinue = current !== 'privacy' || acknowledged;

  const handleNext = async () => {
    if (isLast) {
      if (permission === 'granted') {
        await finish();
        router.replace('/success');
      } else {
        check();
      }
    } else {
      setPage(p => p + 1);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        {/* Header Indicator */}
        <View style={s.header}>
          <View style={s.dots}>
            {PAGES.map((p, i) => (
              <View
                key={p}
                style={[
                  s.dot,
                  {
                    backgroundColor: i === page ? t.accentCyan : i < page ? t.primary : t.borderSubtle,
                    width: i === page ? 28 : 8,
                  },
                ]}
              />
            ))}
          </View>
          <LocalizedText style={[s.pageCounter, { color: t.textMuted }]}>
            0{page + 1} / 0{PAGES.length}
          </LocalizedText>
        </View>

        <ScrollView
          key={current}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(320)} style={s.page}>
            {current === 'welcome' && <Welcome />}
            {current === 'privacy' && (
              <Privacy acknowledged={acknowledged} onToggle={() => setAcknowledged(a => !a)} />
            )}
            {current === 'how' && <HowItWorks />}
            {current === 'adb' && (
              <>
                <PageHeader
                  overline="STAGE 04 // ADB AUTHORIZATION"
                  title="Configure ADB Permission"
                  subtitle="To toggle secure system values directly without root, Android requires WRITE_SECURE_SETTINGS granted from your computer. Use the Dev Mode CLI or plain ADB."
                />
                <AdbSetupGuide permission={permission} checking={checking} onCheck={check} />
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer Navigation */}
        <View style={[s.footer, { borderColor: t.cardBorder, backgroundColor: 'rgba(5, 13, 10, 0.85)' }]}>
          {page > 0 && (
            <Button
              variant="ghost"
              label="Back"
              icon={<ArrowLeft size={16} color={t.textSecondary} />}
              onPress={() => setPage(p => p - 1)}
              style={s.backBtn}
            />
          )}

          {isLast ? (
            permission === 'granted' ? (
              <Button
                variant="cyan"
                label="Launch Dev Mode"
                icon={<Zap size={16} color="#FFFFFF" />}
                onPress={handleNext}
                style={s.actionBtn}
              />
            ) : (
              <Button
                variant="primary"
                label={checking ? 'Verifying Permission...' : 'Check Permission'}
                icon={<RotateCw size={16} color="#FFFFFF" />}
                onPress={handleNext}
                style={s.actionBtn}
              />
            )
          ) : (
            <Button
              variant="primary"
              label={current === 'welcome' ? 'Get Started' : 'Continue'}
              icon={<ArrowRight size={16} color="#FFFFFF" />}
              disabled={!canContinue}
              onPress={handleNext}
              style={s.actionBtn}
            />
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function PageHeader({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: string;
  subtitle: string;
}) {
  const t = useTheme();
  return (
    <View style={s.pageHeader}>
      <Overline>{overline}</Overline>
      <LocalizedText style={[s.title, { color: t.textPrimary }]}>{title}</LocalizedText>
      <LocalizedText style={[s.subtitle, { color: t.textSecondary }]}>{subtitle}</LocalizedText>
    </View>
  );
}

function Welcome() {
  const t = useTheme();
  return (
    <>
      <View style={[s.heroBox, { backgroundColor: t.canvas, borderColor: t.cardBorder }]}>
        <View style={[s.heroGlow, { backgroundColor: t.primaryGlow }]} />
        <View style={s.heroTop}>
          <Image
            source={require('@/assets/images/icon2.png')}
            style={s.appIconImage}
            resizeMode="contain"
          />
          <View style={[s.tagBadge, { backgroundColor: t.primaryGlow, borderColor: t.primary }]}>
            <LocalizedText style={[s.tagText, { color: t.primaryLight }]}>LOCAL UTILITY</LocalizedText>
          </View>
        </View>

        <LocalizedText style={[s.heroTitle, { color: t.textPrimary }]}>Dev Mode</LocalizedText>
        <LocalizedText style={[s.heroDesc, { color: t.textSecondary }]}>
          Instant hardware control for Android developer settings. Built for engineers, power users, and QA testing.
        </LocalizedText>
      </View>

      <PageHeader
        overline="STAGE 01 // OVERVIEW"
        title="Direct Hardware Toggles"
        subtitle="Skip deep system settings menus. Manage essential development switches with single-tap precision."
      />

      <Card>
        <FeatureRow
          icon={<Cpu size={20} color={t.accentCyan} />}
          title="Developer Options"
          body="Toggle Android development settings on or off instantly."
          tone="cyan"
        />
        <FeatureRow
          icon={<Usb size={20} color={t.primaryLight} />}
          title="USB Debugging"
          body="Enable or revoke computer ADB communication over cable."
          tone="primary"
        />
        <FeatureRow
          icon={<Wifi size={20} color={t.success} />}
          title="Wireless Debugging"
          body="Connect ADB wirelessly over local network on supported devices."
          tone="success"
        />
      </Card>
    </>
  );
}

function Privacy({ acknowledged, onToggle }: { acknowledged: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <>
      <View style={s.privacyHero}>
        <IconContainer tone="success" size={64}>
          <ShieldCheck size={36} color={t.success} />
        </IconContainer>
      </View>

      <PageHeader
        overline="STAGE 02 // ZERO TELEMETRY"
        title="100% On-Device & Private"
        subtitle="Zero third-party access. Dev Mode runs entirely offline and writes exclusively to your device settings."
      />

      <Card>
        <FeatureRow
          tone="success"
          icon={<Lock size={20} color={t.success} />}
          title="No Third-Party Access"
          body="No analytics, trackers, crash collectors, or external SDKs. Zero third-party network requests."
        />
        <FeatureRow
          tone="success"
          icon={<CloudOff size={20} color={t.success} />}
          title="Zero Cloud Sync"
          body="Your data and toggle states are stored in isolated local device storage. Nothing is uploaded to any server."
        />
        <FeatureRow
          tone="success"
          icon={<UserX size={20} color={t.success} />}
          title="No Accounts or Profiles"
          body="No login, email, phone number, or registration required. Fully private out of the box."
        />
        <FeatureRow
          tone="success"
          icon={<EyeOff size={20} color={t.success} />}
          title="Isolated Permissions"
          body="Dev Mode cannot access your personal photos, messages, contacts, files, or sensitive apps."
        />
        <FeatureRow
          tone="success"
          icon={<Trash2 size={20} color={t.success} />}
          title="Instant Cleanup"
          body="Uninstalling the application wipes all local preferences immediately."
        />
      </Card>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acknowledged }}
        onPress={onToggle}
        style={[
          s.ackCard,
          {
            backgroundColor: acknowledged ? t.successSoft : t.canvas,
            borderColor: acknowledged ? t.success : t.cardBorder,
          },
        ]}>
        <View
          style={[
            s.checkbox,
            {
              borderColor: acknowledged ? t.success : t.textMuted,
              backgroundColor: acknowledged ? t.success : 'transparent',
            },
          ]}>
          {acknowledged && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </View>
        <LocalizedText style={[s.ackText, { color: acknowledged ? t.textPrimary : t.textSecondary }]}>
          I confirm that all data stays strictly on this device with zero external access.
        </LocalizedText>
      </Pressable>
    </>
  );
}

function HowItWorks() {
  const t = useTheme();
  return (
    <>
      <PageHeader
        overline="STAGE 03 // ARCHITECTURE & CAPABILITIES"
        title="What Dev Mode Unlocks"
        subtitle="By granting WRITE_SECURE_SETTINGS from your computer on the next page (Dev Mode CLI or ADB), Dev Mode gains hardware permission to manage these core features without root."
      />

      {/* Feature capabilities grid */}
      <Card>
        <FeatureRow
          tone="cyan"
          icon={<Zap size={20} color={t.accentCyan} />}
          title="Animation Speed Booster (0.5x)"
          body="Cuts window, transition, and animator durations by half. Your phone immediately feels twice as fast with no battery penalty."
        />
        <FeatureRow
          tone="cyan"
          icon={<Sliders size={20} color={t.accentCyan} />}
          title="Single-Tap Developer Switches"
          body="Directly toggle Developer Options, USB Debugging, and Wireless ADB without navigating multiple nested system settings screens."
        />
        <FeatureRow
          tone="cyan"
          icon={<Layers size={20} color={t.accentCyan} />}
          title="Advanced Developer Settings"
          body="Unlock screen keep-awake while charging, touch circle visualization, and pointer coordinate overlays for debugging."
        />
      </Card>

      {/* Readiness Check Card */}
      <Card style={{ backgroundColor: t.canvasElevated, borderColor: t.cardBorder }}>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Terminal size={16} color={t.accentCyan} />
            <LocalizedText style={[s.prepTitle, { color: t.textPrimary }]}>Preparation for Next Stage</LocalizedText>
          </View>
          <LocalizedText style={[s.prepBody, { color: t.textSecondary }]}>
            In Stage 04, you will run one quick command in your computer&apos;s terminal to grant permission. Have your computer and USB cable ready.
          </LocalizedText>
        </View>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    minHeight: 48,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: radius.full },
  pageCounter: { fontFamily: fonts.mono, fontSize: 12 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    width: '100%',
  },
  page: { gap: space.lg, width: '100%' },
  pageHeader: { gap: space.xs, width: '100%' },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
  },
  heroBox: {
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
    borderWidth: 1,
    width: '100%',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -100,
    right: -80,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 32,
    letterSpacing: -0.8,
  },
  heroDesc: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
  },
  privacyHero: {
    alignItems: 'center',
    paddingTop: space.sm,
  },
  ackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    width: '100%',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
  },
  stepRow: { flexDirection: 'row', gap: space.md, width: '100%' },
  stepRail: { alignItems: 'center' },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepNum: { fontFamily: fonts.monoBold, fontSize: 11 },
  stepLine: { width: 2, flex: 1, marginVertical: 4, minHeight: 16 },
  stepContent: { flex: 1, gap: 2, paddingBottom: space.md },
  stepTitle: { fontFamily: fonts.heading, fontSize: 14.5 },
  stepDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    width: '100%',
  },
  prepTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  prepBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18.5,
  },
  backBtn: { flex: 1 },
  actionBtn: { flex: 2 },
  appIconContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  appIconImage: {
    width: 48,
    height: 48,
  },
});
