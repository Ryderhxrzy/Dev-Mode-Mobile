import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  CheckCircle2,
  Zap,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { Button, Card, FeatureRow, Overline, Pill } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

export default function SuccessScreen() {
  const t = useTheme();

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Animated Glowing Success Badge */}
          <Animated.View entering={ZoomIn.duration(450)} style={s.heroCenter}>
            <View style={[s.glowRing, { backgroundColor: t.primaryGlow }]} />
            <View style={[s.iconBox, { borderColor: `${t.success}60`, backgroundColor: t.canvasElevated }]}>
              <Image
                source={require('@/assets/images/icon2.png')}
                style={s.appLogo}
                resizeMode="contain"
              />
              <View style={[s.checkBadge, { backgroundColor: t.success }]}>
                <CheckCircle2 size={20} color="#052E16" strokeWidth={2.5} />
              </View>
            </View>
          </Animated.View>

          {/* Welcome Message */}
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={s.header}>
            <Overline>HARDWARE ACCESS UNLOCKED</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Welcome to Dev Mode</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              ADB permission has been verified successfully. Your device is now fully unlocked for direct system toggles and performance tuning.
            </Text>
          </Animated.View>

          {/* Active Features Summary */}
          <Animated.View entering={FadeInDown.delay(180).duration(350)}>
            <Card style={{ borderColor: `${t.success}50` }}>
              <View style={s.cardHead}>
                <Pill label="SYSTEM STATUS: OPTIMIZED" tone="success" />
              </View>

              <FeatureRow
                tone="success"
                icon={<Zap size={20} color={t.success} />}
                title="Animation Speed Booster Ready"
                body="Enjoy instantaneous transitions with default 0.5x animation scales or customizable speeds."
              />

              <FeatureRow
                tone="success"
                icon={<Sliders size={20} color={t.success} />}
                title="Instant Developer Toggles"
                body="Switch USB Debugging, Wireless ADB, and Stay Awake without digging into deep system menus."
              />

              <FeatureRow
                tone="success"
                icon={<ShieldCheck size={20} color={t.success} />}
                title="100% Offline & Private"
                body="All modifications stay directly on this phone. Zero analytics, no third parties, no telemetry."
              />
            </Card>
          </Animated.View>
        </ScrollView>

        {/* Enter Dashboard Button */}
        <Animated.View entering={FadeInDown.delay(260).duration(350)} style={[s.footer, { borderColor: t.cardBorder }]}>
          <Button
            variant="cyan"
            label="Launch Dashboard"
            icon={<Sparkles size={18} color="#FFFFFF" />}
            onPress={() => router.replace('/')}
            style={s.launchBtn}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: 28,
    gap: space.xl,
    alignItems: 'center',
    width: '100%',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  appLogo: {
    width: 68,
    height: 68,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    borderRadius: radius.full,
    padding: 3,
  },
  header: {
    gap: space.xs,
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
  },
  cardHead: {
    alignItems: 'flex-start',
    marginBottom: space.xs,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: 1,
    width: '100%',
  },
  launchBtn: {
    width: '100%',
  },
});

