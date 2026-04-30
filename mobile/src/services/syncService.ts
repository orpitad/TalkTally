import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory, markSessionSynced, SessionRecord } from '../features/sessionStorage';
import { syncSession } from './apiService';
import { getDeviceId } from './deviceService';

/**
 * Scans local history for sessions with synced: false and retries them.
 * Call this whenever the app comes to the foreground or regains connectivity.
 * Fails silently — never crashes the app.
 */
export const retryUnsyncedSessions = async (): Promise<void> => {
  try {
    const history = await getHistory();
    const unsynced = history.filter((s: SessionRecord) => !s.synced);

    if (unsynced.length === 0) return;

    console.log(`🔄 Retrying ${unsynced.length} unsynced session(s)...`);

    const deviceId = await getDeviceId();

    // Process sequentially to avoid hammering the server
    for (const session of unsynced) {
      const result = await syncSession({
        deviceId,
        accuracy: session.accuracy,
        totalSteps: session.totalSteps,
      });

      if (result.success) {
        await markSessionSynced(session.id);
        console.log(`✅ Synced session ${session.id}`);
      } else {
        console.warn(`⚠️ Still failed to sync ${session.id}:`, result.error);
      }
    }
  } catch (e) {
    console.warn('retryUnsyncedSessions error:', e);
  }
};