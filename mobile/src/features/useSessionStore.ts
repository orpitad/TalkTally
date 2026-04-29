import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionStep } from './sessionData';
import { getHistory } from './sessionStorage';

interface ResponseRecord {
  stepId: number;
  didSpeak: boolean;
  timestamp: number;
}

interface SessionState {
  steps: SessionStep[];
  currentStepIndex: number;
  sessionResults: ResponseRecord[];
  setSteps: (steps: SessionStep[]) => void;
  logResponse: (stepId: number, didSpeak: boolean) => void;
  nextStep: () => boolean;
  resetSession: () => void;
  completeSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      steps: [],
      currentStepIndex: 0,
      sessionResults: [],

      setSteps: (steps: SessionStep[]) => set({ steps }),

      completeSession: async () => {
        const { sessionResults, steps, resetSession } = get();

        if (sessionResults.length === 0) {
          resetSession();
          return;
        }

        const positiveResponses = sessionResults.filter(r => r.didSpeak).length;
        const accuracy = Math.round((positiveResponses / steps.length) * 100);

        const newRecord = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString(),
          accuracy,
          totalSteps: steps.length,
        };

        // Use the shared getHistory reader to avoid dual-write race conditions
        const history = await getHistory();
        await AsyncStorage.setItem(
          'talk-tally-history',
          JSON.stringify([newRecord, ...history])
        );

        resetSession();
      },

      logResponse: (stepId, didSpeak) =>
        set((state) => ({
          sessionResults: [
            ...state.sessionResults,
            { stepId, didSpeak, timestamp: Date.now() },
          ],
        })),

      nextStep: () => {
        const { currentStepIndex, steps } = get();
        if (currentStepIndex < steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
          return true;
        }
        return false;
      },

      // Clears steps too so stale data never bleeds into a new session
      resetSession: () =>
        set({
          currentStepIndex: 0,
          sessionResults: [],
          steps: [],
        }),
    }),
    {
      name: 'talk-tally-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);