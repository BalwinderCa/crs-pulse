import { create } from 'zustand';

type NotificationState = {
  unreadCount: number;
  fcmToken: string | null;
};

type NotificationActions = {
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
  setFcmToken: (token: string) => void;
};

export const useNotificationStore = create<NotificationState & NotificationActions>((set) => ({
  unreadCount: 0,
  fcmToken: null,

  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
  setFcmToken: (token) => set({ fcmToken: token }),
}));
