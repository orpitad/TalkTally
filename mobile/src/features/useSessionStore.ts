import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionStep } from './sessionData';
import { getHistory, markSessionSynced, StepResult } from './sessionStorage';
import { syncSession } from '../services/apiService';
import { getDeviceId } from '../services/deviceService';
import { logger } from '../services/logger';
import { analytics } from '../services/analytics';

interface ResponseRecord {
  stepId: number;
  didSpeak: boolean;
  timestamp: number;
  recordingPath?: string; // saved after child responds
}

interface SessionMeta {
  sessionNumber: number;
  sessionTitle: string;
  level: string;
}

interface SessionState {
  steps: SessionStep[];
  currentStepIndex: number;
  sessionResults: ResponseRecord[];
  sessionMeta: SessionMeta;
  setSteps: (steps: SessionStep[]) => void;
  setSessionMeta: (meta: SessionMeta) => void;
  logResponse: (stepId: number, didSpeak: boolean, recordingPath?: string) => void;
  nextStep: () => boolean;
  resetSession: () => void;
  completeSession: () => Promise<void>;
}

const DEFAULT_META: SessionMeta = {
  sessionNumber: 1,
  sessionTitle: '',
  level: 'Beginner',
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      steps: [],
      currentStepIndex: 0,
      sessionResults: [],
      sessionMeta: DEFAULT_META,

      setSteps: (steps: SessionStep[]) => set({ steps }),
      setSessionMeta: (meta: SessionMeta) => set({ sessionMeta: meta }),

      logResponse: (stepId, didSpeak, recordingPath) => {
        analytics.track(
          didSpeak ? 'session_step_responded' : 'session_step_skipped',
          { stepId }
        );
        set((state) => ({
          sessionResults: [
            ...state.sessionResults,
            { stepId, didSpeak, timestamp: Date.now(), recordingPath },
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
        const { sessionResults, steps, sessionMeta, resetSession } = get();

        if (sessionResults.length === 0) {
          resetSession();
          return;
        }

        const positiveResponses = sessionResults.filter(r => r.didSpeak).length;
        const accuracy = Math.round((positiveResponses / steps.length) * 100);
        const localId = Date.now().toString();

        // Build per-step breakdown including recording paths
        const stepResults: StepResult[] = steps.map((step) => {
          const result = sessionResults.find(r => r.stepId === step.id);
          return {
            stepId:        step.id,
            instruction:   step.instruction,
            tip:           step.tip,
            didSpeak:      result?.didSpeak ?? false,
            timestamp:     result?.timestamp ?? Date.now(),
            recordingPath: result?.recordingPath,
          };
        });

        const newRecord = {
          id:            localId,
          date:          new Date().toLocaleDateString(),
          accuracy,
          totalSteps:    steps.length,
          synced:        false,
          sessionNumber: sessionMeta.sessionNumber,
          sessionTitle:  sessionMeta.sessionTitle,
          level:         sessionMeta.level,
          stepResults,
        };

        // Save locally first
        const history = await getHistory();
        await AsyncStorage.setItem(
          'talk-tally-history',
          JSON.stringify([newRecord, ...history])
        );

        analytics.track('session_completed', { accuracy, totalSteps: steps.length });
        logger.info('Session', `Completed. Accuracy: ${accuracy}%`);

        // Sync to backend
        try {
          const deviceId = await getDeviceId();
          const result = await syncSession({ deviceId, accuracy, totalSteps: steps.length });
          if (result.success) {
            await markSessionSynced(localId);
            logger.info('Session', 'Synced to backend');
          } else {
            logger.warn('Session', 'Sync failed', result.error);
          }
        } catch (e) {
          logger.warn('Session', 'Sync error', e);
        }

        resetSession();
      },

      resetSession: () =>
        set({
          currentStepIndex: 0,
          sessionResults: [],
          steps: [],
          sessionMeta: DEFAULT_META,
        }),
    }),
    {
      name: 'talk-tally-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);