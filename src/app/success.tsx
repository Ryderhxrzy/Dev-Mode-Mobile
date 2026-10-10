import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { Button, Card, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function SuccessScreen() {
  const t = useTheme();

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Prominent App Logo Hero */}
          <Animated.View entering={ZoomIn.duration(450)} style={s.heroCenter}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={s.appLogo}
              resizeMode="contain"
            />
            <View style={{ marginTop: space.sm }}>
              <Pill label="SYSTEM PERMISSION ACTIVE" tone="success" />
            </View>
          </Animated.View>

          {/* Welcome Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={s.header}>
            <Overline>HARDWARE ACCESS UNLOCKED</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Welcome to Dev Mode</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Your device is fully configured and primed for high-performance developer workflows. All settings take effect instantly.
            </Text>
          </Animated.View>

          {/* Unlocked Capabilities Grid/Cards */}
          <Animated.View entering={FadeInDown.delay(180).duration(350)} style={s.featuresList}>
            {/* Feature 1: Animation Booster */}
            <Card style={s.featureCard}>
              <View style={s.featureHead}>
                <IconContainer tone="success" size={40}>
                  <Zap size={20} color={t.success} />
                </IconContainer>
                <View style={s.featureTitleCol}>
                  <Text style={[s.featureTag, { color: t.primaryLight }]}>PERFORMANCE</Text>
                  <Text style={[s.featureTitle, { color: t.textPrimary }]}>Animation Speed Booster</Text>
                </View>
                <Pill label="0.5X READY" tone="success" />
              </View>
              <Text style={[s.featureBody, { color: t.textSecondary }]}>
                Window, transition, and animator scales optimized to 0.5x for snappy, instantaneous UI responsiveness.
              </Text>
            </Card>

            {/* Feature 2: Hardware Toggles */}
            <Card style={s.featureCard}>
              <View style={s.featureHead}>
                <IconContainer tone="success" size={40}>
                  <Sliders size={20} color={t.success} />
                </IconContainer>
                <View style={s.featureTitleCol}>
                  <Text style={[s.featureTag, { color: t.primaryLight }]}>CONTROLS</Text>
                  <Text style={[s.featureTitle, { color: t.textPrimary }]}>Direct Hardware Toggles</Text>
                </View>
                <Pill label="UNLOCKED" tone="success" />
              </View>
              <Text style={[s.featureBody, { color: t.textSecondary }]}>
                One-tap switches for Developer Options, USB Debugging, Wireless ADB, Stay Awake, and touch inspect.
              </Text>
            </Card>

            {/* Feature 3: Privacy Guarantee */}
            <Card style={s.featureCard}>
              <View style={s.featureHead}>
                <IconContainer tone="success" size={40}>
                  <ShieldCheck size={20} color={t.success} />
                </IconContainer>
                <View style={s.featureTitleCol}>
                  <Text style={[s.featureTag, { color: t.primaryLight }]}>SECURITY</Text>
                  <Text style={[s.featureTitle, { color: t.textPrimary }]}>100% Offline & Local</Text>
                </View>
                <Pill label="PRIVATE" tone="success" />
              </View>
              <Text style={[s.featureBody, { color: t.textSecondary }]}>
                All toggle states and preferences remain strictly on this device. Zero analytics, telemetry, or remote servers.
              </Text>
            </Card>
          </Animated.View>
        </ScrollView>

        {/* Enter Dashboard Button */}
        <Animated.View entering={FadeInDown.delay(260).duration(350)} style={[s.footer, { borderColor: t.cardBorder }]}>
          <Button
            variant="primary"
            label="Launch Dashboard"
            icon={<Sparkles size={18} color="#FFFFFF" />}
            onPress={() => router.replace('/')}
            style={s.launchBtn}
          />
        </Animated.View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: 24,
    gap: space.lg,
    alignItems: 'center',
    width: '100%',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.sm,
  },
  appLogo: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
  },
  header: {
    gap: space.xs,
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 27,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: space.xs,
  },
  featuresList: {
    width: '100%',
    gap: space.md,
  },
  featureCard: {
    gap: space.sm,
    padding: space.md,
  },
  featureHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  featureTitleCol: {
    flex: 1,
    gap: 2,
  },
  featureTag: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  featureTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  featureBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18.5,
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
