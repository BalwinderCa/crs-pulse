import {
  calculateCRS,
  suggestCategory,
  type TefScale,
} from '@/features/onboarding/utils/crsCalculator';
import { buildCRSInput } from '@/features/onboarding/utils/buildCRSInput';
import { isCrsScoreReady } from '@/utils/crsScoreReady';
import type { CalcInputs } from '@/store/profileStore';

/**
 * Score + category for the saved calculator inputs, shared by the Settings
 * score card and the My Profile screen. `scoreReady` is false until the user
 * has entered first-language scores, so fresh installs don't echo defaults.
 */
export function summarizeProfile(inp: CalcInputs) {
  const n = (v: unknown) => Number(v) || 0;
  const coerced: CalcInputs = {
    ...inp,
    firstLangSpeaking:   n(inp.firstLangSpeaking),
    firstLangListening:  n(inp.firstLangListening),
    firstLangReading:    n(inp.firstLangReading),
    firstLangWriting:    n(inp.firstLangWriting),
    secondLangSpeaking:  n(inp.secondLangSpeaking),
    secondLangListening: n(inp.secondLangListening),
    secondLangReading:   n(inp.secondLangReading),
    secondLangWriting:   n(inp.secondLangWriting),
    spouseLangSpeaking:  n(inp.spouseLangSpeaking),
    spouseLangListening: n(inp.spouseLangListening),
    spouseLangReading:   n(inp.spouseLangReading),
    spouseLangWriting:   n(inp.spouseLangWriting),
  };

  const crsInput = buildCRSInput(coerced);
  const result   = calculateCRS(crsInput);

  const scoreReady = isCrsScoreReady(
    inp.firstLangTest,
    {
      speaking:  coerced.firstLangSpeaking,
      listening: coerced.firstLangListening,
      reading:   coerced.firstLangReading,
      writing:   coerced.firstLangWriting,
    },
    (inp.tefScale ?? 'current') as TefScale,
  );

  const score = scoreReady ? result.total : 0;
  const cat   = scoreReady ? (suggestCategory(crsInput, result.firstLangClb) as string) : null;

  return { coerced, result, scoreReady, score, cat };
}
