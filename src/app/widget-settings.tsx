import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Maximize2 from 'lucide-react-native/icons/maximize-2';
import Plus from 'lucide-react-native/icons/plus';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sparkles from 'lucide-react-native/icons/sparkles';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';

import LocalizedText from '@/components/LocalizedText';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, Card, IconContainer, Overline, Pill } from '@/components/ui';
import DevToggle, { type InstalledApp } from '@/modules/dev-toggle-native';
import { fonts, radius, space, useTheme } from '@/theme';

type WidgetStyle = '1x1' | '3x1' | 'dev';

function WidgetAppIcon({
  icon,
  size = 36,
  fallbackColor,
}: {
  icon?: string;
  size?: number;
  fallbackColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (icon && !failed) {
    return (
      <Image
        source={{ uri: icon.startsWith('data:') ? icon : `data:image/png;base64,${icon}` }}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
        onError={() => setFailed(true)}
        resizeMode="contain"
      />
    );
  }
  return <Smartphone size={Math.round(size * 0.6)} color={fallbackColor || '#4ADE80'} />;
}

export default function WidgetSettings() {
  const t = useTheme();
  const [selectedStyle, setSelectedStyle] = useState<WidgetStyle>('1x1');
  const [showPromoModal, setShowPromoModal] = useState(false);

  // App Shield data
  const [protectedPackages, setProtectedPackages] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      DevToggle.getAppShieldSettings?.() ?? { enabled: false, hasUsageAccess: false, protectedPackages: [] },
      DevToggle.getInstalledApps?.() ?? [],
    ])
      .then(([settings, apps]) => {
        if (!isMounted) return;
        setProtectedPackages(settings.protectedPackages || []);
        setInstalledApps(apps || []);
        if (settings.protectedPackages && settings.protectedPackages.length > 0) {
          setSelectedPackage(settings.protectedPackages[0]);
        } else if (apps.length > 0) {
          setSelectedPackage(apps[0].packageName);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingApps(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Shielded apps list with app details
  const shieldedApps = useMemo(() => {
    const map = new Map(installedApps.map(a => [a.packageName, a]));
    return protectedPackages
      .map(pkg => map.get(pkg))
      .filter((a): a is InstalledApp => Boolean(a));
  }, [installedApps, protectedPackages]);

  // Active selected app for 1x1 widget
  const activeSelectedApp = useMemo(() => {
    if (!selectedPackage) return shieldedApps[0] || installedApps[0] || null;
    return installedApps.find(a => a.packageName === selectedPackage) || null;
  }, [selectedPackage, shieldedApps, installedApps]);

  const handlePin1x1Widget = async () => {
    if (!activeSelectedApp?.packageName) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Please select an app first', ToastAndroid.SHORT);
      }
      return;
    }
    try {
      const res = await DevToggle.pinShieldWidget1x1?.(activeSelectedApp.packageName);
      if (res) {
        if (Platform.OS === 'android') {
          ToastAndroid.show(`1x1 ${activeSelectedApp.appName} Widget sent to home screen!`, ToastAndroid.SHORT);
        }
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Add 1x1 Widget from your launcher widget drawer', ToastAndroid.LONG);
        }
      }
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Add 1x1 Widget from your launcher widget drawer', ToastAndroid.LONG);
      }
    }
  };

  const handlePin3x1ShieldDock = async () => {
    try {
      const res = await DevToggle.pinShieldWidget3x1?.();
      if (res) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('3x1 Shield Dock sent to home screen!', ToastAndroid.SHORT);
        }
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Add 3x1 Shield Dock from your launcher widget drawer', ToastAndroid.LONG);
        }
      }
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Add 3x1 Shield Dock from your launcher widget drawer', ToastAndroid.LONG);
      }
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>LAUNCHER EXTENSIONS</Overline>
            <LocalizedText style={[s.title, { color: t.textPrimary }]}>Home Screen Widgets</LocalizedText>
            <LocalizedText style={[s.subtitle, { color: t.textSecondary }]}>
              Control Developer Options or launch protected apps with automatic off toggles right from your Android desktop.
            </LocalizedText>
          </View>

          {/* Widget Style Selector Pills */}
          <View style={s.sectionHeader}>
            <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>SELECT WIDGET STYLE</LocalizedText>
          </View>

          <View style={s.styleTabsContainer}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedStyle === '1x1' }}
              onPress={() => setSelectedStyle('1x1')}
              style={[
                s.styleTab,
                selectedStyle === '1x1'
                  ? { backgroundColor: 'rgba(34, 197, 94, 0.16)', borderColor: '#22C55E' }
                  : { backgroundColor: t.canvasElevated, borderColor: t.borderSubtle },
              ]}>
              <Smartphone size={16} color={selectedStyle === '1x1' ? '#4ADE80' : t.textMuted} />
              <LocalizedText
                style={[
                  s.styleTabText,
                  { color: selectedStyle === '1x1' ? '#4ADE80' : t.textSecondary },
                ]}>
                1x1 Quick Launch
              </LocalizedText>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedStyle === '3x1' }}
              onPress={() => setSelectedStyle('3x1')}
              style={[
                s.styleTab,
                selectedStyle === '3x1'
                  ? { backgroundColor: 'rgba(34, 197, 94, 0.16)', borderColor: '#22C55E' }
                  : { backgroundColor: t.canvasElevated, borderColor: t.borderSubtle },
              ]}>
              <LayoutGrid size={16} color={selectedStyle === '3x1' ? '#4ADE80' : t.textMuted} />
              <LocalizedText
                style={[
                  s.styleTabText,
                  { color: selectedStyle === '3x1' ? '#4ADE80' : t.textSecondary },
                ]}>
                3x1 Shield Dock
              </LocalizedText>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedStyle === 'dev' }}
              onPress={() => setSelectedStyle('dev')}
              style={[
                s.styleTab,
                selectedStyle === 'dev'
                  ? { backgroundColor: 'rgba(56, 189, 248, 0.16)', borderColor: '#38BDF8' }
                  : { backgroundColor: t.canvasElevated, borderColor: t.borderSubtle },
              ]}>
              <SlidersHorizontal size={16} color={selectedStyle === 'dev' ? '#38BDF8' : t.textMuted} />
              <LocalizedText
                style={[
                  s.styleTabText,
                  { color: selectedStyle === 'dev' ? '#38BDF8' : t.textSecondary },
                ]}>
                Dev Toggles
              </LocalizedText>
            </Pressable>
          </View>

          {/* ACTIVE STYLE CARD */}
          {selectedStyle === '1x1' && (
            <Card
              style={{
                borderColor: `${t.success}60`,
                backgroundColor: '#06150E',
                borderWidth: 1.5,
              }}>
              <View style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
                    <IconContainer tone="success" size={40}>
                      <ShieldCheck size={20} color={t.success} />
                    </IconContainer>
                    <View style={{ flex: 1 }}>
                      <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>
                        1x1 Single App Widget
                      </LocalizedText>
                      <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>
                        Instant Auto-Off &amp; direct app launch
                      </LocalizedText>
                    </View>
                  </View>
                  <Pill label="1x1 STYLE" tone="success" />
                </View>

                {/* App Selector */}
                <View style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <LocalizedText style={[s.inputLabel, { color: t.textSecondary }]}>
                      SELECT SHIELDED APP:
                    </LocalizedText>
                    <Pressable onPress={() => router.push('/app-shield')} hitSlop={8}>
                      <LocalizedText style={[s.linkText, { color: t.accentCyan }]}>
                        Manage Apps &rarr;
                      </LocalizedText>
                    </Pressable>
                  </View>

                  {loadingApps ? (
                    <ActivityIndicator size="small" color={t.success} style={{ paddingVertical: space.md }} />
                  ) : shieldedApps.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.appChipsScroll}>
                      {shieldedApps.map(app => {
                        const isSelected = activeSelectedApp?.packageName === app.packageName;
                        return (
                          <Pressable
                            key={app.packageName}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${app.appName}`}
                            onPress={() => setSelectedPackage(app.packageName)}
                            style={[
                              s.appChip,
                              isSelected
                                ? { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: '#4ADE80' }
                                : { backgroundColor: '#091C12', borderColor: 'rgba(34, 197, 94, 0.2)' },
                            ]}>
                            <WidgetAppIcon icon={app.icon} size={28} />
                            <LocalizedText
                              style={[
                                s.appChipText,
                                { color: isSelected ? '#FFFFFF' : t.textSecondary },
                              ]}
                              numberOfLines={1}>
                              {app.appName}
                            </LocalizedText>
                            {isSelected && (
                              <View style={s.appChipCheck}>
                                <Check size={10} color="#050D0A" />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={s.emptyNoticeBox}>
                      <LocalizedText style={[s.emptyNoticeText, { color: t.textSecondary }]}>
                        No apps protected in App Shield yet. Select an app or configure your shield list first.
                      </LocalizedText>
                      <Button
                        label="Configure Protected Apps"
                        variant="secondary"
                        icon={<ChevronRight size={14} color={t.accentCyan} />}
                        onPress={() => router.push('/app-shield')}
                        style={{ marginTop: space.xs }}
                      />
                    </View>
                  )}
                </View>

                {/* 1x1 Widget Live Preview */}
                <View style={s.previewContainer}>
                  <LocalizedText style={[s.previewLabel, { color: t.textMuted }]}>
                    LIVE WIDGET PREVIEW (1x1)
                  </LocalizedText>
                  <View style={s.widget1x1MockupBox}>
                    <View style={s.widget1x1Tile}>
                      <View style={s.widget1x1IconRow}>
                        <WidgetAppIcon
                          icon={activeSelectedApp?.icon}
                          size={46}
                          fallbackColor="#4ADE80"
                        />
                        <View style={s.widget1x1Badge}>
                          <Zap size={11} color="#050D0A" />
                        </View>
                      </View>
                      <LocalizedText style={s.widget1x1AppName} numberOfLines={1}>
                        {activeSelectedApp?.appName || 'GCash'}
                      </LocalizedText>
                      <View style={s.widget1x1AutoOffPill}>
                        <LocalizedText style={s.widget1x1AutoOffText}>AUTO-OFF</LocalizedText>
                      </View>
                    </View>
                    <View style={s.previewInfoCopy}>
                      <View style={s.previewBullet}>
                        <Sparkles size={13} color="#4ADE80" />
                        <LocalizedText style={[s.previewBulletText, { color: t.textSecondary }]}>
                          Turns OFF Developer Options instantly
                        </LocalizedText>
                      </View>
                      <View style={s.previewBullet}>
                        <Zap size={13} color="#4ADE80" />
                        <LocalizedText style={[s.previewBulletText, { color: t.textSecondary }]}>
                          Launches {activeSelectedApp?.appName || 'App'} without banking warnings
                        </LocalizedText>
                      </View>
                      <View style={s.previewBullet}>
                        <ShieldCheck size={13} color="#4ADE80" />
                        <LocalizedText style={[s.previewBulletText, { color: t.textSecondary }]}>
                          Auto-restores settings when you return
                        </LocalizedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Pin Button */}
                <Button
                  label={`Pin 1x1 ${activeSelectedApp?.appName || 'App'} Widget to Home`}
                  variant="primary"
                  icon={<Plus size={16} color="#FFFFFF" />}
                  onPress={handlePin1x1Widget}
                />
              </View>
            </Card>
          )}

          {selectedStyle === '3x1' && (
            <Card
              style={{
                borderColor: `${t.success}60`,
                backgroundColor: '#06150E',
                borderWidth: 1.5,
              }}>
              <View style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
                    <IconContainer tone="success" size={40}>
                      <LayoutGrid size={20} color={t.success} />
                    </IconContainer>
                    <View style={{ flex: 1 }}>
                      <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>
                        3x1 Multi-App Shield Dock
                      </LocalizedText>
                      <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>
                        Horizontal 3-app launcher dock
                      </LocalizedText>
                    </View>
                  </View>
                  <Pill label="3x1 DOCK" tone="success" />
                </View>

                {/* 3x1 Live Preview */}
                <View style={s.previewContainer}>
                  <LocalizedText style={[s.previewLabel, { color: t.textMuted }]}>
                    LIVE WIDGET PREVIEW (3x1)
                  </LocalizedText>

                  <View style={s.dockWidgetMockup}>
                    {/* Header Strip inside Dock */}
                    <View style={s.dockHeaderStrip}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <ShieldCheck size={13} color="#4ADE80" />
                        <LocalizedText style={s.dockHeaderTitle}>SHIELD DOCK</LocalizedText>
                      </View>
                      <View style={s.dockStatusPill}>
                        <LocalizedText style={s.dockStatusText}>⚡ AUTO-OFF ARMED</LocalizedText>
                      </View>
                    </View>

                    {/* 3 Slots */}
                    <View style={s.dockSlotsRow}>
                      {[0, 1, 2].map(idx => {
                        const app = shieldedApps[idx];
                        return (
                          <View key={idx} style={s.dockSlot}>
                            {app ? (
                              <>
                                <WidgetAppIcon icon={app.icon} size={32} />
                                <LocalizedText style={s.dockSlotName} numberOfLines={1}>
                                  {app.appName}
                                </LocalizedText>
                              </>
                            ) : (
                              <Pressable
                                onPress={() => router.push('/app-shield')}
                                style={s.dockSlotEmpty}>
                                <Plus size={18} color="rgba(74, 222, 128, 0.5)" />
                                <LocalizedText style={s.dockSlotEmptyText}>Add</LocalizedText>
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={s.dockHighlights}>
                    <LocalizedText style={[s.dockHighlightText, { color: t.textSecondary }]}>
                      • Houses up to 3 shielded apps in a single row on your launcher.
                    </LocalizedText>
                    <LocalizedText style={[s.dockHighlightText, { color: t.textSecondary }]}>
                      • Tapping any slot automatically shuts off Developer Options &amp; ADB.
                    </LocalizedText>
                    <LocalizedText style={[s.dockHighlightText, { color: t.textSecondary }]}>
                      • Seamlessly switches back on when you return home or switch apps.
                    </LocalizedText>
                  </View>
                </View>

                {/* Pin Button */}
                <Button
                  label="Pin 3x1 Shield Dock to Home Screen"
                  variant="primary"
                  icon={<Plus size={16} color="#FFFFFF" />}
                  onPress={handlePin3x1ShieldDock}
                />
              </View>
            </Card>
          )}

          {selectedStyle === 'dev' && (
            <Card
              style={{
                borderColor: `${t.accentCyan}55`,
                backgroundColor: '#061318',
                borderWidth: 1.5,
              }}>
              <View style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
                    <IconContainer tone="cyan" size={40}>
                      <SlidersHorizontal size={20} color={t.accentCyan} />
                    </IconContainer>
                    <View style={{ flex: 1 }}>
                      <LocalizedText style={[s.cardTitle, { color: t.textPrimary }]}>
                        Developer Mode Quick Toggles
                      </LocalizedText>
                      <LocalizedText style={[s.cardDesc, { color: t.textSecondary }]}>
                        Toggle Dev Settings right from your desktop
                      </LocalizedText>
                    </View>
                  </View>
                  <Pill label="TOGGLES" tone="cyan" />
                </View>

                {/* 3x1 Multi-Toggle Preview */}
                <View style={s.previewContainer}>
                  <LocalizedText style={[s.previewLabel, { color: t.textMuted }]}>
                    3x1 MULTI-TOGGLE WIDGET
                  </LocalizedText>
                  <View style={s.previewWidgetRow}>
                    <View style={s.previewWidgetBtn}>
                      <LocalizedText style={s.previewWidgetBtnText}>DEV OPTIONS</LocalizedText>
                      <LocalizedText style={s.previewWidgetBtnStatus}>ON</LocalizedText>
                    </View>
                    <View style={s.previewWidgetBtn}>
                      <LocalizedText style={s.previewWidgetBtnText}>USB DEBUG</LocalizedText>
                      <LocalizedText style={s.previewWidgetBtnStatus}>ON</LocalizedText>
                    </View>
                    <View style={[s.previewWidgetBtn, { backgroundColor: '#1E293B', borderColor: '#475569' }]}>
                      <LocalizedText style={s.previewWidgetBtnText}>WIRELESS ADB</LocalizedText>
                      <LocalizedText style={[s.previewWidgetBtnStatus, { color: '#94A3B8' }]}>OFF</LocalizedText>
                    </View>
                  </View>
                </View>

                {/* 1x1 Single Widgets Preview */}
                <View style={s.previewContainer}>
                  <LocalizedText style={[s.previewLabel, { color: t.textMuted }]}>
                    1x1 SINGLE TOGGLE BUTTONS
                  </LocalizedText>
                  <View style={s.singleGrid}>
                    <View style={s.singleCard}>
                      <LocalizedText style={[s.singleCardText, { color: '#4ADE80' }]}>DEV MODE</LocalizedText>
                      <Pill label="1x1" tone="success" />
                    </View>
                    <View style={s.singleCard}>
                      <LocalizedText style={[s.singleCardText, { color: '#4ADE80' }]}>USB DEBUG</LocalizedText>
                      <Pill label="1x1" tone="success" />
                    </View>
                    <View style={s.singleCard}>
                      <LocalizedText style={[s.singleCardText, { color: '#38BDF8' }]}>WIRELESS</LocalizedText>
                      <Pill label="1x1" tone="cyan" />
                    </View>
                  </View>
                </View>

                <View style={s.infoTip}>
                  <LocalizedText style={[s.infoTipText, { color: t.textSecondary }]}>
                    To add Developer Quick Toggles, long press an empty area on your home screen &rarr; tap &ldquo;Widgets&rdquo; &rarr; scroll to &ldquo;Dev Mode&rdquo; &rarr; drag to screen.
                  </LocalizedText>
                </View>
              </View>
            </Card>
          )}

          {/* In-App Widget Promotion Banner (Clickable) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand Widget Preview"
            onPress={() => setShowPromoModal(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <Card
              style={{
                borderColor: `${t.success}60`,
                backgroundColor: '#071610',
                padding: 0,
                overflow: 'hidden',
                borderWidth: 1.5,
              }}>
              <View style={s.promoImageWrapper}>
                <Image
                  source={require('@/assets/images/promotion/in_app_widget_promotion.png')}
                  style={s.promoBannerImage}
                  resizeMode="cover"
                />
                <View style={s.promoBadgeOverlay}>
                  <Maximize2 size={12} color="#4ADE80" />
                  <LocalizedText style={s.promoBadgeText}>TAP TO EXPAND</LocalizedText>
                </View>
              </View>
              <View style={s.promoDetailsBar}>
                <View style={{ flex: 1, gap: 2 }}>
                  <LocalizedText style={[s.promoTitle, { color: t.textPrimary }]}>Launcher Desktop Experience</LocalizedText>
                  <LocalizedText style={[s.promoDesc, { color: t.textSecondary }]}>
                    Interactive cybernetic widgets directly on your home screen. Tap banner to expand.
                  </LocalizedText>
                </View>
                <Pill label="PREVIEW" tone="success" />
              </View>
            </Card>
          </Pressable>

          {/* Setup Guide */}
          <View style={s.sectionHeader}>
            <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>HOW TO ADD WIDGETS MANUALLY</LocalizedText>
          </View>

          <Card>
            <View style={{ gap: space.md }}>
              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <LocalizedText style={s.stepNumText}>1</LocalizedText>
                </View>
                <LocalizedText style={[s.stepText, { color: t.textPrimary }]}>
                  Long press on an empty space on your Android home screen.
                </LocalizedText>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <LocalizedText style={s.stepNumText}>2</LocalizedText>
                </View>
                <LocalizedText style={[s.stepText, { color: t.textPrimary }]}>
                  Tap <LocalizedText style={{ fontFamily: fonts.heading, color: t.accentCyan }}>Widgets</LocalizedText> in the launcher popup menu.
                </LocalizedText>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <LocalizedText style={s.stepNumText}>3</LocalizedText>
                </View>
                <LocalizedText style={[s.stepText, { color: t.textPrimary }]}>
                  Scroll to <LocalizedText style={{ fontFamily: fonts.heading, color: t.accentCyan }}>Dev Mode</LocalizedText> in the widgets list.
                </LocalizedText>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <LocalizedText style={s.stepNumText}>4</LocalizedText>
                </View>
                <LocalizedText style={[s.stepText, { color: t.textPrimary }]}>
                  Drag and drop your chosen 1x1 or 3x1 widget to your desktop.
                </LocalizedText>
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Fullscreen Promotion Image Modal */}
        <Modal
          visible={showPromoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPromoModal(false)}>
          <View style={s.modalBackdrop}>
            <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
              <View style={s.modalHeader}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Overline>PROMOTION PREVIEW</Overline>
                  <LocalizedText style={[s.modalTitle, { color: '#FFFFFF' }]}>Home Screen Widgets</LocalizedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close Preview"
                  onPress={() => setShowPromoModal(false)}
                  style={s.modalCloseBtn}>
                  <X size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={s.modalImageContainer}>
                <Image
                  source={require('@/assets/images/promotion/in_app_widget_promotion.png')}
                  style={s.modalImage}
                  resizeMode="contain"
                />
              </View>

              <View style={s.modalFooter}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowPromoModal(false)}
                  style={s.modalDismissBtn}>
                  <LocalizedText style={s.modalDismissBtnText}>CLOSE PREVIEW</LocalizedText>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 40,
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
  styleTabsContainer: {
    flexDirection: 'row',
    gap: space.xs,
    width: '100%',
  },
  styleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  styleTabText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 15.5,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1,
  },
  linkText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
  },
  appChipsScroll: {
    gap: space.xs,
    paddingVertical: 4,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  appChipText: {
    fontFamily: fonts.heading,
    fontSize: 12.5,
    maxWidth: 110,
  },
  appChipCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNoticeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  emptyNoticeText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
  },
  previewContainer: {
    backgroundColor: '#040C07',
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    gap: space.sm,
  },
  previewLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  widget1x1MockupBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  widget1x1Tile: {
    width: 90,
    height: 94,
    backgroundColor: '#0A1E14',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  widget1x1IconRow: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widget1x1Badge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widget1x1AppName: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  widget1x1AutoOffPill: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  widget1x1AutoOffText: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  previewInfoCopy: {
    flex: 1,
    gap: 6,
  },
  previewBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBulletText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  dockWidgetMockup: {
    backgroundColor: '#05120B',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    padding: space.sm,
    gap: space.xs,
  },
  dockHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 222, 128, 0.15)',
  },
  dockHeaderTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#4ADE80',
    letterSpacing: 1,
  },
  dockStatusPill: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dockStatusText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  dockSlotsRow: {
    flexDirection: 'row',
    gap: space.xs,
    paddingTop: 4,
  },
  dockSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: radius.sm,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  dockSlotName: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  dockSlotEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  dockSlotEmptyText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(74, 222, 128, 0.5)',
  },
  dockHighlights: {
    gap: 4,
    marginTop: 4,
  },
  dockHighlightText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
  },
  previewWidgetRow: {
    flexDirection: 'row',
    backgroundColor: '#08140F',
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 4,
  },
  previewWidgetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 6,
    gap: 2,
  },
  previewWidgetBtnText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  previewWidgetBtnStatus: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  singleGrid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  singleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: radius.md,
    paddingVertical: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  singleCardText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    textAlign: 'center',
  },
  infoTip: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  infoTipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  promoImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: '#040C08',
  },
  promoBannerImage: {
    width: '100%',
    height: '100%',
  },
  promoBadgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  promoBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  promoDetailsBar: {
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  promoTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  promoDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#4ADE80',
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'space-between',
    paddingVertical: space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space.md,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    gap: space.sm,
    paddingTop: space.md,
  },
  modalDismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: '#15803D',
  },
  modalDismissBtnText: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
