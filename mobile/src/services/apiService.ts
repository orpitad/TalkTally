const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';
// 10.0.2.2 is the Android emulator's alias for localhost.
// On a real device, replace with your machine's local IP e.g. http://192.168.1.x:3000
// On iOS simulator, http://localhost:3000 works directly.

export interface SessionPayload {
  deviceId: string;
  accuracy: number;
  totalSteps: number;
}

export interface RemoteSession {
  id: number;
  accuracy: number;
  total_steps: number;
  completed_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * POST /sessions
 * Syncs a completed session to the backend.
 */
export const syncSession = async (
  payload: SessionPayload
): Promise<ApiResponse<RemoteSession>> => {
  try {
    const res = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error ?? 'Server error' };
    }

    return { success: true, data: json.session };
  } catch (e) {
    // Network offline or server unreachable — fail gracefully
    console.warn('syncSession failed (offline?):', e);
    return { success: false, error: 'Network unavailable' };
  }
};

/**
 * GET /sessions?deviceId=xxx
 * Fetches remote session history for this device.
 */
export const fetchRemoteSessions = async (
  deviceId: string
): Promise<ApiResponse<RemoteSession[]>> => {
  try {
    const res = await fetch(
      `${BASE_URL}/sessions?deviceId=${encodeURIComponent(deviceId)}`
    );

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error ?? 'Server error' };
    }

    return { success: true, data: json.sessions };
  } catch (e) {
    console.warn('fetchRemoteSessions failed (offline?):', e);
    return { success: false, error: 'Network unavailable' };
  }
};