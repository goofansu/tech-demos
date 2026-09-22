import * as React from "react";
import {
  applyDocumentLocale,
  detectLocale,
  persistLocale,
  translate,
  type Locale,
  type MessagePath,
  type Translate,
  type Vars,
} from "./i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => detectLocale());

  React.useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const t = React.useCallback<Translate>(
    (path, vars) => translate(locale, path, vars),
    [locale],
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function RichText({
  path,
  vars,
  tokens,
}: {
  path: MessagePath;
  vars?: Vars;
  tokens?: Record<string, React.ReactNode>;
}) {
  const { t } = useI18n();
  const text = t(path, vars);
  if (!tokens) return <>{text}</>;
  return (
    <>
      {text.split(/(\{\w+\})/g).map((part, i) => {
        const match = part.match(/^\{(\w+)\}$/);
        if (match && tokens[match[1]] !== undefined) {
          return <React.Fragment key={i}>{tokens[match[1]]}</React.Fragment>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
