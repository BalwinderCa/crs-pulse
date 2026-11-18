import * as Font from 'expo-font';
import { fontFamilyFor, loadAppFont } from '@/theme/fonts';

jest.mock('expo-font', () => ({ loadAsync: jest.fn(() => Promise.resolve()) }));

describe('app fonts', () => {
  it('uses the system font for system and for a font not loaded yet', () => {
    expect(fontFamilyFor('system', '700')).toBeNull();
    expect(fontFamilyFor('manrope', '700')).toBeNull();
  });

  it('maps weights to the nearest loaded family', async () => {
    expect(await loadAppFont('inter')).toBe(true);
    expect(fontFamilyFor('inter', undefined)).toBe('inter-400');
    expect(fontFamilyFor('inter', 'bold')).toBe('inter-700');
    expect(fontFamilyFor('inter', '600')).toBe('inter-600');
    expect(fontFamilyFor('inter', '900')).toBe('inter-800');
  });

  it('keeps the system font when loading fails', async () => {
    (Font.loadAsync as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await loadAppFont('jakarta')).toBe(false);
    expect(fontFamilyFor('jakarta', '400')).toBeNull();
  });
});
