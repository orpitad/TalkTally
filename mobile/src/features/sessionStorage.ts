import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionRecord {
  id: string;
  date: string;
  accuracy: number;
  totalSteps: number;
  synced: boolean;
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

/**
 * Flips synced: true for a session by its local ID.
 * Called after a successful POST to the backend.
 */
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

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};