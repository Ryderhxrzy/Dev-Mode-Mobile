import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Lock from 'lucide-react-native/icons/lock';
import Cpu from 'lucide-react-native/icons/cpu';
import ServerOff from 'lucide-react-native/icons/server-off';
import KeyRound from 'lucide-react-native/icons/key-round';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Copy from 'lucide-react-native/icons/copy';
import Check from 'lucide-react-native/icons/check';
import DevToggle from '@/modules/dev-toggle-native';
import { Card, FeatureRow, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

const REVOKE_COMMAND = 'adb shell pm revoke com.devmode.app android.permission.WRITE_SECURE_SETTINGS';

export default function SecuritySettings() {
  const t = useTheme();
  const [permission, setPermission] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    DevToggle.getPermissionStatus().then(perm => {
      setPermission(perm === 'granted');
    });
  }, []);

  const handleCopyRevoke = async () => {
    await Clipboard.setStringAsync(REVOKE_COMMAND);
    setCopied(true);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Revoke command copied to clipboard!', ToastAndroid.SHORT);
    }
    setTimeout(() => setCopied(false), 2500);
  };

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
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>PERMISSION INTEGRITY STATUS</Text>
            <Pill
              label={permission ? 'GRANTED' : 'NOT AUTHORIZED'}
              tone={permission ? 'success' : 'warning'}
            />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[s.rowTitle, { color: t.textPrimary }]}>WRITE_SECURE_SETTINGS</Text>
                  <Pill
                    label={permission ? 'GRANTED' : 'PENDING'}
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
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color={t.success} />
                <Text style={[s.infoTitle, { color: t.textPrimary }]}>Always In Your Full Control</Text>
              </View>
              <Text style={[s.infoDesc, { color: t.textSecondary }]}>
                You retain complete authority. You can revoke WRITE_SECURE_SETTINGS at any time from your computer using ADB, or simply by uninstalling the application.
              </Text>

              {/* Copyable Terminal Command Block */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy ADB Revoke Command"
                onPress={handleCopyRevoke}
                style={({ pressed }) => [s.codeCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={s.codeHeader}>
                  <Text style={[s.codeLabel, { color: t.textMuted }]}>ADB REVOKE COMMAND</Text>
                  <View style={s.codeActionRow}>
                    {copied ? (
                      <Check size={14} color="#4ADE80" />
                    ) : (
                      <Copy size={14} color={t.accentCyan} />
                    )}
                    <Text style={[s.codeActionText, { color: copied ? '#4ADE80' : t.accentCyan }]}>
                      {copied ? 'COPIED' : 'TAP TO COPY'}
                    </Text>
                  </View>
                </View>
                <Text style={s.codeText}>{REVOKE_COMMAND}</Text>
              </Pressable>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
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
  codeCard: {
    backgroundColor: '#040E0A',
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    padding: space.md,
    gap: space.xs,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  codeActionText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  codeText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: '#4ADE80',
    lineHeight: 18,
  },
});

