import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'talk-tally-device-id';

/**
 * Returns a stable unique ID for this device.
 * Generated once on first launch and persisted forever via AsyncStorage.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const newId = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch (e) {
    console.error('Failed to get device ID:', e);
    // Fallback: non-persistent ID so the app never hard-crashes
    return `fallback-${Date.now()}`;
  }
};