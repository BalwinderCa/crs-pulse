import { buildProfileHtml } from '@/utils/exportProfile';
import type { CalcInputs } from '@/store/profileStore';
import type { CRSBreakdown } from '@/features/onboarding/utils/crsCalculator';

const inputs: CalcInputs = {
  maritalStatus: 'single',
  age: 30,
  education: 'bachelors',
  canadianEducation: 'none',
  firstLangTest: 'IELTS',
  firstLangSpeaking: 8, firstLangListening: 8, firstLangReading: 8, firstLangWriting: 8,
  hasSecondLang: false,
  secondLangTest: 'TEF',
  secondLangSpeaking: 0, secondLangListening: 0, secondLangReading: 0, secondLangWriting: 0,
  canadianWorkExp: 1,
  foreignWorkExp: 0,
  spouseEducation: 'secondary',
  spouseLangSpeaking: 0, spouseLangListening: 0, spouseLangReading: 0, spouseLangWriting: 0,
  spouseCanadianWorkExp: 0,
  hasProvincialNomination: false,
  jobOffer: 'none',
  hasSiblingInCanada: false,
  hasTradeCert: false,
  tefScale: 'current',
};

const result = {
  agePoints: 105, educationPoints: 120, firstLangPoints: 100, secondLangPoints: 0,
  canadianWorkExpPoints: 40, coreTotal: 365, spouseEducationPoints: 0, spouseLangPoints: 0,
  spouseWorkExpPoints: 0, spouseTotal: 0, skillTransferPoints: 50, eduTransferPoints: 25,
  workTransferPoints: 25, additionalPoints: 0, total: 415,
  firstLangClb: { speaking: 9, listening: 9, reading: 9, writing: 9 },
} as CRSBreakdown;

describe('buildProfileHtml — HTML escaping (L1)', () => {
  it('escapes a malicious category instead of injecting markup', () => {
    const html = buildProfileHtml(inputs, result, 415, '<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('rejects a non-hex accent color (CSS injection guard)', () => {
    const html = buildProfileHtml(inputs, result, 415, 'CEC', 'red;}body{display:none');
    expect(html).not.toContain('display:none');
    expect(html).toContain('#DC2626'); // fell back to brand color
  });

  it('keeps a valid hex accent color', () => {
    const html = buildProfileHtml(inputs, result, 415, 'CEC', '#1A6DFF');
    expect(html).toContain('#1A6DFF');
  });
});
