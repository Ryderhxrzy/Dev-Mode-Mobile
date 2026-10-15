import { ReactNode, useEffect, useState } from 'react';
import { Text as NativeText, TextProps } from 'react-native';
import { useLanguage } from '@/state/language';

const translationCache = new Map<string, string>();

type LocalizedTextProps = TextProps & { children?: ReactNode };

export default function LocalizedText({ children, ...props }: LocalizedTextProps) {
  const { language, translate } = useLanguage();
  const source = typeof children === 'string' ? children : null;
  const cacheKey = source ? `${language}:${source}` : '';
  const [translated, setTranslated] = useState<{ source: string; value: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!source || language === 'en') {
      return () => {
        active = false;
      };
    }

    const cached = translationCache.get(cacheKey);
    if (cached) {
      return () => {
        active = false;
      };
    }

    translate(source).then(result => {
      if (!active) return;
      translationCache.set(cacheKey, result);
      setTranslated({ source, value: result });
    });

    return () => {
      active = false;
    };
  }, [cacheKey, language, source, translate]);

  const displayValue = source && language !== 'en'
    ? translationCache.get(cacheKey) ?? (translated?.source === source ? translated.value : source)
    : source ?? children;
  return <NativeText {...props}>{displayValue}</NativeText>;
}
