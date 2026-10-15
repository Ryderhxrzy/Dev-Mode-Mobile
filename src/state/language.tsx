import { getLocales } from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import DevToggle from '@/modules/dev-toggle-native';

export type LanguagePreference = 'auto' | string;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ru', label: 'Русский' },
  { code: 'fil', label: 'Filipino' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'it', label: 'Italiano' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh-TW', label: '中文（繁體）' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
] as const;

type LanguageContextValue = {
  preference: LanguagePreference;
  language: string;
  languageLabel: string;
  loading: boolean;
  setLanguage: (preference: LanguagePreference) => Promise<boolean>;
  downloadModel: (language?: string) => Promise<boolean>;
  isModelDownloaded: (language?: string) => Promise<boolean>;
  translate: (text: string) => Promise<string>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function normalizeLanguage(tag?: string | null) {
  if (!tag) return 'en';
  const exact = SUPPORTED_LANGUAGES.find(item => item.code.toLowerCase() === tag.toLowerCase());
  if (exact) return exact.code;
  const base = tag.split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.find(item => item.code.toLowerCase() === base)?.code ?? 'en';
}

function labelFor(code: string) {
  return SUPPORTED_LANGUAGES.find(item => item.code === code)?.label ?? 'English';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LanguagePreference>('auto');
  const [loading, setLoading] = useState(true);
  const detectedLanguage = normalizeLanguage(getLocales()[0]?.languageTag);
  const language = preference === 'auto' ? detectedLanguage : normalizeLanguage(preference);

  useEffect(() => {
    DevToggle.getLanguagePreference().then(value => setPreference(value || 'auto')).finally(() => setLoading(false));
  }, []);

  const setLanguage = useCallback(async (next: LanguagePreference) => {
    const saved = await DevToggle.setLanguagePreference(next);
    setPreference(next);
    return saved;
  }, []);

  const downloadModel = useCallback(async (target: string = language) => {
    if (target === 'en') return true;
    return DevToggle.downloadTranslationModel(target);
  }, [language]);

  const isModelDownloaded = useCallback(async (target: string = language) => {
    if (target === 'en') return true;
    return DevToggle.isTranslationModelDownloaded(target);
  }, [language]);

  const translate = useCallback(async (text: string) => {
    if (language === 'en') return text;
    return DevToggle.translateText(text, language);
  }, [language]);

  const value = useMemo(() => ({
    preference,
    language,
    languageLabel: labelFor(language),
    loading,
    setLanguage,
    downloadModel,
    isModelDownloaded,
    translate,
  }), [preference, language, loading, setLanguage, downloadModel, isModelDownloaded, translate]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
