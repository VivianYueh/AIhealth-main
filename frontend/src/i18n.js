import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import nlTranslation from './locales/nl/translation.json'

import zh from './locales/zh/translation.json'
import en from './locales/en/translation.json'
import ja from './locales/ja/translation.json'
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      ja: { translation: ja },
      nl: { translation: nlTranslation }
    },
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
