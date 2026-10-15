import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import LocalizedText from '@/components/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Check from 'lucide-react-native/icons/check';
import Download from 'lucide-react-native/icons/download';
import X from 'lucide-react-native/icons/x';
import { SUPPORTED_LANGUAGES, useLanguage } from '@/state/language';
import { Card, Overline } from '@/components/ui';
import { ScreenBackground } from '@/components/ScreenBackground';
import { fonts, radius, space, useTheme } from '@/theme';

export default function LanguageSettings() {
  const t = useTheme();
  const { preference, language, setLanguage, downloadModel, isModelDownloaded } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [downloadState, setDownloadState] = useState<'checking' | 'confirm' | 'downloading' | 'ready' | 'error'>('confirm');
  const [downloadedModels, setDownloadedModels] = useState<Record<string, boolean>>({ en: true });

  useEffect(() => {
    let active = true;
    Promise.all(SUPPORTED_LANGUAGES.map(async item => [item.code, await isModelDownloaded(item.code)] as const))
      .then(entries => {
        if (active) setDownloadedModels({ en: true, ...Object.fromEntries(entries) });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isModelDownloaded]);

  const choose = async (code: string) => {
    if (busy || preference === code) return;
    setPendingCode(code);
    setModalVisible(true);
    setDownloadState('checking');
    const modelLanguage = code === 'auto' ? language : code;
    const alreadyDownloaded = modelLanguage === 'en' || await isModelDownloaded(modelLanguage);
    setDownloadState(alreadyDownloaded ? 'ready' : 'confirm');
  };

  const applyLanguage = async () => {
    if (!pendingCode) return;
    const code = pendingCode;
    setBusy(code);
    try {
      const modelLanguage = code === 'auto' ? language : code;
      if (modelLanguage !== 'en') {
        const alreadyDownloaded = await isModelDownloaded(modelLanguage);
        if (!alreadyDownloaded) {
          setDownloadState('downloading');
          const downloaded = await downloadModel(modelLanguage);
          if (!downloaded) {
            setDownloadState('error');
            return;
          }
          setDownloadedModels(current => ({ ...current, [modelLanguage]: true }));
        }
      }
      setDownloadState('ready');
    } finally {
      setBusy(null);
    }
  };

  const confirmApply = async () => {
    if (!pendingCode || downloadState !== 'ready') return;
    const saved = await setLanguage(pendingCode);
    setModalVisible(false);
    setPendingCode(null);
    if (!saved && pendingCode !== 'auto') Alert.alert('Build required', 'Language preference persistence is available in the Android development or production build.');
  };

  const closeModal = () => {
    if (downloadState === 'checking' || downloadState === 'downloading') return;
    setModalVisible(false);
    setPendingCode(null);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Overline>LANGUAGE</Overline>
            <LocalizedText style={[s.title, { color: t.textPrimary }]}>App Language</LocalizedText>
            <LocalizedText style={[s.desc, { color: t.textSecondary }]}>ML Kit translates the app on-device after the selected model is downloaded.</LocalizedText>
          </View>

          <Card>
            <LocalizedText style={[s.section, { color: t.textMuted }]}>AUTOMATIC</LocalizedText>
            <LanguageRow label="Automatic" detail={`Use device language · Currently ${language}`} downloaded={downloadedModels[language]} selected={preference === 'auto'} busy={busy === 'auto'} onPress={() => choose('auto')} />
          </Card>

          <Card>
            <LocalizedText style={[s.section, { color: t.textMuted }]}>MANUAL LANGUAGE</LocalizedText>
            {SUPPORTED_LANGUAGES.map(item => (
              <LanguageRow key={item.code} label={item.label} detail={item.code} downloaded={downloadedModels[item.code]} selected={preference === item.code} busy={busy === item.code} onPress={() => choose(item.code)} />
            ))}
          </Card>

          <View style={[s.note, { borderColor: t.cardBorder, backgroundColor: t.canvasElevated }]}>
            <Download size={15} color={t.accentCyan} />
            <LocalizedText style={[s.noteText, { color: t.textSecondary }]}>Language models download over Wi-Fi once, then translation works offline.</LocalizedText>
          </View>
        </ScrollView>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
          <View style={s.modalBackdrop}>
            <View style={[s.modalCard, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
              <View style={s.modalHeader}>
                <View style={[s.modalIcon, { backgroundColor: `${t.accentCyan}18` }]}>
                  {downloadState === 'checking' || downloadState === 'downloading' ? <ActivityIndicator color={t.accentCyan} /> : downloadState === 'ready' ? <Check size={20} color={t.success} /> : <Download size={20} color={t.accentCyan} />}
                </View>
                <Pressable onPress={closeModal} disabled={downloadState === 'checking' || downloadState === 'downloading'} hitSlop={12}>
                  <X size={20} color={t.textMuted} />
                </Pressable>
              </View>

              <LocalizedText style={[s.modalTitle, { color: t.textPrimary }]}>
                {downloadState === 'checking' ? 'Checking language pack' : downloadState === 'confirm' ? 'Download language pack?' : downloadState === 'downloading' ? 'Downloading language pack…' : downloadState === 'ready' ? 'Ready to apply' : 'Download failed'}
              </LocalizedText>
              <LocalizedText style={[s.modalBody, { color: t.textSecondary }]}>
                {downloadState === 'confirm'
                  ? `The ${pendingCode === 'auto' ? 'device language' : pendingCode} model is not on this device yet. Download it once and it will work offline after that.`
                  : downloadState === 'checking'
                  ? 'Checking whether this language pack is already available on this device.'
                  : downloadState === 'downloading'
                  ? 'Keep the app open while the offline translation model is being prepared.'
                  : downloadState === 'ready'
                  ? 'The model is ready. Apply the new language now; the UI will refresh using the new preference.'
                  : 'Connect to Wi-Fi and try again. Your current language has not been changed.'}
              </LocalizedText>

              {downloadState === 'error' ? (
                <Pressable onPress={applyLanguage} style={[s.primaryButton, { backgroundColor: t.accentCyan }]}>
                  <LocalizedText style={s.primaryButtonText}>Try Again</LocalizedText>
                </Pressable>
              ) : downloadState === 'confirm' ? (
                <View style={s.modalActions}>
                  <Pressable onPress={closeModal} style={[s.secondaryButton, { borderColor: t.cardBorder }]}><LocalizedText style={[s.secondaryButtonText, { color: t.textSecondary }]}>Cancel</LocalizedText></Pressable>
                  <Pressable onPress={applyLanguage} style={[s.primaryButton, { backgroundColor: t.accentCyan }]}><LocalizedText style={s.primaryButtonText}>Download</LocalizedText></Pressable>
                </View>
              ) : downloadState === 'ready' ? (
                <Pressable onPress={confirmApply} style={[s.primaryButton, { backgroundColor: t.success }]}><LocalizedText style={s.primaryButtonText}>Apply Language</LocalizedText></Pressable>
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function LanguageRow({ label, detail, downloaded, selected, busy, onPress }: { label: string; detail: string; downloaded?: boolean; selected: boolean; busy: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, { borderBottomColor: t.cardBorder, opacity: pressed ? 0.7 : 1 }]}>
      <View style={s.rowCopy}><LocalizedText style={[s.label, { color: t.textPrimary }]}>{label}</LocalizedText><LocalizedText style={[s.detail, { color: t.textMuted }]}>{detail}</LocalizedText></View>
      {busy ? <ActivityIndicator color={t.accentCyan} /> : downloaded ? <View style={[s.downloadedBadge, { backgroundColor: `${t.success}18` }]}><Check size={13} color={t.success} /><LocalizedText style={[s.downloadedText, { color: t.success }]}>Downloaded</LocalizedText></View> : selected ? <Check size={19} color={t.success} /> : null}
    </Pressable>
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
  title: { fontFamily: fonts.heading, fontSize: 26, letterSpacing: -0.4 },
  desc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  section: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.2, marginBottom: 4 },
  row: { width: '100%', minHeight: 58, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: space.md },
  rowCopy: { flex: 1, minWidth: 0, gap: 3 },
  label: { flexShrink: 1, fontFamily: fonts.heading, fontSize: 15, lineHeight: 20 },
  detail: { flexShrink: 1, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  downloadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 5 },
  downloadedText: { fontFamily: fonts.heading, fontSize: 10, lineHeight: 13 },
  note: { borderWidth: 1, borderRadius: radius.md, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  noteText: { flex: 1, minWidth: 0, flexShrink: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.72)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  modalCard: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  modalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flexShrink: 1, fontFamily: fonts.heading, fontSize: 20, lineHeight: 25 },
  modalBody: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  modalActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  primaryButton: { minWidth: 128, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, flex: 1 },
  primaryButtonText: { flexShrink: 1, color: '#04110B', fontFamily: fonts.heading, fontSize: 14, textAlign: 'center' },
  secondaryButton: { minWidth: 128, minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, flex: 1 },
  secondaryButtonText: { flexShrink: 1, fontFamily: fonts.heading, fontSize: 14, textAlign: 'center' },
});
