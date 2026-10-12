import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Terminal from 'lucide-react-native/icons/terminal';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import Sliders from 'lucide-react-native/icons/sliders-vertical';
import KeyRound from 'lucide-react-native/icons/key-round';
import DevToggle, { type PermissionStatus } from '@/modules/dev-toggle-native';
import { Button, Card, CodeBlock, FeatureRow, IconContainer, Pill } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

export const APP_ID = 'com.devmode.app';
export const GRANT_COMMAND = `adb shell pm grant ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`;
export const REVOKE_COMMAND = `adb shell pm revoke ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`;

export function useWriteSecurePermission() {
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const status = await DevToggle.getPermissionStatus();
      setPermission(status);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    DevToggle.getPermissionStatus().then(value => {
      if (active) setPermission(value);
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [check]);

  return { permission, checking, check };
}

export function AdbSetupGuide({
  permission,
  checking,
  onCheck,
}: {
  permission: PermissionStatus;
  checking: boolean;
  onCheck: () => void;
}) {
  const t = useTheme();

  return (
    <View style={s.wrap}>
      {/* Live Status Header */}
      <PermissionStatusCard permission={permission} checking={checking} onCheck={onCheck} />

      {/* Single Consolidated Setup Card */}
      <Card>
        <View style={s.cardHead}>
          <IconContainer tone="cyan" size={44}>
            <Terminal size={22} color={t.accentCyan} />
          </IconContainer>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[s.cardOverline, { color: t.accentCyan }]}>TERMINAL GUIDE</Text>
            <Text style={[s.cardTitle, { color: t.textPrimary }]}>Quick ADB Setup</Text>
          </View>
        </View>

        {/* Step 1 */}
        <View style={s.unifiedStep}>
          <View style={s.stepBadge}>
            <Text style={[s.stepNum, { color: t.primaryLight }]}>1</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: t.textPrimary }]}>Make sure ADB is installed</Text>
            <Text style={[s.stepBody, { color: t.textSecondary }]}>
              Ensure Android Platform Tools / ADB is installed and recognized on your computer terminal.
            </Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={s.unifiedStep}>
          <View style={s.stepBadge}>
            <Text style={[s.stepNum, { color: t.primaryLight }]}>2</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: t.textPrimary }]}>Enable USB Debugging & connect</Text>
            <Text style={[s.stepBody, { color: t.textSecondary }]}>
              Open Developer Options on your phone, turn ON USB Debugging, and connect via USB cable.
            </Text>
            <View style={{ marginTop: 4 }}>
              <Button
                variant="secondary"
                label="Open Developer Options"
                icon={<Sliders size={15} color="#FFFFFF" />}
                onPress={() => DevToggle.openSettings('developerOptions')}
              />
            </View>
          </View>
        </View>

        {/* Step 3 */}
        <View style={s.unifiedStep}>
          <View style={s.stepBadge}>
            <Text style={[s.stepNum, { color: t.primaryLight }]}>3</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: t.textPrimary }]}>Verify device connection</Text>
            <Text style={[s.stepBody, { color: t.textSecondary }]}>
              Run this command in your computer terminal and accept the “Always allow” prompt on your phone:
            </Text>
            <CodeBlock command="adb devices" />
          </View>
        </View>

        {/* Step 4 */}
        <View style={s.unifiedStep}>
          <View style={s.stepBadge}>
            <Text style={[s.stepNum, { color: t.primaryLight }]}>4</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: t.textPrimary }]}>Grant permission command</Text>
            <Text style={[s.stepBody, { color: t.textSecondary }]}>
              Copy and execute this verified one-line command in your terminal:
            </Text>
            <CodeBlock command={GRANT_COMMAND} />
          </View>
        </View>
      </Card>

      {/* Full User Control & Revoke Info (Located in Step 4 as requested) */}
      <Card style={{ backgroundColor: t.canvasElevated, borderColor: t.cardBorder }}>
        <FeatureRow
          icon={<KeyRound size={20} color={t.accentCyan} />}
          title="Full User Control & Permission Revocation"
          body="You are in complete control. If you ever want to revoke this permission, simply run this command from your computer:"
          tone="cyan"
        />
        <CodeBlock command={REVOKE_COMMAND} />
      </Card>

      <Text style={[s.tip, { color: t.textMuted }]}>
        Note: This authorization stays tied to this device installation. If you reinstall or reset the app, run the grant command again.
      </Text>
    </View>
  );
}

export function PermissionStatusCard({
  permission,
  checking,
  onCheck,
}: {
  permission: PermissionStatus;
  checking?: boolean;
  onCheck?: () => void;
}) {
  const t = useTheme();
  const granted = permission === 'granted';

  return (
    <Animated.View
      key={permission}
      entering={FadeIn.duration(250)}
      style={[
        s.status,
        {
          backgroundColor: granted ? t.successSoft : t.warningSoft,
          borderColor: granted ? `${t.success}50` : `${t.warning}50`,
        },
      ]}>
      {granted ? (
        <ShieldCheck size={28} color={t.success} />
      ) : (
        <ShieldAlert size={28} color={t.warning} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.statusTitle, { color: t.textPrimary }]}>
          {granted ? 'ADB PERMISSION ACTIVE' : 'WRITE_SECURE_SETTINGS: PENDING'}
        </Text>
        <Text style={[s.statusBody, { color: t.textSecondary }]}>
          {granted
            ? 'Hardware permission verified. Instant switching is enabled.'
            : 'Run the ADB grant command from your PC to unlock direct controls.'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Pill label={granted ? 'GRANTED' : 'DENIED'} tone={granted ? 'success' : 'warning'} />
        {onCheck && (
          <Button
            variant="ghost"
            label={checking ? '...' : 'Recheck'}
            onPress={onCheck}
            style={s.miniRecheck}
          />
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.md, width: '100%' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: 4 },
  cardOverline: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.2 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18 },
  unifiedStep: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
    width: '100%',
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginTop: 2,
  },
  stepNum: { fontFamily: fonts.monoBold, fontSize: 12 },
  stepContent: { flex: 1, gap: 6 },
  stepTitle: { fontFamily: fonts.heading, fontSize: 14.5 },
  stepBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
  },
  statusTitle: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 0.5 },
  statusBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  tip: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  miniRecheck: { minHeight: 28, paddingHorizontal: 6 },
});
