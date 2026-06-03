import * as FileSystem from 'expo-file-system/legacy';

const getRecordingsDir = (): string =>
  `${FileSystem.documentDirectory}talktally-recordings/`;

export const ensureRecordingsDir = async (): Promise<void> => {
  const dir = getRecordingsDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

export const getRecordingPath = (sessionId: string, stepId: number): string =>
  `${getRecordingsDir()}session_${sessionId}_step_${stepId}.m4a`;

export const saveRecording = async (
  tempUri: string,
  sessionId: string,
  stepId: number
): Promise<string | null> => {
  try {
    await ensureRecordingsDir();
    const destPath = getRecordingPath(sessionId, stepId);
    await FileSystem.moveAsync({ from: tempUri, to: destPath });
    return destPath;
  } catch (e) {
    console.error('Failed to save recording:', e);
    return null;
  }
};

export const deleteRecording = async (filePath: string): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
    return true;
  } catch (e) {
    console.error('Failed to delete recording:', e);
    return false;
  }
};

export const getRecordingsStorageSize = async (): Promise<number> => {
  try {
    await ensureRecordingsDir();
    const dir = getRecordingsDir();
    const files = await FileSystem.readDirectoryAsync(dir);
    let totalBytes = 0;
    for (const file of files) {
      // Don't pass { size: true } — not in types. size is still present at runtime.
      const info = await FileSystem.getInfoAsync(`${dir}${file}`);
      if (info.exists) {
        totalBytes += (info as any).size ?? 0;
      }
    }
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  } catch {
    return 0;
  }
};

export const recordingExists = async (filePath: string): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    return info.exists;
  } catch {
    return false;
  }
};