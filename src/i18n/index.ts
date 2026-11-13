import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from '../services/api';

import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ru from './locales/ru.json';

export const LANGUAGE_STORAGE_KEY = 'btcm_app_language';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇭🇰' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

export const resources = {
  en: { translation: en },
  'zh-TW': { translation: zhTW },
  'zh-CN': { translation: zhCN },
  ja: { translation: ja },
  ko: { translation: ko },
  es: { translation: es },
  ru: { translation: ru },
} as const;

/**
 * Detect the best matching language from the device or browser locales
 */
export function getDeviceLanguage(): string {
  try {
    // 1. Browser Environment (Web) - Use native navigator to avoid isDOMAvailable / SSR issues
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const navLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      const tag = navLang.toLowerCase();

      if (tag.includes('tw') || tag.includes('hk') || tag.includes('hant') || tag.includes('mo')) {
        return 'zh-TW';
      }
      if (tag === 'zh' || tag.startsWith('zh') || tag.includes('cn') || tag.includes('hans')) {
        return 'zh-CN';
      }
      if (tag.startsWith('ja')) return 'ja';
      if (tag.startsWith('ko')) return 'ko';
      if (tag.startsWith('es')) return 'es';
      if (tag.startsWith('ru')) return 'ru';
    }

    // 2. Native Environment (iOS / Android) - Safely use expo-localization if available
    if (Platform.OS !== 'web' && typeof Localization !== 'undefined' && Localization.getLocales) {
      try {
        const locales = Localization.getLocales();
        if (locales && locales.length > 0) {
          const primary = locales[0];
          const tag = (primary.languageTag || '').toLowerCase();
          const code = (primary.languageCode || '').toLowerCase();

          if (tag.includes('tw') || tag.includes('hk') || tag.includes('hant') || tag.includes('mo')) {
            return 'zh-TW';
          }
          if (code === 'zh' || tag.includes('cn') || tag.includes('hans')) {
            return 'zh-CN';
          }
          if (code === 'ja') return 'ja';
          if (code === 'ko') return 'ko';
          if (code === 'es') return 'es';
          if (code === 'ru') return 'ru';
        }
      } catch {
        // ignore native locale failure
      }
    }
  } catch (e) {
    // fallback quietly
  }
  return 'en';
}

/**
 * Get initial language synchronously on startup (prefers saved localStorage preference)
 */
function getInitialLanguage(): string {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && resources[stored as keyof typeof resources]) {
        return stored;
      }
    } catch {}
  }
  return getDeviceLanguage();
}

/**
 * Change and persist language
 */
export async function setAppLanguage(langCode: string): Promise<void> {
  try {
    await i18n.changeLanguage(langCode);
    api.setLanguage(langCode);

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
      } catch {}
    }

    if (Platform.OS !== 'web') {
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
      } catch {}
    }

    if (api.getToken()) {
      api.updateUserLanguage(langCode).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to persist language selection:', err);
  }
}

/**
 * Get stored language or fallback to device language
 */
export async function getStoredLanguage(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'en';
  }

  try {
    if (typeof window.localStorage !== 'undefined') {
      const local = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (local && resources[local as keyof typeof resources]) {
        return local;
      }
    }
  } catch {}

  try {
    if (Platform.OS !== 'web') {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && resources[stored as keyof typeof resources]) {
        return stored;
      }
    }
  } catch {}

  return getDeviceLanguage();
}

// Initialize i18next with immediate synchronous language preference
const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
    react: {
      useSuspense: false, // Avoid suspense issues on React Native
    },
  });

// On web client or native, ensure persisted preference is synced
if (typeof window !== 'undefined') {
  getStoredLanguage().then((savedLang) => {
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  });
}

export default i18n;
