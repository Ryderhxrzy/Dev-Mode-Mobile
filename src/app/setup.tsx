import { AdbSetupGuide, useWriteSecurePermission } from '@/components/adb-setup';
import { Button, Overline } from '@/components/ui';
import { space, useTheme } from '@/theme';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Setup() {
  const t = useTheme();
  const { permission, check } = useWriteSecurePermission();
  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Overline>GUIDED SETUP</Overline>
            <Text style={[s.title, { color: t.text }]}>Grant permission with ADB</Text>
            <Text style={[s.subtitle, { color: t.muted }]}>
              Android requires this permission to be granted from a computer. Follow the steps, then come back — the status
              updates automatically.
            </Text>
          </View>
          <AdbSetupGuide permission={permission} onCheck={check} />
          {permission === 'granted' && <Button label="Back to dashboard" onPress={() => router.back()} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.xl, paddingTop: space.sm, paddingBottom: 40, gap: space.xl },
  header: { gap: space.sm },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 22 },
});
