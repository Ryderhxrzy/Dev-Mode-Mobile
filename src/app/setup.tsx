import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { AdbSetupGuide, useWriteSecurePermission } from '@/components/adb-setup';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, Overline } from '@/components/ui';
import { fonts, space, useTheme } from '@/theme';

export default function Setup() {
  const t = useTheme();
  const { permission, checking, check } = useWriteSecurePermission();

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Overline>TERMINAL GUIDE</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>ADB Permission Setup</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Execute the verified command using Android Platform Tools on your computer. Status below checks and updates automatically.
            </Text>
          </View>

          <AdbSetupGuide permission={permission} checking={checking} onCheck={check} />

          {permission === 'granted' && (
            <Button
              variant="cyan"
              label="Continue to Success Screen"
              icon={<ArrowRight size={16} color="#FFFFFF" />}
              onPress={() => router.replace('/success')}
            />
          )}
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
    paddingBottom: 28,
    gap: space.lg,
    width: '100%',
  },
  header: { gap: space.xs, width: '100%' },
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
});
