import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Maximize2 from 'lucide-react-native/icons/maximize-2';
import X from 'lucide-react-native/icons/x';
import { Card, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function WidgetSettings() {
  const t = useTheme();
  const [showPromoModal, setShowPromoModal] = useState(false);

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>LAUNCHER EXTENSIONS</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Home Screen Widgets</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Control Developer Options, USB Debugging, and Wireless ADB directly from your Android desktop launcher.
            </Text>
          </View>

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
                  <Text style={s.promoBadgeText}>TAP TO EXPAND</Text>
                </View>
              </View>
              <View style={s.promoDetailsBar}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.promoTitle, { color: t.textPrimary }]}>Launcher Desktop Experience</Text>
                  <Text style={[s.promoDesc, { color: t.textSecondary }]}>
                    Interactive cybernetic widgets directly on your home screen. Tap banner to expand.
                  </Text>
                </View>
                <Pill label="PREVIEW" tone="success" />
              </View>
            </Card>
          </Pressable>

          {/* Setup Guide */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>HOW TO ADD WIDGETS</Text>
          </View>

          <Card>
            <View style={{ gap: space.md }}>
              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>1</Text>
                </View>
                <Text style={[s.stepText, { color: t.textPrimary }]}>
                  Long press on an empty space on your Android home screen.
                </Text>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>2</Text>
                </View>
                <Text style={[s.stepText, { color: t.textPrimary }]}>
                  Tap <Text style={{ fontFamily: fonts.heading, color: t.accentCyan }}>Widgets</Text> in the launcher popup menu.
                </Text>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>3</Text>
                </View>
                <Text style={[s.stepText, { color: t.textPrimary }]}>
                  Scroll to <Text style={{ fontFamily: fonts.heading, color: t.accentCyan }}>Dev Mode</Text> in the widgets list.
                </Text>
              </View>

              <View style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>4</Text>
                </View>
                <Text style={[s.stepText, { color: t.textPrimary }]}>
                  Drag and drop the 3x1 multi-bar or 1x1 button to your screen.
                </Text>
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
                  <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Home Screen Widgets</Text>
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
    gap: 4,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
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
  widgetPreviewBox: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: space.xs,
  },
  widgetPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  widgetPreviewTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  previewWidgetRow: {
    flexDirection: 'row',
    backgroundColor: '#08140F',
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 4,
  },
  previewWidgetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#4ADE80',
    paddingVertical: 6,
    gap: 2,
  },
  previewWidgetBtnText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
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
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  singleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderRadius: radius.md,
    paddingVertical: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  singleCardText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    textAlign: 'center',
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

