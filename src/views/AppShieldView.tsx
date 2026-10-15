import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Info from 'lucide-react-native/icons/info';
import BatteryCharging from 'lucide-react-native/icons/battery-charging';
import Smartphone from 'lucide-react-native/icons/smartphone';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Lock from 'lucide-react-native/icons/lock';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Zap from 'lucide-react-native/icons/zap';
import LocalizedText from '@/components/LocalizedText';
import { Button, Card, CyberToggle, IconContainer, Overline } from '@/components/ui';
import DevToggle, { type InstalledApp } from '@/modules/dev-toggle-native';
import { fonts, radius, space, useTheme } from '@/theme';

export interface AppShieldViewProps {
  isActive?: boolean;
}

function AppIcon({
  icon,
  isShielded,
  t,
}: {
  icon?: string;
  isShielded: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={s.appIconWrapper}>
      <View style={[s.appIconContainer, { backgroundColor: t.canvasElevated }]}>
        {icon && !failed ? (
          <Image
            source={{ uri: icon }}
            style={s.appIcon}
            resizeMode="contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <ShieldCheck size={22} color={isShielded ? t.success : t.accentCyan} />
        )}
      </View>

      {/* Security Shield Badge Overlay on App Icon */}
      {isShielded && (
        <View style={[s.iconShieldBadge, { backgroundColor: '#050D0A', borderColor: t.success }]}>
          <ShieldCheck size={10} color={t.success} />
        </View>
      )}
    </View>
  );
}

export function AppShieldView({ isActive = false }: AppShieldViewProps) {
  const t = useTheme();
  const [shieldEnabled, setShieldEnabled] = useState(false);
  const [hasUsageAccess, setHasUsageAccess] = useState(false);
  const [protectedPackages, setProtectedPackages] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [hasLoadedApps, setHasLoadedApps] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const settings = await DevToggle.getAppShieldSettings?.();
      if (settings) {
        setShieldEnabled(settings.enabled);
        setHasUsageAccess(settings.hasUsageAccess);
        setProtectedPackages(settings.protectedPackages || []);
      }
    } catch {}
  }, []);

  const loadApps = useCallback(async (force = false) => {
    if (loadingApps || (hasLoadedApps && !force)) return;
    setLoadingApps(true);
    try {
      const apps = await DevToggle.getInstalledApps?.();
      if (apps) {
        setInstalledApps(apps);
        setHasLoadedApps(true);
      }
    } catch {} finally {
      setLoadingApps(false);
    }
  }, [loadingApps, hasLoadedApps]);

  useEffect(() => {
    let active = true;
    DevToggle.getAppShieldSettings?.().then(settings => {
      if (active && settings) {
        setShieldEnabled(settings.enabled);
        setHasUsageAccess(settings.hasUsageAccess);
        setProtectedPackages(settings.protectedPackages || []);
      }
    }).catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadStatus();
      }
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!isActive || hasLoadedApps) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoadingApps(true);
      return DevToggle.getInstalledApps?.();
    }).then(apps => {
      if (active && apps) {
        setInstalledApps(apps);
        setHasLoadedApps(true);
      }
    }).catch(() => {})
      .finally(() => {
        if (active) setLoadingApps(false);
      });

    return () => {
      active = false;
    };
  }, [isActive, hasLoadedApps]);

  const handleToggleShield = async (val: boolean) => {
    setShieldEnabled(val);
    await DevToggle.setAppShieldEnabled?.(val);
    if (val && !hasUsageAccess) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Usage access is required to detect protected apps.', ToastAndroid.LONG);
      }
    }
    loadStatus();
  };

  const handleTogglePackage = async (pkg: string) => {
    let nextList: string[];
    const isAdding = !protectedPackages.includes(pkg);
    if (!isAdding) {
      nextList = protectedPackages.filter(p => p !== pkg);
    } else {
      nextList = [...protectedPackages, pkg];
    }
    setProtectedPackages(nextList);
    await DevToggle.setProtectedPackages?.(nextList);

    if (isAdding) {
      // Automatically request Android to pin the shielded shortcut and 1x1 widget
      DevToggle.createShieldedShortcut?.(pkg);
      DevToggle.pinShieldWidget1x1?.(pkg);
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show(
        isAdding
          ? `Shielded! Open via Home screen Shield icon for instant bypass`
          : `Unshielded: ${pkg}`,
        ToastAndroid.SHORT
      );
    }
  };

  const handlePin1x1Widget = async (pkg: string, appName: string) => {
    try {
      const res = await DevToggle.pinShieldWidget1x1?.(pkg);
      if (!res) {
        DevToggle.createShieldedShortcut?.(pkg);
      }
    } catch {
      DevToggle.createShieldedShortcut?.(pkg);
    }
  };

  const handlePin3x1Widget = async () => {
    try {
      const res = await DevToggle.pinShieldWidget3x1?.();
      if (!res && Platform.OS === 'android') {
        ToastAndroid.show('Add 3x1 Shield Dock from your launcher widget menu', ToastAndroid.LONG);
      }
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Add 3x1 Shield Dock from your launcher widget menu', ToastAndroid.LONG);
      }
    }
  };

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
    if (!hasLoadedApps) {
      loadApps(false);
    }
  };

  const handleOpenUsageAccess = () => {
    DevToggle.openUsageAccessSettings?.();
  };

  const handleLaunchTest = (pkg: string) => {
    DevToggle.launchProtectedApp?.(pkg);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Launching ${pkg}... Watch Dev Mode auto-toggle OFF!`, ToastAndroid.SHORT);
    }
  };

  const handleOpenBatterySettings = async () => {
    try {
      if (DevToggle.openBatteryOptimizationSettings) {
        await DevToggle.openBatteryOptimizationSettings();
      } else {
        await Linking.openSettings();
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show('Tap "Battery" -> Choose "Unrestricted"', ToastAndroid.LONG);
      }
    } catch {
      await Linking.openSettings();
    }
  };

  const handleOpenAppPermissions = async () => {
    try {
      if (DevToggle.openAppDetailsSettings) {
        await DevToggle.openAppDetailsSettings();
      } else {
        await Linking.openSettings();
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show('Tap "Other permissions" -> Turn ON "Home screen shortcuts"', ToastAndroid.LONG);
      }
    } catch {
      await Linking.openSettings();
    }
  };

  // Protected apps list with metadata from installed apps
  const shieldedApps = useMemo(() => {
    return protectedPackages.map(pkg => {
      const found = installedApps.find(a => a.packageName === pkg);
      return {
        packageName: pkg,
        appName: found?.appName || pkg,
        icon: found?.icon,
        isSystem: found?.isSystem ?? false,
      };
    });
  }, [protectedPackages, installedApps]);

  // Filtered installed apps for the picker modal
  const pickerFilteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return installedApps;
    return installedApps.filter(
      item =>
        item.appName.toLowerCase().includes(q) ||
        item.packageName.toLowerCase().includes(q)
    );
  }, [installedApps, searchQuery]);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingApps}
            onRefresh={() => loadApps(true)}
            tintColor={t.accentCyan}
            colors={[t.accentCyan]}
          />
        }>
        {/* Header */}
        <View style={s.header}>
          <Overline>PRIVACY & AUTO-OFF</Overline>
          <LocalizedText style={[s.title, { color: t.textPrimary }]}>App Shield</LocalizedText>
          <LocalizedText style={[s.subtitle, { color: t.textSecondary }]}>
            Automatically turn OFF Developer Options & ADB while protected banking, payment, or game apps are open. Automatically restores when you leave!
          </LocalizedText>
        </View>

        {/* Master Shield Toggle */}
        <Card
          style={{
            borderColor: shieldEnabled ? `${t.success}90` : `${t.accentCyan}40`,
            backgroundColor: shieldEnabled ? t.canvasElevated : t.canvas,
            borderWidth: 1.5,
          }}>
          <View style={s.switchRow}>
            <IconContainer tone={shieldEnabled ? 'success' : 'cyan'} size={44}>
              <ShieldCheck size={22} color={shieldEnabled ? t.success : t.accentCyan} />
            </IconContainer>
            <View style={s.switchCopy}>
              <LocalizedText style={[s.switchTitle, { color: t.textPrimary }]}>
                App Shield Monitor
              </LocalizedText>
              <LocalizedText style={[s.switchDesc, { color: t.textSecondary }]}>
                {shieldEnabled
                  ? `Active: protecting ${protectedPackages.length} app${protectedPackages.length === 1 ? '' : 's'}`
                  : 'Disabled in background'}
              </LocalizedText>
            </View>
            <CyberToggle
              accessibilityLabel="Master App Shield Switch"
              value={shieldEnabled}
              onValueChange={handleToggleShield}
              size="md"
            />
          </View>
        </Card>

        {/* Usage Access Required Banner */}
        {!hasUsageAccess && (
          <Card
            style={{
              borderColor: `${t.warning}80`,
              backgroundColor: `${t.warning}10`,
              borderWidth: 1.2,
            }}>
            <View style={s.warningRow}>
              <IconContainer tone="warning" size={40}>
                <AlertTriangle size={20} color={t.warning} />
              </IconContainer>
              <View style={s.warningCopy}>
                <LocalizedText style={[s.warningTitle, { color: t.warning }]}>
                  Usage Access Required (Offline Only)
                </LocalizedText>
                <LocalizedText style={[s.warningDesc, { color: t.textPrimary }]}>
                  Android requires the Usage Access permission to detect when a banking or protected app comes to the foreground.
                </LocalizedText>
                <View style={s.secureBulletRow}>
                  <Info size={14} color={t.accentCyan} style={{ marginTop: 2 }} />
                  <LocalizedText style={[s.secureBulletText, { color: t.textSecondary }]}>
                    100% secure, offline, local-only detection with zero telemetry. Look for and enable <LocalizedText style={{ color: t.accentCyan, fontWeight: '700' }}>Dev Mode</LocalizedText> in the settings screen.
                  </LocalizedText>
                </View>
              </View>
            </View>
            <Button
              label="Enable Usage Access for Dev Mode"
              variant="primary"
              onPress={handleOpenUsageAccess}
              style={{ marginTop: space.sm }}
            />
          </Card>
        )}

        {/* Section: Shielded Apps (Default and Only Main Section) */}
        <View style={s.sectionHeaderRow}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            SHIELDED APPS ({shieldedApps.length})
          </LocalizedText>
          {shieldedApps.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add app to shield"
              onPress={handleOpenPicker}
              style={({ pressed }) => [
                s.headerAddBtn,
                {
                  backgroundColor: `${t.accentCyan}18`,
                  borderColor: `${t.accentCyan}70`,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Plus size={13} color={t.accentCyan} />
              <LocalizedText style={[s.headerAddBtnText, { color: t.accentCyan }]}>
                Add App
              </LocalizedText>
            </Pressable>
          )}
        </View>

        {shieldedApps.length === 0 ? (
          /* Empty State: Prompt user with large Add button */
          <Card style={[s.emptyCard, { borderColor: `${t.accentCyan}30` }]}>
            <IconContainer tone="cyan" size={48}>
              <ShieldAlert size={26} color={t.accentCyan} />
            </IconContainer>
            <LocalizedText style={[s.emptyTitle, { color: t.textPrimary }]}>
              No Shielded Apps Added
            </LocalizedText>
            <LocalizedText style={[s.emptyDesc, { color: t.textSecondary }]}>
              Add banking apps, digital wallets, or games. An automatic Shielded icon will be pinned to your Home screen for guaranteed bypass!
            </LocalizedText>
            <Button
              label="Add App to Shield"
              variant="primary"
              icon={<Plus size={16} color="#FFFFFF" />}
              onPress={handleOpenPicker}
              style={{ width: '100%', marginTop: space.xs }}
            />
          </Card>
        ) : (
          /* List of Shielded Apps */
          <View style={s.appsList}>
            {/* Quick Tip Banner for Guaranteed Bypass */}
            <View
              style={[
                s.shieldTipBanner,
                {
                  backgroundColor: `${t.success}12`,
                  borderColor: `${t.success}45`,
                },
              ]}>
              <ShieldCheck size={16} color={t.success} />
              <LocalizedText style={[s.shieldTipText, { color: t.textSecondary }]}>
                Launch apps using their <LocalizedText style={{ color: t.success, fontWeight: '700' }}>Shielded Icon</LocalizedText> on your Home screen for guaranteed instant bypass!
              </LocalizedText>
            </View>

            {/* 3x1 Shield Dock Quick Action */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pin 3x1 Shield Dock to Home screen"
              onPress={handlePin3x1Widget}
              style={({ pressed }) => [
                s.dockBanner,
                {
                  backgroundColor: `${t.accentCyan}10`,
                  borderColor: `${t.accentCyan}45`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <View style={s.dockBannerContent}>
                <IconContainer tone="cyan" size={32}>
                  <LayoutGrid size={16} color={t.accentCyan} />
                </IconContainer>
                <View style={{ flex: 1, gap: 1 }}>
                  <LocalizedText style={[s.dockBannerTitle, { color: t.textPrimary }]}>
                    3x1 Shield Dock Widget
                  </LocalizedText>
                  <LocalizedText style={[s.dockBannerDesc, { color: t.textSecondary }]}>
                    Quick-launch your top shielded apps from your home screen
                  </LocalizedText>
                </View>
                <View style={[s.pinPill, { backgroundColor: `${t.accentCyan}22`, borderColor: `${t.accentCyan}70` }]}>
                  <Plus size={11} color={t.accentCyan} />
                  <LocalizedText style={[s.pinPillText, { color: t.accentCyan }]}>Add 3x1</LocalizedText>
                </View>
              </View>
            </Pressable>

            {shieldedApps.map(item => (
              <Card
                key={item.packageName}
                style={{
                  borderColor: `${t.success}60`,
                  backgroundColor: 'rgba(34, 197, 94, 0.05)',
                }}>
                <View style={s.appRow}>
                  {/* Native App Icon display with Shield Badge */}
                  <AppIcon icon={item.icon} isShielded={true} t={t} />

                  <View style={s.appCopy}>
                    <View style={s.appTitleRow}>
                      <LocalizedText style={[s.appLabel, { color: t.textPrimary }]} numberOfLines={1}>
                        {item.appName}
                      </LocalizedText>
                      <View style={[s.shieldBadge, { backgroundColor: `${t.success}1E`, borderColor: `${t.success}55` }]}>
                        <ShieldCheck size={10} color={t.success} />
                        <Text style={[s.shieldBadgeText, { color: t.success }]}>SHIELDED</Text>
                      </View>
                    </View>
                    <LocalizedText style={[s.appPackage, { color: t.textMuted }]} numberOfLines={1}>
                      {item.packageName}
                    </LocalizedText>
                  </View>

                  <View style={s.appActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Pin 1x1 widget for ${item.appName}`}
                      onPress={() => handlePin1x1Widget(item.packageName, item.appName)}
                      style={({ pressed }) => [
                        s.widgetBtn,
                        { backgroundColor: `${t.success}20`, opacity: pressed ? 0.7 : 1 },
                      ]}>
                      <LayoutGrid size={13} color={t.success} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Test launch ${item.appName}`}
                      onPress={() => handleLaunchTest(item.packageName)}
                      style={({ pressed }) => [
                        s.testLaunchBtn,
                        { backgroundColor: `${t.accentCyan}20`, opacity: pressed ? 0.7 : 1 },
                      ]}>
                      <Play size={13} color={t.accentCyan} />
                    </Pressable>
                    <CyberToggle
                      accessibilityLabel={`Toggle shield for ${item.appName}`}
                      value={true}
                      onValueChange={() => handleTogglePackage(item.packageName)}
                    />
                  </View>
                </View>
              </Card>
            ))}

            {/* Bottom Add More Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add more protected apps"
              onPress={handleOpenPicker}
              style={({ pressed }) => [
                s.addMoreCard,
                {
                  borderColor: `${t.accentCyan}40`,
                  backgroundColor: `${t.accentCyan}0A`,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Plus size={16} color={t.accentCyan} />
              <LocalizedText style={[s.addMoreText, { color: t.accentCyan }]}>
                + Add More Protected Apps
              </LocalizedText>
            </Pressable>
          </View>
        )}

        {/* Section: How App Shield Works */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            HOW APP SHIELD WORKS UNDER THE HOOD
          </LocalizedText>
        </View>

        <View style={s.guideList}>
          {/* Card 1: Activity Detection */}
          <Card style={{ borderColor: `${t.accentCyan}30` }}>
            <View style={s.guideRow}>
              <IconContainer tone="cyan" size={42}>
                <Zap size={20} color={t.accentCyan} />
              </IconContainer>
              <View style={s.guideCopy}>
                <LocalizedText style={[s.guideTitle, { color: t.textPrimary }]}>
                  1. High-Speed Foreground Sniffer
                </LocalizedText>
                <LocalizedText style={[s.guideDesc, { color: t.textSecondary }]}>
                  Dev Mode monitors Android&apos;s local Usage Events API. When a protected package moves to the active foreground, detection triggers in under 100 milliseconds.
                </LocalizedText>
              </View>
            </View>
          </Card>

          {/* Card 2: Auto-Disable */}
          <Card style={{ borderColor: `${t.success}30` }}>
            <View style={s.guideRow}>
              <IconContainer tone="success" size={42}>
                <ShieldCheck size={20} color={t.success} />
              </IconContainer>
              <View style={s.guideCopy}>
                <LocalizedText style={[s.guideTitle, { color: t.textPrimary }]}>
                  2. Instant Auto-Disable & ADB Drop
                </LocalizedText>
                <LocalizedText style={[s.guideDesc, { color: t.textSecondary }]}>
                  Developer Options, USB Debugging, and Wireless Debugging are immediately set to OFF before banking anti-tamper or root detection engines execute.
                </LocalizedText>
              </View>
            </View>
          </Card>

          {/* Card 3: Auto-Restore */}
          <Card style={{ borderColor: `${t.accentCyan}30` }}>
            <View style={s.guideRow}>
              <IconContainer tone="cyan" size={42}>
                <RotateCcw size={20} color={t.accentCyan} />
              </IconContainer>
              <View style={s.guideCopy}>
                <LocalizedText style={[s.guideTitle, { color: t.textPrimary }]}>
                  3. Seamless State Restoration
                </LocalizedText>
                <LocalizedText style={[s.guideDesc, { color: t.textSecondary }]}>
                  When you press Home or switch back to your developer tools or coding environment, Dev Mode automatically re-enables your Developer Options back to normal.
                </LocalizedText>
              </View>
            </View>
          </Card>

          {/* Card 4: 100% Offline Privacy */}
          <Card style={{ borderColor: `${t.success}30` }}>
            <View style={s.guideRow}>
              <IconContainer tone="success" size={42}>
                <Lock size={20} color={t.success} />
              </IconContainer>
              <View style={s.guideCopy}>
                <LocalizedText style={[s.guideTitle, { color: t.textPrimary }]}>
                  4. 100% Offline Privacy Guarantee
                </LocalizedText>
                <LocalizedText style={[s.guideDesc, { color: t.textSecondary }]}>
                  Zero telemetry, zero cloud tracking, and zero data leaves your phone. All process monitoring runs strictly on-device using local system calls.
                </LocalizedText>
              </View>
            </View>
          </Card>
        </View>

        {/* Tip: OEM Battery Optimizations (Clickable -> redirects to Android Battery / App Info Settings) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open device battery settings for Dev Mode"
          onPress={handleOpenBatterySettings}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <Card
            style={{
              borderColor: `${t.accentCyan}55`,
              backgroundColor: t.canvasElevated,
              borderWidth: 1.5,
            }}>
            <View style={s.tipRow}>
              <IconContainer tone="cyan" size={40}>
                <BatteryCharging size={20} color={t.accentCyan} />
              </IconContainer>
              <View style={s.tipCopy}>
                <View style={s.clickableHeaderRow}>
                  <LocalizedText style={[s.tipTitle, { color: t.textPrimary }]}>
                    Pro-Tip: Set Battery to Unrestricted
                  </LocalizedText>
                  <ChevronRight size={17} color={t.accentCyan} />
                </View>
                <LocalizedText style={[s.tipDesc, { color: t.textSecondary }]}>
                  Required for Samsung, Xiaomi, Oppo &amp; Vivo devices. Tap here to open App Info &rarr; Select &ldquo;Battery&rdquo; &rarr; Choose &ldquo;Unrestricted&rdquo; to keep background monitoring alive.
                </LocalizedText>
                <View style={s.tipActionPill}>
                  <LocalizedText style={[s.tipActionText, { color: t.accentCyan }]}>
                    Tap to open Settings &rarr;
                  </LocalizedText>
                </View>
              </View>
            </View>
          </Card>
        </Pressable>

        {/* Tip: Shortcut / Launcher Permissions (Clickable -> redirects to Android App Info / Permissions) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open device app permissions for Dev Mode"
          onPress={handleOpenAppPermissions}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: space.sm }]}>
          <Card
            style={{
              borderColor: `${t.success}55`,
              backgroundColor: t.canvasElevated,
              borderWidth: 1.5,
            }}>
            <View style={s.tipRow}>
              <IconContainer tone="success" size={40}>
                <Smartphone size={20} color={t.success} />
              </IconContainer>
              <View style={s.tipCopy}>
                <View style={s.clickableHeaderRow}>
                  <LocalizedText style={[s.tipTitle, { color: t.textPrimary }]}>
                    Pro-Tip: Allow Home Screen Shortcuts
                  </LocalizedText>
                  <ChevronRight size={17} color={t.success} />
                </View>
                <LocalizedText style={[s.tipDesc, { color: t.textSecondary }]}>
                  Required for Xiaomi, Oppo, Vivo &amp; Realme devices. Tap here to open App Info &rarr; Select &ldquo;Other permissions&rdquo; &rarr; Turn ON &ldquo;Home screen shortcuts&rdquo; so shielded icons can pin automatically.
                </LocalizedText>
                <View style={s.tipActionPill}>
                  <LocalizedText style={[s.tipActionText, { color: t.success }]}>
                    Open App Permissions Settings &rarr;
                  </LocalizedText>
                </View>
              </View>
            </View>
          </Card>
        </Pressable>
      </ScrollView>

      {/* Modal: Select Apps to Shield */}
      <Modal
        visible={isPickerOpen}
        animationType="slide"
        onRequestClose={() => setIsPickerOpen(false)}
        statusBarTranslucent>
        <View style={[s.modalRoot, { backgroundColor: t.bg }]}>
          {/* Modal Header */}
          <View style={[s.modalHeader, { borderBottomColor: t.cardBorder, backgroundColor: t.canvasElevated }]}>
            <View style={s.modalTitleWrap}>
              <LocalizedText style={[s.modalTitle, { color: t.textPrimary }]}>
                Select Apps to Shield
              </LocalizedText>
              <LocalizedText style={[s.modalSubtitle, { color: t.textSecondary }]}>
                {protectedPackages.length} app{protectedPackages.length === 1 ? '' : 's'} shielded
              </LocalizedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done selecting apps"
              onPress={() => setIsPickerOpen(false)}
              style={({ pressed }) => [
                s.modalDoneBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Check size={14} color="#FFFFFF" />
              <LocalizedText style={s.modalDoneText}>Done</LocalizedText>
            </Pressable>
          </View>

          {/* Search bar inside Modal */}
          <View style={[s.searchBar, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder, marginHorizontal: space.lg, marginTop: space.md, marginBottom: space.xs }]}>
            <Search size={18} color={t.textMuted} />
            <TextInput
              placeholder="Search by app name or package..."
              placeholderTextColor={t.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[s.searchInput, { color: t.textPrimary }]}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={t.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Apps list in Modal */}
          {loadingApps ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={t.accentCyan} />
              <LocalizedText style={[s.loadingText, { color: t.textSecondary }]}>
                Extracting installed applications and native icons...
              </LocalizedText>
            </View>
          ) : (
            <FlatList
              data={pickerFilteredApps}
              keyExtractor={item => item.packageName}
              contentContainerStyle={s.modalList}
              initialNumToRender={20}
              maxToRenderPerBatch={25}
              windowSize={10}
              renderItem={({ item }) => {
                const isShielded = protectedPackages.includes(item.packageName);
                return (
                  <Card
                    style={{
                      borderColor: isShielded ? `${t.success}60` : `${t.accentCyan}20`,
                      backgroundColor: isShielded ? 'rgba(34, 197, 94, 0.05)' : t.canvas,
                      marginBottom: space.sm,
                    }}>
                    <View style={s.appRow}>
                      <AppIcon icon={item.icon} isShielded={isShielded} t={t} />

                      <View style={s.appCopy}>
                        <View style={s.appTitleRow}>
                          <LocalizedText style={[s.appLabel, { color: t.textPrimary }]} numberOfLines={1}>
                            {item.appName}
                          </LocalizedText>
                          {isShielded && (
                            <View style={[s.shieldBadge, { backgroundColor: `${t.success}1E`, borderColor: `${t.success}55` }]}>
                              <ShieldCheck size={10} color={t.success} />
                              <Text style={[s.shieldBadgeText, { color: t.success }]}>SHIELDED</Text>
                            </View>
                          )}
                        </View>
                        <LocalizedText style={[s.appPackage, { color: t.textMuted }]} numberOfLines={1}>
                          {item.packageName}
                        </LocalizedText>
                      </View>

                      <CyberToggle
                        accessibilityLabel={`Toggle shield for ${item.appName}`}
                        value={isShielded}
                        onValueChange={() => handleTogglePackage(item.packageName)}
                      />
                    </View>
                  </Card>
                );
              }}
              ListEmptyComponent={
                <View style={[s.emptyBox, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
                  <ShieldAlert size={36} color={t.textMuted} />
                  <LocalizedText style={[s.emptyTitle, { color: t.textPrimary }]}>
                    No Matching Applications
                  </LocalizedText>
                  <LocalizedText style={[s.emptyDesc, { color: t.textSecondary }]}>
                    Try searching for a different app name or package identifier.
                  </LocalizedText>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 110,
    gap: space.md,
  },
  header: {
    gap: 4,
    paddingBottom: space.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontFamily: fonts.heading,
    fontSize: 16.5,
  },
  switchDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  warningCopy: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  warningDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  secureBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  secureBulletText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  sectionHeader: {
    marginTop: space.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  headerAddBtnText: {
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: space.xs,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    marginVertical: space.md,
  },
  appsList: {
    gap: space.sm,
  },
  shieldTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 2,
  },
  shieldTipText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
  },
  dockBanner: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: space.xs,
  },
  dockBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dockBannerTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  dockBannerDesc: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 15,
  },
  pinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pinPillText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  addMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 2,
  },
  addMoreText: {
    fontFamily: fonts.heading,
    fontSize: 13.5,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  appIconWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  appIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    width: 44,
    height: 44,
  },
  appIconFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShieldBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  shieldBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  appCopy: {
    flex: 1,
    gap: 2,
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appLabel: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
    flexShrink: 1,
  },
  appPackage: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  appActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testLaunchBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideList: {
    gap: space.sm,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  guideCopy: {
    flex: 1,
    gap: 4,
  },
  guideTitle: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
  },
  guideDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  tipCopy: {
    flex: 1,
    gap: 2,
  },
  clickableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  tipDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  tipActionPill: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipActionText: {
    fontFamily: fonts.monoBold,
    fontSize: 11.5,
    letterSpacing: 0.5,
  },
  // Modal styles
  modalRoot: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
  },
  modalTitleWrap: {
    gap: 2,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  modalSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  modalDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  modalDoneText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: '#FFFFFF',
  },
  modalList: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    padding: 0,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
