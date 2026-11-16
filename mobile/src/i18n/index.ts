import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import en from './en';
import fr from './fr';

// The App Store name is "IRCC Tracker: Score & Draws" (from 1.0.17), so iOS shows that name in the
// app's branding spots (header logo, side menu, onboarding welcome, share text). Android keeps
// "CRS Pulse": Play rejected "IRCC" in its title. Strings that need the name nest $t(common.appName),
// and disclaimers / legal text keep "CRS Pulse" as the publisher name on both platforms.
function withPlatformBrand(t: typeof en): typeof en {
  if (Platform.OS !== 'ios') return t;
  return {
    ...t,
    common: { ...t.common, appName: t.common.appNameIos },
    menu: { ...t.menu, subtitle: t.menu.subtitleIos },
  };
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: withPlatformBrand(en) },
      fr: { translation: withPlatformBrand(fr) },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  .catch(() => {});

export default i18n;
