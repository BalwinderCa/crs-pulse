/**
 * Document checklists by program. Generic guidance compiled from IRCC
 * document requirements — the personalized checklist in your IRCC account
 * (after an ITA / once an application is started) is always the official list.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

export interface ChecklistSection {
  title: string;
  icon: string;
  items: ChecklistItem[];
}

export interface ChecklistProgram {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  intro: string;
  sections: ChecklistSection[];
}

const IDENTITY: ChecklistSection = {
  title: 'Identity',
  icon: 'person-outline',
  items: [
    { id: 'passport',      label: 'Valid passport', hint: 'Should not expire soon' },
    { id: 'photo',         label: 'Digital photo',  hint: 'Meets IRCC specifications' },
    { id: 'birth_cert',    label: 'Birth certificate' },
    { id: 'marriage_cert', label: 'Marriage / common-law proof (if applicable)' },
  ],
};

export const CHECKLIST_PROGRAMS: ChecklistProgram[] = [
  {
    id: 'express_entry',
    label: 'Express Entry (PR)',
    icon: 'briefcase-outline',
    blurb: 'CEC, FSW, FST and PNP via Express Entry',
    intro:
      'Standard documents for an Express Entry permanent residence application. Your personalized checklist after an ITA is the official list — always follow your IRCC account.',
    sections: [
      IDENTITY,
      {
        title: 'Language',
        icon: 'language-outline',
        items: [
          { id: 'lang_test',   label: 'Language test results', hint: 'IELTS / CELPIP / PTE Core / TEF / TCF — valid 2 years' },
          { id: 'lang_second', label: 'Second language results (if claiming points)' },
        ],
      },
      {
        title: 'Education',
        icon: 'school-outline',
        items: [
          { id: 'eca',         label: 'Educational Credential Assessment (ECA)', hint: 'WES, IQAS, ICES, etc. — valid 5 years' },
          { id: 'degrees',     label: 'Degrees and diplomas' },
          { id: 'transcripts', label: 'Transcripts' },
        ],
      },
      {
        title: 'Work Experience',
        icon: 'briefcase-outline',
        items: [
          { id: 'ref_letters', label: 'Employment reference letters', hint: 'Duties, hours/week, salary, dates, company letterhead' },
          { id: 'pay_stubs',   label: 'Pay stubs / T4s' },
          { id: 'job_offer',   label: 'Job offer letter (if applicable)' },
        ],
      },
      {
        title: 'Funds & Civil Documents',
        icon: 'wallet-outline',
        items: [
          { id: 'funds',  label: 'Proof of funds', hint: 'Official bank letters — 6-month history' },
          { id: 'police', label: 'Police certificates', hint: 'Every country lived in 6+ months since age 18' },
          { id: 'medical',label: 'Immigration medical exam', hint: 'IRCC-approved panel physician' },
        ],
      },
      {
        title: 'Other',
        icon: 'documents-outline',
        items: [
          { id: 'translations', label: 'Certified translations', hint: 'For any document not in English or French' },
          { id: 'pnp_cert',     label: 'Provincial nomination certificate (if applicable)' },
          { id: 'spouse_docs',  label: 'Spouse / partner documents (if accompanying)' },
        ],
      },
    ],
  },
  {
    id: 'pnp_paper',
    label: 'Provincial Nominee (paper)',
    icon: 'trail-sign-outline',
    blurb: 'Non-Express Entry PNP streams',
    intro:
      'Common documents for a non-Express Entry provincial nominee application. Requirements vary by province and stream — follow your province’s and IRCC’s official checklists.',
    sections: [
      IDENTITY,
      {
        title: 'Nomination',
        icon: 'ribbon-outline',
        items: [
          { id: 'nomination', label: 'Provincial nomination certificate' },
          { id: 'job_offer',  label: 'Job offer / employment contract (if required)' },
        ],
      },
      {
        title: 'Education & Language',
        icon: 'school-outline',
        items: [
          { id: 'eca',       label: 'ECA (if required by stream)' },
          { id: 'lang_test', label: 'Language test results' },
          { id: 'degrees',   label: 'Degrees, diplomas, transcripts' },
        ],
      },
      {
        title: 'Work & Funds',
        icon: 'wallet-outline',
        items: [
          { id: 'ref_letters', label: 'Employment reference letters' },
          { id: 'funds',       label: 'Proof of settlement funds' },
        ],
      },
      {
        title: 'Civil Documents',
        icon: 'documents-outline',
        items: [
          { id: 'police',       label: 'Police certificates' },
          { id: 'medical',      label: 'Immigration medical exam' },
          { id: 'translations', label: 'Certified translations' },
        ],
      },
    ],
  },
  {
    id: 'family',
    label: 'Family Sponsorship',
    icon: 'heart-outline',
    blurb: 'Spouse, partner, children, parents',
    intro:
      'Documents for sponsoring a family member for permanent residence. The sponsor and the sponsored person each have their own requirements — follow the official IRCC document checklist for your specific relationship.',
    sections: [
      IDENTITY,
      {
        title: 'Sponsor',
        icon: 'person-circle-outline',
        items: [
          { id: 'sponsor_status', label: 'Proof of Canadian citizenship or PR' },
          { id: 'sponsor_income', label: 'Proof of income / Notice of Assessment' },
          { id: 'undertaking',    label: 'Signed sponsorship agreement & undertaking' },
        ],
      },
      {
        title: 'Relationship',
        icon: 'heart-outline',
        items: [
          { id: 'marriage',  label: 'Marriage certificate or proof of common-law' },
          { id: 'relationship_proof', label: 'Relationship evidence', hint: 'Photos, messages, joint accounts, etc.' },
          { id: 'kids_birth', label: "Children's birth certificates (if applicable)" },
        ],
      },
      {
        title: 'Civil Documents',
        icon: 'documents-outline',
        items: [
          { id: 'police',       label: 'Police certificates' },
          { id: 'medical',      label: 'Immigration medical exam' },
          { id: 'translations', label: 'Certified translations' },
        ],
      },
    ],
  },
  {
    id: 'study',
    label: 'Study Permit',
    icon: 'school-outline',
    blurb: 'Study in Canada',
    intro:
      'Common documents for a study permit application. Requirements depend on your country and study level — always confirm with the IRCC document checklist for your situation.',
    sections: [
      IDENTITY,
      {
        title: 'Admission',
        icon: 'school-outline',
        items: [
          { id: 'loa',  label: 'Letter of acceptance from a DLI' },
          { id: 'pal',  label: 'Provincial Attestation Letter (PAL/TAL), if required' },
          { id: 'transcripts', label: 'Previous transcripts / diplomas' },
        ],
      },
      {
        title: 'Finances',
        icon: 'wallet-outline',
        items: [
          { id: 'funds',  label: 'Proof of funds', hint: 'Tuition + living costs + travel' },
          { id: 'gic',    label: 'GIC certificate (if applicable)' },
          { id: 'tuition',label: 'Proof of tuition payment (if applicable)' },
        ],
      },
      {
        title: 'Supporting',
        icon: 'documents-outline',
        items: [
          { id: 'sop',          label: 'Statement of purpose / study plan' },
          { id: 'medical',      label: 'Medical exam (if required)' },
          { id: 'translations', label: 'Certified translations' },
        ],
      },
    ],
  },
  {
    id: 'work',
    label: 'Work Permit',
    icon: 'construct-outline',
    blurb: 'Employer-specific or open',
    intro:
      'Common documents for a work permit application. LMIA-based, LMIA-exempt and open permits differ — follow the IRCC checklist for your permit type.',
    sections: [
      IDENTITY,
      {
        title: 'Employment',
        icon: 'briefcase-outline',
        items: [
          { id: 'job_offer', label: 'Job offer letter / employment contract' },
          { id: 'lmia',      label: 'LMIA or offer-of-employment number' },
          { id: 'credentials', label: 'Proof of qualifications / licensing' },
        ],
      },
      {
        title: 'Supporting',
        icon: 'documents-outline',
        items: [
          { id: 'resume',       label: 'Résumé / CV' },
          { id: 'ref_letters',  label: 'Past employment reference letters' },
          { id: 'medical',      label: 'Medical exam (if required)' },
          { id: 'translations', label: 'Certified translations' },
        ],
      },
    ],
  },
  {
    id: 'citizenship',
    label: 'Citizenship Grant',
    icon: 'flag-outline',
    blurb: 'Apply for Canadian citizenship',
    intro:
      'Common documents for a citizenship grant application. Confirm exact requirements with the official IRCC citizenship application guide (CIT 0002).',
    sections: [
      {
        title: 'Status & Identity',
        icon: 'person-outline',
        items: [
          { id: 'pr_card',  label: 'PR card (both sides)' },
          { id: 'passports',label: 'All passports/travel documents for the eligibility period' },
          { id: 'id',       label: 'Two pieces of personal identification' },
        ],
      },
      {
        title: 'Residency',
        icon: 'calendar-outline',
        items: [
          { id: 'calculator', label: 'Physical presence calculation', hint: '1,095+ days in the last 5 years' },
          { id: 'travel',     label: 'Travel history' },
          { id: 'taxes',      label: 'Proof of income tax filing' },
        ],
      },
      {
        title: 'Other',
        icon: 'documents-outline',
        items: [
          { id: 'language',     label: 'Proof of language ability (18–54)' },
          { id: 'photos',       label: 'Citizenship photos' },
          { id: 'translations', label: 'Certified translations' },
        ],
      },
    ],
  },
];

export function findChecklistProgram(id: string): ChecklistProgram | undefined {
  return CHECKLIST_PROGRAMS.find((p) => p.id === id);
}
