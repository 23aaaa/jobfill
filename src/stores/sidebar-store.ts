import { create } from 'zustand';

export type MsgType = 'ok' | 'warn' | 'err' | 'loading' | null;

interface SidebarState {
  isVisible: boolean;
  hideContent: boolean;
  searchKeyword: string;
  message: string;
  messageType: MsgType;
  collapsedGroups: Record<string, boolean>;
  collapsedSubGroups: Record<string, boolean>;
  sidebarWidth: number;

  show: () => void;
  hide: () => void;
  toggle: () => void;
  setHideContent: (v: boolean) => void;
  setSearchKeyword: (v: string) => void;
  setMessage: (text: string, type: MsgType) => void;
  clearMessage: () => void;
  toggleGroup: (groupName: string) => void;
  toggleSubGroup: (key: string) => void;
  expandAllGroups: () => void;
  setSidebarWidth: (w: number) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isVisible: false,
  hideContent: false,
  searchKeyword: '',
  message: '',
  messageType: null,
  collapsedGroups: {},
  collapsedSubGroups: {},
  sidebarWidth: 370,

  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
  toggle: () => set((s) => ({ isVisible: !s.isVisible })),
  setHideContent: (v) => set({ hideContent: v }),
  setSearchKeyword: (v) => set({ searchKeyword: v }),

  setMessage: (text, type) => {
    set({ message: text, messageType: type });
    if (type !== 'loading') {
      setTimeout(() => {
        set((s) => (s.message === text ? { message: '', messageType: null } : s));
      }, 2500);
    }
  },

  clearMessage: () => set({ message: '', messageType: null }),

  toggleGroup: (groupName) =>
    set((s) => ({
      collapsedGroups: {
        ...s.collapsedGroups,
        [groupName]: !s.collapsedGroups[groupName],
      },
    })),

  toggleSubGroup: (key) =>
    set((s) => ({
      collapsedSubGroups: {
        ...s.collapsedSubGroups,
        [key]: !s.collapsedSubGroups[key],
      },
    })),

  expandAllGroups: () => set({ collapsedGroups: {}, collapsedSubGroups: {} }),

  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(280, Math.min(w, 700)) }),
}));
