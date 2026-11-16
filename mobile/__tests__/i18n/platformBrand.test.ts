import type { i18n as I18n } from 'i18next';

function loadI18n(os: 'ios' | 'android'): I18n {
  let instance: I18n | undefined;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    // __tests__/setup.ts mocks @/i18n and react-i18next globally; this test needs the real ones.
    jest.unmock('@/i18n');
    jest.unmock('react-i18next');
    instance = require('@/i18n').default as I18n;
  });
  return instance!;
}

afterEach(() => jest.dontMock('react-native'));

describe('platform brand name', () => {
  it('iOS shows the App Store name in branding spots', async () => {
    const i18n = loadI18n('ios');
    expect(i18n.t('common.appName')).toBe('IRCC Tracker');
    expect(i18n.t('menu.subtitle')).toBe('Score & Draws');
    expect(i18n.t('onboarding.slide0Title')).toBe('Welcome to IRCC Tracker');
    expect(i18n.t('common.version', { version: '1.0.17' })).toBe('IRCC Tracker v1.0.17');
    await i18n.changeLanguage('fr');
    expect(i18n.t('common.appName')).toBe('Suivi IRCC');
    expect(i18n.t('onboarding.slide0Title')).toBe('Bienvenue dans Suivi IRCC');
  });

  it('Android keeps CRS Pulse', () => {
    const i18n = loadI18n('android');
    expect(i18n.t('common.appName')).toBe('CRS Pulse');
    expect(i18n.t('menu.subtitle')).toBe('Express Entry Tracker');
    expect(i18n.t('menu.shareMessage')).toMatch(/^Check out CRS Pulse —/);
  });

  it('disclaimers keep CRS Pulse as the publisher on iOS', () => {
    const i18n = loadI18n('ios');
    expect(i18n.t('onboarding.disclaimer')).toContain('CRS Pulse is an independent app');
  });
});
