import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en as enTranslation } from "./languages/en";

// Initialise SYNCHRONOUSLY with bundled English so `useTranslation()` never runs
// against an uninitialised i18n instance (that crashes react-i18next's
// `useMemoizedT` on React 19: "Cannot read properties of undefined (reading
// 'length')"). The user's preferred language is loaded/switched afterwards.
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    // `initImmediate: false` makes init() finish synchronously (i18next otherwise
    // defers it to a setTimeout(0)); combined with bundled `en` resources this
    // guarantees `useTranslation()` always sees a ready instance, so react-i18next
    // never early-returns then re-renders with a different hook count — the cause
    // of "Cannot read properties of undefined (reading 'length')" on React 19.
    initImmediate: false,
    compatibilityJSON: "v4",
    resources: { en: { translation: enTranslation } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

const LANGUAGE_LOADERS = {
  en: () => import("./languages/en").then((module) => module.en),
  hi: () => import("./languages/hi").then((module) => module.hi),
  zh: () => import("./languages/zh").then((module) => module.zh),
  de: () => import("./languages/de").then((module) => module.de),
  fr: () => import("./languages/fr").then((module) => module.fr),
  km: () => import("./languages/km").then((module) => module.km),
  ar: () => import("./languages/ar").then((module) => module.ar),
  he: () => import("./languages/he").then((module) => module.he),
  kk: () => import("./languages/kk").then((module) => module.kk),
  ru: () => import("./languages/ru").then((module) => module.ru),
};
type SupportedLanguage = keyof typeof LANGUAGE_LOADERS;

const LANGUAGE_KEY = "lang";
const LEGACY_LANGUAGE_KEY = "enatega-language";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";

const normalizeLanguage = (language?: string | null): SupportedLanguage =>
  language && language in LANGUAGE_LOADERS
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE;

const getInitialLanguage = async (): Promise<string> => {
  const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (storedLang) return storedLang;

  const legacyLang = await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY);
  if (legacyLang) {
    await AsyncStorage.setItem(LANGUAGE_KEY, legacyLang);
    await AsyncStorage.removeItem(LEGACY_LANGUAGE_KEY);
    return legacyLang;
  }

  return Localization.getLocales()[0]?.languageCode || "en";
};

const getLanguageResources = async (language: SupportedLanguage) => {
  const translation = await LANGUAGE_LOADERS[language]();
  return { [language]: { translation } };
};

const ensureLanguageResources = async (language: SupportedLanguage) => {
  if (i18next.hasResourceBundle(language, "translation")) return;

  const resources = await getLanguageResources(language);
  i18next.addResourceBundle(
    language,
    "translation",
    resources[language].translation,
    true,
    true,
  );
};

export const setAppLanguage = async (language?: string | null) => {
  const normalizedLanguage = normalizeLanguage(language);

  await ensureLanguageResources(DEFAULT_LANGUAGE);
  if (normalizedLanguage !== DEFAULT_LANGUAGE) {
    await ensureLanguageResources(normalizedLanguage);
  }

  await i18next.changeLanguage(normalizedLanguage);
  return normalizedLanguage;
};

const initializeLanguage = async (): Promise<void> => {
  try {
    const initialLang = normalizeLanguage(await getInitialLanguage());
    if (initialLang !== DEFAULT_LANGUAGE) {
      await ensureLanguageResources(initialLang);
      await i18next.changeLanguage(initialLang);
    }
  } catch {
    // Stay on the synchronously-initialised English instance.
  }
};

initializeLanguage();

export default i18next;
