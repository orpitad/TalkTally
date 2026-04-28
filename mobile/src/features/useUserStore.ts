import { create } from 'zustand';

interface UserState {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (val: boolean) => void;
  userName: string;
  setUserName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  hasCompletedOnboarding: false,
  userName: '',
  setHasCompletedOnboarding: (val) => set({ hasCompletedOnboarding: val }),
  setUserName: (name) => set({ userName: name }),
}));