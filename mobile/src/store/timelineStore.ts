import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MilestoneType =
  | 'ITA'
  | 'Application Submitted'
  | 'AOR Received'
  | 'Biometrics Requested'
  | 'Biometrics Completed'
  | 'Medical Requested'
  | 'Medical Passed'
  | 'Passport Requested'
  | 'Passport Submitted'
  | 'Passport Collected'
  | 'ADR'
  | 'Portal 1'
  | 'Portal 2'
  | 'Final Decision'
  | 'Custom';

export type Milestone = {
  id: string;
  type: MilestoneType;
  date: string;       // YYYY-MM-DD
  note: string;
  customLabel?: string | undefined;
  customEmoji?: string | undefined;
};

type TimelineStore = {
  milestones: Milestone[];
  load: () => Promise<void>;
  add: (m: Omit<Milestone, 'id'>) => Promise<void>;
  update: (id: string, m: Omit<Milestone, 'id'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const KEY = 'timeline_milestones';

/**
 * Guards against corrupt or stale-schema persisted data: a bad `date` would
 * produce `NaN` from `getTime()` and destabilize every sort, and a missing
 * `id`/`type` would break rendering. Invalid entries are dropped rather than
 * crashing the timeline.
 */
function isValidMilestone(m: unknown): m is Milestone {
  if (!m || typeof m !== 'object') return false;
  const x = m as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.type === 'string' &&
    typeof x.date === 'string' &&
    !Number.isNaN(new Date(x.date).getTime())
  );
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  milestones: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const milestones = (Array.isArray(parsed) ? parsed : [])
        .filter(isValidMilestone)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      set({ milestones });
    } catch {}
  },

  add: async (m) => {
    const milestone: Milestone = { ...m, id: Date.now().toString() };
    const updated = [...get().milestones, milestone].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    set({ milestones: updated });
    try { await AsyncStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  },

  update: async (id, m) => {
    const updated = get().milestones
      .map(x => x.id === id ? { ...m, id } : x)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    set({ milestones: updated });
    try { await AsyncStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  },

  remove: async (id) => {
    const updated = get().milestones.filter((m) => m.id !== id);
    set({ milestones: updated });
    try { await AsyncStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  },
}));
