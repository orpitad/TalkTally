import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Define the shape of a single History record
export interface SessionRecord {
  id: string;
  date: string;
  accuracy: number;
  totalSteps: number;
}

// 2. The key must match what we use in useSessionStore.ts
const HISTORY_KEY = 'talk-tally-history';

/**
 * Retrieves all saved sessions from the phone's local storage.
 * Used by the HistoryScreen to display progress over time.
 */
export const getHistory = async (): Promise<SessionRecord[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load history from storage:', e);
    return [];
  }
};

/**
 * Utility to completely clear history if the user wants a fresh start.
 */
export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};