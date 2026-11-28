import type React from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme';
import type { MilestoneType } from '@/store/timelineStore';

// ─── Milestone metadata ───────────────────────────────────────────────────────

export type Meta = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  labelKey: string;
  /** Shown instead of `icon` (see MilestoneIcon). */
  emoji?: string;
};

export const MILESTONE_META: Record<MilestoneType, Meta> = {
  'ITA':                   { icon: 'mail-open',         color: palette.info, labelKey: 'milestoneTypes.ita' },
  'Application Submitted': { icon: 'cloud-upload',      color: palette.success, labelKey: 'milestoneTypes.applicationSubmitted' },
  'AOR Received':          { icon: 'document-text',     color: palette.success, labelKey: 'milestoneTypes.aorReceived' },
  'Biometrics Requested':  { icon: 'finger-print',      color: palette.warning, labelKey: 'milestoneTypes.biometricsRequested' },
  'Biometrics Completed':  { icon: 'shield-checkmark',  color: palette.success, labelKey: 'milestoneTypes.biometricsCompleted' },
  'Medical Requested':     { icon: 'medkit',            color: palette.warning, labelKey: 'milestoneTypes.medicalRequested' },
  'Medical Passed':        { icon: 'pulse',             color: palette.success, labelKey: 'milestoneTypes.medicalPassed' },
  'Passport Requested':    { icon: 'id-card',           color: palette.warning, labelKey: 'milestoneTypes.passportRequested' },
  'Passport Submitted':    { icon: 'send',              color: palette.info, labelKey: 'milestoneTypes.passportSubmitted' },
  'Passport Collected':    { icon: 'airplane',          color: palette.success, labelKey: 'milestoneTypes.passportCollected' },
  'ADR':                   { icon: 'document-attach',   color: palette.orange, labelKey: 'milestoneTypes.adr' },
  'Final Decision':        { icon: 'checkmark-done-circle', color: palette.danger, labelKey: 'milestoneTypes.finalDecision' },
  'Portal 1':              { icon: 'log-in',            color: palette.purple, labelKey: 'milestoneTypes.portal1' },
  'Portal 2':              { icon: 'globe',             color: palette.purpleDeep, labelKey: 'milestoneTypes.portal2' },
  'COPR':                  { icon: 'trophy',            color: palette.success, labelKey: 'milestoneTypes.copr', emoji: '🎉' },
  'Custom':                { icon: 'pencil',            color: palette.gray300, labelKey: 'timeline.custom' },
};

export const MILESTONE_TYPES: MilestoneType[] = [
  'ITA', 'Application Submitted', 'AOR Received',
  'Biometrics Requested', 'Biometrics Completed',
  'Medical Requested', 'Medical Passed',
  'Passport Requested', 'Passport Submitted', 'Passport Collected',
  'ADR', 'Final Decision',
  'Portal 1', 'Portal 2', 'COPR',
  'Custom',
];
