import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import LocalizedText from '@/components/LocalizedText';
import Animated, { FadeIn } from 'react-native-reanimated';
import Terminal from 'lucide-react-native/icons/terminal';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import Sliders from 'lucide-react-native/icons/sliders-vertical';
import KeyRound from 'lucide-react-native/icons/key-round';
import Cpu from 'lucide-react-native/icons/cpu';
import DevToggle, { type PermissionStatus } from '@/modules/dev-toggle-native';
import { Button, Card, CodeBlock, FeatureRow, IconContainer, Pill } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

export const APP_ID = 'com.devmode.app';
export const GRANT_COMMAND = `adb shell pm grant ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`;
// The npm package is 'dev-mode-cli' but the command it installs is 'devmode'.
// Without installing, npx must use the package name: plain 'npx devmode' would run an unrelated npm package.
export const CLI_INSTALL_COMMAND = 'npm install -g dev-mode-cli';
export const CLI_GRANT_COMMAND = 'devmode grant';
export const CLI_AUTO_COMMAND = 'devmode auto';
export const NPX_GRANT_COMMAND = 'npx dev-mode-cli grant';
export const REVOKE_COMMAND = `adb shell pm revoke ${APP_ID} android.permission.WRITE_SECURE_SETTINGS`;

export function useWriteSecurePermission() {
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [shizukuStatus, setShizukuStatus] = useState<'unavailable' | 'needs_permission' | 'authorized'>('unavailable');
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const [permissionStatus, currentShizukuStatus] = await Promise.all([
        DevToggle.getPermissionStatus(),
        DevToggle.getShizukuStatus(),
      ]);
      setPermission(permissionStatus);
      setShizukuStatus(currentShizukuStatus);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([DevToggle.getPermissionStatus(), DevToggle.getShizukuStatus()]).then(
      ([permissionStatus, currentShizukuStatus]) => {
        if (!active) return;
        setPermission(permissionStatus);
        setShizukuStatus(currentShizukuStatus);
      }
    );
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [check]);

  return {
    permission,
    shizukuStatus,
    accessGranted: permission === 'granted' || shizukuStatus === 'authorized',
    checking,
    check,
  };
}

export function AdbSetupGuide({
  permission,
  shizukuStatus,
  checking,
  onCheck,
}: {
  permission: PermissionStatus;
  shizukuStatus: 'unavailable' | 'needs_permission' | 'authorized';
  checking: boolean;
  onCheck: () => void | Promise<void>;
}) {
  const t = useTheme();
  const [method, setMethod] = useState<'npx' | 'adb' | 'shizuku'>('npx');

  return (
    <View style={s.wrap}>
      {/* Live Status Header */}
      <PermissionStatusCard
        permission={permission}
        shizukuStatus={shizukuStatus}
        checking={checking}
        onCheck={onCheck}
      />

      {/* Method switch: CLI, plain ADB, or Shizuku */}
      <View style={s.methodRow}>
        <Button
          variant={method === 'npx' ? 'cyan' : 'ghost'}
          label="CLI"
          onPress={() => setMethod('npx')}
          style={s.methodBtn}
        />
        <Button
          variant={method === 'adb' ? 'cyan' : 'ghost'}
          label="Manual ADB"
          onPress={() => setMethod('adb')}
          style={s.methodBtn}
        />
        <Button
          variant={method === 'shizuku' ? 'cyan' : 'ghost'}
          label="Shizuku"
          onPress={() => setMethod('shizuku')}
          style={s.methodBtn}
        />
      </View>

      {method === 'npx' && (
        <Card>
          <View style={s.cardHead}>
            <IconContainer tone="cyan" size={44}>
              <Terminal size={22} color={t.accentCyan} />
            </IconContainer>
            <View style={{ flex: 1, gap: 2 }}>
              <LocalizedText style={[s.cardOverline, { color: t.accentCyan }]}>RECOMMENDED</LocalizedText>
              <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Grant with the Dev Mode CLI</LocalizedText>
            </View>
          </View>

          <Step n={1} title="Install Node.js and ADB">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              You need Node.js 16+ and Android Platform Tools (adb) available in your computer terminal.
            </LocalizedText>
          </Step>

          <Step n={2} title="Enable USB Debugging & connect">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              Turn ON USB Debugging, connect the cable, and tap “Always allow” on your phone.
            </LocalizedText>
            <View style={{ marginTop: 4 }}>
              <Button
                variant="secondary"
                label="Open Developer Options"
                icon={<Sliders size={15} color="#FFFFFF" />}
                onPress={() => DevToggle.openSettings('developerOptions')}
              />
            </View>
          </Step>

          <Step n={3} title="Install the Dev Mode CLI">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              One-time install. This adds the devmode command to your computer:
            </LocalizedText>
            <CodeBlock command={CLI_INSTALL_COMMAND} />
          </Step>

          <Step n={4} title="Grant the permission">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              It finds your phone and grants the permission for you:
            </LocalizedText>
            <CodeBlock command={CLI_GRANT_COMMAND} />
            <LocalizedText style={[s.stepBody, { color: t.textMuted }]}>
              Prefer not to install? Run it once without installing:
            </LocalizedText>
            <CodeBlock command={NPX_GRANT_COMMAND} />
          </Step>

          <Step n={5} title="Optional: control Dev Mode from your PC">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              The same CLI can toggle Developer Options, USB and Wireless Debugging, and connect over Wi-Fi. Open its one-key menu with:
            </LocalizedText>
            <CodeBlock command={CLI_AUTO_COMMAND} />
          </Step>
        </Card>
      )}

      {method === 'adb' && (
        <Card>
          <View style={s.cardHead}>
            <IconContainer tone="cyan" size={44}>
              <Terminal size={22} color={t.accentCyan} />
            </IconContainer>
            <View style={{ flex: 1, gap: 2 }}>
              <LocalizedText style={[s.cardOverline, { color: t.accentCyan }]}>TERMINAL GUIDE</LocalizedText>
              <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>Quick ADB Setup</LocalizedText>
            </View>
          </View>

          {/* Step 1 */}
          <View style={s.unifiedStep}>
            <View style={s.stepBadge}>
              <LocalizedText style={[s.stepNum, { color: t.primaryLight }]}>1</LocalizedText>
            </View>
            <View style={s.stepContent}>
              <LocalizedText style={[s.stepTitle, { color: t.textPrimary }]}>Make sure ADB is installed</LocalizedText>
              <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
                Ensure Android Platform Tools / ADB is installed and recognized on your computer terminal.
              </LocalizedText>
            </View>
          </View>

          {/* Step 2 */}
          <View style={s.unifiedStep}>
            <View style={s.stepBadge}>
              <LocalizedText style={[s.stepNum, { color: t.primaryLight }]}>2</LocalizedText>
            </View>
            <View style={s.stepContent}>
              <LocalizedText style={[s.stepTitle, { color: t.textPrimary }]}>Enable USB Debugging & connect</LocalizedText>
              <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
                Open Developer Options on your phone, turn ON USB Debugging, and connect via USB cable.
              </LocalizedText>
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
              <LocalizedText style={[s.stepNum, { color: t.primaryLight }]}>3</LocalizedText>
            </View>
            <View style={s.stepContent}>
              <LocalizedText style={[s.stepTitle, { color: t.textPrimary }]}>Verify device connection</LocalizedText>
              <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
                Run this command in your computer terminal and accept the “Always allow” prompt on your phone:
              </LocalizedText>
              <CodeBlock command="adb devices" />
            </View>
          </View>

          {/* Step 4 */}
          <View style={s.unifiedStep}>
            <View style={s.stepBadge}>
              <LocalizedText style={[s.stepNum, { color: t.primaryLight }]}>4</LocalizedText>
            </View>
            <View style={s.stepContent}>
              <LocalizedText style={[s.stepTitle, { color: t.textPrimary }]}>Grant permission command</LocalizedText>
              <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
                Copy and execute this verified one-line command in your terminal:
              </LocalizedText>
              <CodeBlock command={GRANT_COMMAND} />
            </View>
          </View>
        </Card>
      )}

      {method === 'shizuku' && (
        <Card>
          <View style={s.cardHead}>
            <IconContainer tone="cyan" size={44}>
              <Cpu size={22} color={t.accentCyan} />
            </IconContainer>
            <View style={{ flex: 1, gap: 2 }}>
              <LocalizedText style={[s.cardOverline, { color: t.accentCyan }]}>NO PC REQUIRED</LocalizedText>
              <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>On-Device Shizuku Setup</LocalizedText>
            </View>
            <Pill
              label={shizukuStatus === 'authorized' ? 'ACTIVE' : shizukuStatus === 'needs_permission' ? 'PROMPT' : 'OFFLINE'}
              tone={shizukuStatus === 'authorized' ? 'success' : 'warning'}
            />
          </View>

          <Step n={1} title="Get the Shizuku app">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              Install the open-source Shizuku app on this device from GitHub or Google Play.
            </LocalizedText>
            <View style={{ marginTop: 8 }}>
              <Button
                variant="ghost"
                label="Download Shizuku"
                onPress={() => Linking.openURL('https://shizuku.rikka.app/download/')}
              />
            </View>
          </Step>

          <Step n={2} title="Start Shizuku via Wireless Debugging">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              Open Shizuku, select &quot;Start via Wireless Debugging&quot;, pair via Developer Options, and press Start.
            </LocalizedText>
          </Step>

          <Step n={3} title="Authorize Dev Mode">
            <LocalizedText style={[s.stepBody, { color: t.textSecondary }]}>
              {shizukuStatus === 'authorized'
                ? 'Dev Mode is already authorized in Shizuku!'
                : 'Connect to Shizuku to authorize direct developer toggles without a computer.'}
            </LocalizedText>
            <View style={{ marginTop: 8 }}>
              <Button
                variant={shizukuStatus === 'authorized' ? 'secondary' : 'cyan'}
                label={shizukuStatus === 'authorized' ? 'Shizuku Authorized ✓' : 'Authorize in Shizuku'}
                onPress={async () => {
                  if (shizukuStatus === 'needs_permission') {
                    await DevToggle.requestShizukuPermission?.();
                  } else if (shizukuStatus === 'unavailable') {
                    if (DevToggle.openShizuku) {
                      DevToggle.openShizuku();
                    } else {
                      Linking.openURL('https://shizuku.rikka.app/');
                    }
                  }
                  await onCheck();
                }}
              />
            </View>
          </Step>
        </Card>
      )}

      {/* Full User Control & Revoke Info for PC ADB methods */}
      {method !== 'shizuku' && (
        <>
          <Card style={{ backgroundColor: t.canvasElevated, borderColor: t.cardBorder }}>
            <FeatureRow
              icon={<KeyRound size={20} color={t.accentCyan} />}
              title="Full User Control & Permission Revocation"
              body="You are in complete control. If you ever want to revoke this permission, simply run this command from your computer:"
              tone="cyan"
            />
            <CodeBlock command={REVOKE_COMMAND} />
          </Card>

          <LocalizedText style={[s.tip, { color: t.textMuted }]}>
            Note: This authorization stays tied to this device installation. If you reinstall or reset the app, run the grant command again.
          </LocalizedText>
        </>
      )}
    </View>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={s.unifiedStep}>
      <View style={s.stepBadge}>
        <LocalizedText style={[s.stepNum, { color: t.primaryLight }]}>{n}</LocalizedText>
      </View>
      <View style={s.stepContent}>
        <LocalizedText style={[s.stepTitle, { color: t.textPrimary }]}>{title}</LocalizedText>
        {children}
      </View>
    </View>
  );
}

export function PermissionStatusCard({
  permission,
  shizukuStatus = 'unavailable',
  checking,
  onCheck,
}: {
  permission: PermissionStatus;
  shizukuStatus?: 'unavailable' | 'needs_permission' | 'authorized';
  checking?: boolean;
  onCheck?: () => void | Promise<void>;
}) {
  const t = useTheme();
  const adbGranted = permission === 'granted';
  const shizukuGranted = shizukuStatus === 'authorized';
  const granted = adbGranted || shizukuGranted;

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
        <LocalizedText style={[s.statusTitle, { color: t.textPrimary }]}>
          {adbGranted
            ? 'ADB PERMISSION ACTIVE'
            : shizukuGranted
              ? 'SHIZUKU ACCESS ACTIVE'
              : 'WRITE_SECURE_SETTINGS: PENDING'}
        </LocalizedText>
        <LocalizedText style={[s.statusBody, { color: t.textSecondary }]}>
          {granted
            ? shizukuGranted && !adbGranted
              ? 'Shizuku authorization verified. Instant switching is enabled.'
              : 'Hardware permission verified. Instant switching is enabled.'
            : 'Run the grant command from your PC (Dev Mode CLI or ADB) to unlock direct controls.'}
        </LocalizedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Pill
          label={adbGranted ? 'GRANTED' : shizukuGranted ? 'SHIZUKU' : 'DENIED'}
          tone={granted ? 'success' : 'warning'}
        />
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
  methodRow: { flexDirection: 'row', gap: space.sm, width: '100%' },
  methodBtn: { flex: 1 },
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
