import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import type { CalcInputs } from '@/store/profileStore';
import type { CRSBreakdown } from '@/features/onboarding/utils/crsCalculator';

// ─── Labels (mirrors ProfileScreen for consistency) ───────────────────────────

const EDU_LABELS: Record<string, string> = {
  less_than_secondary: 'Less than high school',
  secondary:           'High school diploma',
  '1year':             '1-year post-secondary',
  '2year':             '2-year post-secondary',
  bachelors:           "Bachelor's degree",
  two_or_more:         'Two or more degrees',
  masters:             "Master's degree",
  phd:                 'PhD / Doctorate',
};

const MARITAL_LABELS: Record<string, string> = {
  single:                   'Single',
  married:                  'Married / CLP',
  married_not_accompanying: 'Married (not accompanying)',
};

function workExpLabel(y: number): string {
  if (y === 0) return 'None';
  if (y === 1) return '1 year';
  return `${y}+ years`;
}

function canadianEdLabel(v: string): string {
  if (v === 'none')    return 'None';
  if (v === '1_2year') return '1–2 year program';
  return '3+ year program';
}

/**
 * Escapes a value before it is interpolated into the export HTML. Inputs are
 * controlled enums/numbers today, but the PDF is built from a template string —
 * escaping every string interpolation closes any XSS-in-PDF path if a free-text
 * field ever reaches this template.
 */
function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow a 3/6/8-digit hex color into CSS; otherwise fall back to the brand red. */
function safeColor(color: string): string {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color) ? color : '#DC2626';
}

// ─── HTML template ────────────────────────────────────────────────────────────

export function buildProfileHtml(
  inputs:   CalcInputs,
  result:   CRSBreakdown,
  score:    number,
  category: string | null,
  accent = '#DC2626',
): string {
  const married = inputs.maritalStatus === 'married';
  const date    = format(new Date(), 'MMMM d, yyyy');
  accent        = safeColor(accent);

  const maxAge    = married ? 100  : 110;
  const maxEdu    = married ? 140  : 150;
  const maxFL     = married ? 128  : 136;
  const maxSL     = married ? 22   : 24;
  const maxCWE    = married ? 70   : 80;

  const bItems: { label: string; value: number; max: number }[] = [
    { label: 'Age',                 value: result.agePoints,             max: maxAge },
    { label: 'Education',           value: result.educationPoints,       max: maxEdu },
    { label: 'First Language',      value: result.firstLangPoints,       max: maxFL  },
    { label: 'Second Language',     value: result.secondLangPoints,      max: maxSL  },
    { label: 'Canadian Work Exp',   value: result.canadianWorkExpPoints, max: maxCWE },
    ...(married ? [
      { label: 'Spouse Education',  value: result.spouseEducationPoints, max: 10  },
      { label: 'Spouse Language',   value: result.spouseLangPoints,       max: 20  },
      { label: 'Spouse Work Exp',   value: result.spouseWorkExpPoints,    max: 10  },
    ] : []),
    { label: 'Skill Transfer',      value: result.skillTransferPoints,   max: 100 },
    { label: 'Additional Points',   value: result.additionalPoints,      max: 600 },
    { label: 'Total',               value: result.total,                 max: 1200 },
  ];

  const breakdownGrid = bItems.map(({ label, value, max }) => `
    <div class="bi">
      <div class="bl">${label}</div>
      <div class="bv" style="color:${label === 'Total' ? accent : '#1a2b45'}">${value}</div>
      <div class="bm">/ ${max}</div>
    </div>`).join('');

  const langBlock = (prefix: string, s: number, l: number, r: number, w: number) => `
    <tr><td>${prefix} Speaking</td><td>${s}</td></tr>
    <tr><td>${prefix} Listening</td><td>${l}</td></tr>
    <tr><td>${prefix} Reading</td><td>${r}</td></tr>
    <tr><td>${prefix} Writing</td><td>${w}</td></tr>`;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>CRS Profile — CRS Pulse</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a2b45;background:#fff;padding:40px 48px;max-width:760px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:14px;border-bottom:2px solid #eaedf2}
.brand{font-size:21px;font-weight:800;letter-spacing:-0.4px}.brand span{color:${accent}}
.date{font-size:11px;color:#6b7c93}
.hero{text-align:center;margin:20px 0 36px}
.snum{font-size:78px;font-weight:900;color:${accent};line-height:1;letter-spacing:-3px}
.slbl{font-size:11px;color:#6b7c93;text-transform:uppercase;letter-spacing:1px;margin-top:6px}
.scat{display:inline-block;margin-top:10px;padding:4px 16px;border-radius:6px;background:#f0f5ff;color:#1a2b45;font-size:12px;font-weight:700;border:1px solid #d0daf0}
.sec{margin-bottom:28px}
.stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7c93;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #eaedf2}
table{width:100%;border-collapse:collapse}
td{padding:7px 0;font-size:12px;border-bottom:1px solid #f0f3fa;vertical-align:middle}
td:first-child{color:#6b7c93;width:55%}
td:last-child{text-align:right;font-weight:600;color:#1a2b45}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.bi{padding:11px;border-radius:7px;background:#f8faff;border:1px solid #e4ecf8}
.bl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#6b7c93}
.bv{font-size:21px;font-weight:900;margin-top:3px}
.bm{font-size:10px;color:#a0aec0;margin-top:1px}
.ftr{margin-top:40px;padding-top:14px;border-top:1px solid #eaedf2;font-size:10px;color:#a0aec0;text-align:center;line-height:1.8}
</style>
</head><body>

<div class="hdr">
  <div class="brand">CRS <span>Pulse</span></div>
  <div class="date">Generated ${date}</div>
</div>

<div class="hero">
  <div class="snum">${score > 0 ? score : '—'}</div>
  <div class="slbl">Comprehensive Ranking System Score</div>
  ${category ? `<div class="scat">${esc(category)} Stream</div>` : ''}
</div>

<div class="sec">
  <div class="stitle">Profile Summary</div>
  <table>
    <tr><td>Age</td><td>${esc(inputs.age)}</td></tr>
    <tr><td>Marital Status</td><td>${esc(MARITAL_LABELS[inputs.maritalStatus] ?? inputs.maritalStatus)}</td></tr>
    <tr><td>Education</td><td>${esc(EDU_LABELS[inputs.education] ?? inputs.education)}</td></tr>
    <tr><td>Canadian Education</td><td>${esc(canadianEdLabel(inputs.canadianEducation))}</td></tr>
    <tr><td>First Language Test</td><td>${esc(inputs.firstLangTest)}</td></tr>
    ${langBlock('First Lang', inputs.firstLangSpeaking, inputs.firstLangListening, inputs.firstLangReading, inputs.firstLangWriting)}
    ${inputs.hasSecondLang ? `<tr><td>Second Language Test</td><td>${esc(inputs.secondLangTest)}</td></tr>
    ${langBlock('Second Lang', inputs.secondLangSpeaking, inputs.secondLangListening, inputs.secondLangReading, inputs.secondLangWriting)}` : ''}
    <tr><td>Canadian Work Experience</td><td>${workExpLabel(inputs.canadianWorkExp)}</td></tr>
    <tr><td>Foreign Work Experience</td><td>${workExpLabel(inputs.foreignWorkExp)}</td></tr>
    <tr><td>Trade Certificate</td><td>${inputs.hasTradeCert ? 'Yes' : 'No'}</td></tr>
    <tr><td>Provincial Nomination</td><td>${inputs.hasProvincialNomination ? 'Yes' : 'No'}</td></tr>
    <tr><td>Sibling in Canada</td><td>${inputs.hasSiblingInCanada ? 'Yes' : 'No'}</td></tr>
  </table>
</div>

<div class="sec">
  <div class="stitle">Score Breakdown</div>
  <div class="grid">${breakdownGrid}</div>
</div>

<div class="ftr">
  Calculated with CRS Pulse — independent tool, not affiliated with IRCC or the Government of Canada.<br/>
  Points based on official IRCC CRS grid (last updated 2025-08-21). Always verify with the official IRCC tool before making decisions.
</div>

</body></html>`;
}

// ─── Export PDF ───────────────────────────────────────────────────────────────

/** Resolves `true` when the PDF was handed to the share sheet, `false` when
 *  sharing is unavailable on the device (caller should inform the user). */
export async function exportProfilePdf(
  inputs:   CalcInputs,
  result:   CRSBreakdown,
  score:    number,
  category: string | null,
  accent?:  string,
): Promise<boolean> {
  const html = buildProfileHtml(inputs, result, score, category, accent);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return false;
  await Sharing.shareAsync(uri, {
    mimeType:    'application/pdf',
    UTI:         'com.adobe.pdf',
    dialogTitle: 'Save or share CRS Profile',
  });
  return true;
}
