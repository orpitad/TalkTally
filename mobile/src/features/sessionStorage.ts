import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StepResult {
  stepId: number;
  instruction: string;
  tip: string;
  didSpeak: boolean;
  timestamp: number;
  recordingPath?: string; // local file path — set when child responded and was recorded
}

export interface SessionRecord {
  id: string;
  date: string;
  accuracy: number;
  totalSteps: number;
  synced: boolean;
  sessionNumber: number;
  sessionTitle: string;
  level: string;
  stepResults: StepResult[];
}

const HISTORY_KEY = 'talk-tally-history';

export const getHistory = async (): Promise<SessionRecord[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
};

export const markSessionSynced = async (localId: string): Promise<void> => {
  try {
    const history = await getHistory();
    const updated = history.map((s) =>
      s.id === localId ? { ...s, synced: true } : s
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to mark session as synced:', e);
  }
};

/**
 * Remove a recording path from a specific step result.
 * Called after the user deletes a recording from the history detail view.
 */
export const clearStepRecordingPath = async (
  sessionId: string,
  stepId: number
): Promise<void> => {
  try {
    const history = await getHistory();
    const updated = history.map((session) => {
      if (session.id !== sessionId) return session;
      return {
        ...session,
        stepResults: session.stepResults.map((step) =>
          step.stepId === stepId ? { ...step, recordingPath: undefined } : step
        ),
      };
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to clear recording path:', e);
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};