import {
  toCLB,
  type LangScores,
  type LanguageTest,
  type TefScale,
} from '@/features/onboarding/utils/crsCalculator';

const LANG_TEST_MAP: Record<string, LanguageTest> = {
  IELTS: 'IELTS',
  CELPIP: 'CELPIP',
  CLB: 'CLB',
  'PTE Core': 'PTE_CORE',
  TEF: 'TEF',
  TCF: 'TCF',
};

/** True when all four first-language skills are CLB 4+ (IRCC minimum for EE language points). */
export function isCrsScoreReady(
  firstLangTest: string,
  scores: { speaking: number; listening: number; reading: number; writing: number },
  tefScale: TefScale = 'current',
): boolean {
  const test = (LANG_TEST_MAP[firstLangTest] ?? 'IELTS') as LanguageTest;
  const clbOk = (skill: keyof LangScores, v: number) => toCLB(test, skill, v, tefScale) >= 4;
  return (
    clbOk('speaking', scores.speaking) &&
    clbOk('listening', scores.listening) &&
    clbOk('reading', scores.reading) &&
    clbOk('writing', scores.writing)
  );
}
