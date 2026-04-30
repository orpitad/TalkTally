import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionStep } from './sessionData';
import { getHistory, markSessionSynced } from './sessionStorage';
import { syncSession } from '../services/apiService';
import { getDeviceId } from '../services/deviceService';
import { logger } from '../services/logger';
import { analytics } from '../services/analytics';

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

      logResponse: (stepId, didSpeak) => {
        analytics.track(
          didSpeak ? 'session_step_responded' : 'session_step_skipped',
          { stepId }
        );
        set((state) => ({
          sessionResults: [
            ...state.sessionResults,
            { stepId, didSpeak, timestamp: Date.now() },
          ],
        }));
      },

      nextStep: () => {
        const { currentStepIndex, steps } = get();
        if (currentStepIndex < steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
          return true;
        }
        return false;
      },

      completeSession: async () => {
        const { sessionResults, steps, resetSession } = get();

        if (sessionResults.length === 0) {
          resetSession();
          return;
        }

        const positiveResponses = sessionResults.filter(r => r.didSpeak).length;
        const accuracy = Math.round((positiveResponses / steps.length) * 100);
        const localId = Date.now().toString();

        const newRecord = {
          id: localId,
          date: new Date().toLocaleDateString(),
          accuracy,
          totalSteps: steps.length,
          synced: false,
        };

        // 1. Save locally first — user always has their data even if offline
        const history = await getHistory();
        await AsyncStorage.setItem(
          'talk-tally-history',
          JSON.stringify([newRecord, ...history])
        );

        analytics.track('session_completed', { accuracy, totalSteps: steps.length });
        logger.info('Session', `Completed. Accuracy: ${accuracy}%`);

        // 2. Attempt backend sync
        try {
          const deviceId = await getDeviceId();
          const result = await syncSession({ deviceId, accuracy, totalSteps: steps.length });

          if (result.success) {
            await markSessionSynced(localId);
            analytics.track('session_synced');
            logger.info('Session', 'Synced to backend');
          } else {
            analytics.track('session_sync_failed', { reason: result.error });
            logger.warn('Session', 'Sync failed — will retry later', result.error);
          }
        } catch (e) {
          analytics.track('session_sync_failed', { reason: 'exception' });
          logger.warn('Session', 'Sync error', e);
        }

        resetSession();
      },

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