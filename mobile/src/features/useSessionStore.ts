import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Update the Interface
interface SessionState {
  steps: any[];
  currentStepIndex: number;
  sessionResults: any[];
  setSteps: (steps: any[]) => void; // ADD THIS
  logResponse: (stepId: number, didSpeak: boolean) => void;
  nextStep: () => boolean;
  resetSession: () => void;
}

// 2. The Store Implementation
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      steps: [],
      currentStepIndex: 0,
      sessionResults: [],

      // ADD THIS METHOD
      setSteps: (steps: any[]) => set({ steps }),
completeSession: async () => {
  const { sessionResults, steps, resetSession } = get();
  
  if (sessionResults.length === 0) {
    resetSession();
    return;
  }

  // 1. Calculate accuracy based on current session results
  const positiveResponses = sessionResults.filter(r => r.didSpeak).length;
  const accuracy = Math.round((positiveResponses / steps.length) * 100);

  // 2. Create the record
  const newRecord = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    accuracy,
    totalSteps: steps.length,
  };

  // 3. Save to the 'talk-tally-history' key used by your HistoryScreen
  const existingData = await AsyncStorage.getItem('talk-tally-history');
  const history = existingData ? JSON.parse(existingData) : [];
  await AsyncStorage.setItem('talk-tally-history', JSON.stringify([newRecord, ...history]));

  // 4. Reset the index to 0 so the Home Screen button changes from "Resume" to "Start New"
  resetSession(); 
},      logResponse: (stepId, didSpeak) => 
        set((state) => ({
          sessionResults: [
            ...state.sessionResults, 
            { stepId, didSpeak, timestamp: Date.now() }
          ]
        })),

      nextStep: () => {
        const { currentStepIndex, steps } = get();
        if (currentStepIndex < steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
          return true;
        }
        return false;
      },

      resetSession: () => set({ 
        currentStepIndex: 0, 
        sessionResults: [] 
      }),
    }),
    {
      name: 'talk-tally-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);