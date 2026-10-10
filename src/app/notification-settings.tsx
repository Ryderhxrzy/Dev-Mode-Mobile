import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Maximize2,
  X,
} from 'lucide-react-native';
import DevToggle, {
  type NotificationMode,
} from '@/modules/dev-toggle-native';
import { Card, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function NotificationSettings() {
  const t = useTheme();
  const [notifMode, setNotifMode] = useState<NotificationMode>('disabled');
  const [updating, setUpdating] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const nm = await DevToggle.getNotificationMode();
      setNotifMode(nm);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    DevToggle.getNotificationMode().then(nm => {
      if (active) {
        setNotifMode(nm);
      }
    }).catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadData();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [loadData]);

  const handleSelectMode = async (mode: NotificationMode) => {
    if (updating || notifMode === mode) return;
    setUpdating(true);
    try {
      if (mode !== 'disabled') {
        const hasPerm = await DevToggle.hasNotificationPermission();
        if (!hasPerm) {
          await DevToggle.requestNotificationPermission();
        }
      }
      const res = await DevToggle.setNotificationMode(mode);
      setNotifMode(res.mode);
      if (Platform.OS === 'android') {
        const modeLabels: Record<NotificationMode, string> = {
          always: 'Persistent Notification Enabled (Always On)',
          when_dev_active: 'Dynamic Notification Enabled (Active while Dev Mode ON)',
          disabled: 'Notification Disabled',
        };
        ToastAndroid.show(modeLabels[mode], ToastAndroid.SHORT);
      }
    } catch (err: any) {
      Alert.alert('Notification Error', err?.message || 'Could not update notification mode.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>STATUS BAR NOTIFICATION</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Quick Controls Notification</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Keep developer tools accessible directly from your Android status bar and lock screen with custom cybernetic toggle chips.
            </Text>
          </View>

          {/* In-App Push Notification Promotion Banner (Clickable) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand Push Notification Preview"
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
                  source={require('@/assets/images/promotion/in_app_push_notif_promotion.png')}
                  style={s.promoBannerImage}
                  resizeMode="cover"
                />
                <View style={s.promoBadgeOverlay}>
                  <Maximize2 size={12} color="#4ADE80" />
                  <Text style={s.promoBadgeText}>TAP TO EXPAND</Text>
                </View>
              </View>
              <View style={s.promoDetailsBar}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.promoTitle, { color: t.textPrimary }]}>Live Status Bar Notification</Text>
                  <Text style={[s.promoDesc, { color: t.textSecondary }]}>
                    Interactive toggle notification shade. Tap banner to view full preview.
                  </Text>
                </View>
                <Pill label="PREVIEW" tone="success" />
              </View>
            </Card>
          </Pressable>

          {/* Mode Selection */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>NOTIFICATION DISPLAY MODE</Text>
          </View>

          <View style={s.list}>
            {/* 1. Always Persistent */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Always Persistent Notification"
              onPress={() => handleSelectMode('always')}>
              <Card
                style={{
                  borderColor: notifMode === 'always' ? t.success : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'always' ? `${t.success}15` : t.canvas,
                  borderWidth: notifMode === 'always' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="success" size={44}>
                    <BellRing size={22} color={t.success} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Always Persistent</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Pins an ongoing notification with 1-tap toggles that remains in the status bar at all times.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'always' ? 'ACTIVE' : 'SELECT'}
                    tone={notifMode === 'always' ? 'success' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>

            {/* 2. Active While Dev Mode ON */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Active While Dev Mode ON"
              onPress={() => handleSelectMode('when_dev_active')}>
              <Card
                style={{
                  borderColor: notifMode === 'when_dev_active' ? t.accentCyan : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'when_dev_active' ? `${t.accentCyan}15` : t.canvas,
                  borderWidth: notifMode === 'when_dev_active' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="cyan" size={44}>
                    <Bell size={22} color={t.accentCyan} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Active While Dev Mode ON</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Automatically appears when Developer Options is ON, and disappears immediately when turned OFF.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'when_dev_active' ? 'ACTIVE' : 'SELECT'}
                    tone={notifMode === 'when_dev_active' ? 'cyan' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>

            {/* 3. Turn Off Notification */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn Off Notifications"
              onPress={() => handleSelectMode('disabled')}>
              <Card
                style={{
                  borderColor: notifMode === 'disabled' ? `${t.danger}80` : `${t.accentCyan}30`,
                  backgroundColor: notifMode === 'disabled' ? `${t.danger}12` : t.canvas,
                  borderWidth: notifMode === 'disabled' ? 1.5 : 1,
                }}>
                <View style={s.row}>
                  <IconContainer tone="warning" size={44}>
                    <BellOff size={22} color={t.warning} />
                  </IconContainer>
                  <View style={s.rowCopy}>
                    <Text style={[s.rowTitle, { color: t.textPrimary }]}>Turn Off Notifications</Text>
                    <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                      Completely removes the background status bar notification and quick controls.
                    </Text>
                  </View>
                  <Pill
                    label={notifMode === 'disabled' ? 'OFF' : 'SELECT'}
                    tone={notifMode === 'disabled' ? 'warning' : 'neutral'}
                  />
                </View>
              </Card>
            </Pressable>
          </View>

          {updating && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={t.accentCyan} size="small" />
              <Text style={[s.loadingText, { color: t.accentCyan }]}>Updating notification mode...</Text>
            </View>
          )}
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
                  <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Status Bar Quick Controls</Text>
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
                  source={require('@/assets/images/promotion/in_app_push_notif_promotion.png')}
                  style={s.modalImage}
                  resizeMode="contain"
                />
              </View>

              <View style={s.modalFooter}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setShowPromoModal(false);
                    if (notifMode === 'disabled') {
                      void handleSelectMode('always');
                    }
                  }}
                  style={[s.modalActionBtn, { backgroundColor: '#15803D' }]}>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={s.modalActionBtnText}>
                    {notifMode === 'disabled' ? 'ENABLE PERSISTENT NOTIFICATION' : 'NOTIFICATION IS ACTIVE'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowPromoModal(false)}
                  style={s.modalDismissBtn}>
                  <Text style={s.modalDismissBtnText}>CLOSE PREVIEW</Text>
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
  promoImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2,
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
  sectionHeader: { marginTop: space.xs },
  sectionTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  list: { gap: space.md, width: '100%' },
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewHeaderTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  previewSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 10,
  },
  previewChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  previewChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.2,
    gap: 2,
  },
  previewChipLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  previewChipStatus: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewFooterText: {
    fontFamily: fonts.mono,
    fontSize: 11,
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
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  modalActionBtnText: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalDismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modalDismissBtnText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: '#A3A3A3',
  },
});

