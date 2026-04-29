import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (val: boolean) => void;
  userName: string;
  setUserName: (name: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      userName: '',
      setHasCompletedOnboarding: (val) => set({ hasCompletedOnboarding: val }),
      setUserName: (name) => set({ userName: name }),
    }),
    {
      name: 'talk-tally-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);