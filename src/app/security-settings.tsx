import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  Lock,
  Cpu,
  ServerOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react-native';
import DevToggle from '@/modules/dev-toggle-native';
import { Card, FeatureRow, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, space, useTheme } from '@/theme';

export default function SecuritySettings() {
  const t = useTheme();
  const [permission, setPermission] = useState<boolean>(false);

  useEffect(() => {
    DevToggle.getPermissionStatus().then(perm => {
      setPermission(perm === 'granted');
    });
  }, []);

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>PRIVACY & INTEGRITY</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Security & Privacy</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Learn how Dev Mode protects your device with local-only architecture, zero telemetry, and scoped hardware permissions.
            </Text>
          </View>

          {/* Authorization Status */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>PERMISSION INTEGRITY STATUS</Text>
          </View>

          <Card
            style={{
              borderColor: permission ? `${t.success}60` : `${t.warning}60`,
              backgroundColor: permission ? `${t.success}10` : `${t.warning}10`,
            }}>
            <View style={s.row}>
              <IconContainer tone={permission ? 'success' : 'warning'} size={44}>
                <Lock size={22} color={permission ? t.success : t.warning} />
              </IconContainer>
              <View style={s.rowCopy}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[s.rowTitle, { color: t.textPrimary }]}>WRITE_SECURE_SETTINGS</Text>
                  <Pill
                    label={permission ? 'GRANTED' : 'NOT AUTHORIZED'}
                    tone={permission ? 'success' : 'warning'}
                  />
                </View>
                <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                  {permission
                    ? 'Hardware permission is verified active. Scoped exclusively to developer options toggles.'
                    : 'Permission is pending. Run the one-time ADB command to authorize direct toggles.'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Security Features Breakdown */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>CORE SECURITY COMMITMENTS</Text>
          </View>

          <Card>
            <FeatureRow
              tone="success"
              icon={<ShieldCheck size={20} color={t.success} />}
              title="100% Device-Exclusive Data"
              body="No cloud database or accounts. All toggle preferences and animation scale profiles stay exclusively on this smartphone."
            />
            <FeatureRow
              tone="success"
              icon={<ServerOff size={20} color={t.success} />}
              title="Zero Telemetry & Offline"
              body="No ads, analytics SDKs, trackers, or online telemetry. The application operates without any external network dependency."
            />
            <FeatureRow
              tone="cyan"
              icon={<KeyRound size={20} color={t.accentCyan} />}
              title="No Root Access Required"
              body="Unlike risky rooting or bootloader unlocks, WRITE_SECURE_SETTINGS is an official Android OS enterprise permission that keeps your system partition secure."
            />
            <FeatureRow
              tone="cyan"
              icon={<Cpu size={20} color={t.accentCyan} />}
              title="Strictly Scoped Hardware Access"
              body="The native code only reads and writes developer settings (ADB, wireless debugging, animation duration scale, stay awake). It has zero access to files, media, or private app data."
            />
          </Card>

          {/* Revocation Information */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>REVOCATION & CONTROLS</Text>
          </View>

          <Card>
            <View style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color={t.success} />
                <Text style={[s.infoTitle, { color: t.textPrimary }]}>Always In Your Full Control</Text>
              </View>
              <Text style={[s.infoDesc, { color: t.textSecondary }]}>
                You can revoke WRITE_SECURE_SETTINGS at any time via computer using `adb shell pm revoke com.jhayr.developertoggle android.permission.WRITE_SECURE_SETTINGS`, or simply by uninstalling the application.
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
  infoTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  infoDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});

