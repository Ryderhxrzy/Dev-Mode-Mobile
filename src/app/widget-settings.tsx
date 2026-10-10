import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Layers,
  LayoutGrid,
  Sparkles,
  Cpu,
  Usb,
  Wifi,
} from 'lucide-react-native';
import { Card, IconContainer, Overline, Pill } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function WidgetSettings() {
  const t = useTheme();

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

          {/* Section: Widget Options */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textMuted }]}>AVAILABLE WIDGET FORMATS</Text>
          </View>

          {/* 3x1 Multi-Toggle Widget */}
          <Card style={{ borderColor: `${t.success}60`, backgroundColor: t.canvasElevated }}>
            <View style={s.row}>
              <IconContainer tone="success" size={44}>
                <Layers size={22} color={t.success} />
              </IconContainer>
              <View style={s.rowCopy}>
                <View style={s.badgeTitleRow}>
                  <Text style={[s.rowTitle, { color: t.textPrimary }]}>3x1 Multi-Control Bar</Text>
                  <Pill label="MULTI 3x1" tone="success" />
                </View>
                <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                  All-in-one horizontal widget with Developer Options, USB ADB, and Wireless Debugging with live IP:Port display.
                </Text>
              </View>
            </View>

            {/* Widget Preview Mockup */}
            <View style={s.widgetPreviewBox}>
              <View style={s.widgetPreviewHeader}>
                <Sparkles size={13} color={t.success} />
                <Text style={[s.widgetPreviewTitle, { color: t.textMuted }]}>3x1 WIDGET PREVIEW</Text>
              </View>
              <View style={s.previewWidgetRow}>
                <View style={s.previewWidgetBtn}>
                  <Cpu size={16} color="#4ADE80" />
                  <Text style={s.previewWidgetBtnText}>DEV MODE</Text>
                  <Text style={s.previewWidgetBtnStatus}>ON</Text>
                </View>
                <View style={s.previewWidgetBtn}>
                  <Usb size={16} color="#4ADE80" />
                  <Text style={s.previewWidgetBtnText}>USB ADB</Text>
                  <Text style={s.previewWidgetBtnStatus}>ON</Text>
                </View>
                <View style={s.previewWidgetBtn}>
                  <Wifi size={16} color="#4ADE80" />
                  <Text style={s.previewWidgetBtnText}>WIRELESS</Text>
                  <Text style={s.previewWidgetBtnStatus}>:40083</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* 1x1 Individual Widgets */}
          <Card>
            <View style={s.row}>
              <IconContainer tone="cyan" size={44}>
                <LayoutGrid size={22} color={t.accentCyan} />
              </IconContainer>
              <View style={s.rowCopy}>
                <View style={s.badgeTitleRow}>
                  <Text style={[s.rowTitle, { color: t.textPrimary }]}>1x1 Single Buttons</Text>
                  <Pill label="3 VARIANTS" tone="cyan" />
                </View>
                <Text style={[s.rowDesc, { color: t.textSecondary }]}>
                  Place individual square widgets for Dev Mode, USB ADB, or Wireless ADB anywhere on your home screen grid.
                </Text>
              </View>
            </View>

            <View style={s.singleGrid}>
              <View style={s.singleCard}>
                <Cpu size={18} color={t.accentCyan} />
                <Text style={[s.singleCardText, { color: t.textPrimary }]}>Dev Mode 1x1</Text>
              </View>
              <View style={s.singleCard}>
                <Usb size={18} color={t.accentCyan} />
                <Text style={[s.singleCardText, { color: t.textPrimary }]}>USB ADB 1x1</Text>
              </View>
              <View style={s.singleCard}>
                <Wifi size={18} color={t.accentCyan} />
                <Text style={[s.singleCardText, { color: t.textPrimary }]}>Wireless 1x1</Text>
              </View>
            </View>
          </Card>

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
});

