import { create } from 'zustand';

interface PlatformState {
  activeAppId: string | null;
  setActiveApp: (id: string | null) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  activeAppId: null,
  setActiveApp: (id) => set({ activeAppId: id }),
}));
