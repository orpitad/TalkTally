import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';

export const useVoiceDetection = (sensitivityPadding = 10) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(-160);
  const [threshold, setThreshold] = useState(-45);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };

  const recorder = useAudioRecorder(recordingOptions);

  const meterInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibrationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether the hook is still mounted — prevents calls on a released recorder
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safe wrapper: returns null instead of throwing if recorder is already released
  const safeGetStatus = useCallback(() => {
    try {
      return recorder.getStatus();
    } catch {
      return null;
    }
  }, [recorder]);

  // Safe wrapper: only stops if recorder is still recording
  const safeStop = useCallback(async () => {
    try {
      const status = safeGetStatus();
      if (status?.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Recorder already released — nothing to do
    }
  }, [recorder, safeGetStatus]);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: false,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });
      } catch (err) {
        console.error('Failed to set audio mode:', err);
      }
    };
    initAudio();
  }, []);

  const updateMeter = useCallback(() => {
    if (!isMounted.current) return;
    const status = safeGetStatus();
    if (status?.isRecording) {
      const currentDb = status.metering ?? -160;
      setVolume(currentDb);
      setIsSpeaking(currentDb > threshold);
    }
  }, [safeGetStatus, threshold]);

  const calibrate = useCallback(async () => {
    return new Promise<void>(async (resolve) => {
      try {
        setIsCalibrating(true);

        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          console.error('Microphone permission denied');
          if (isMounted.current) setIsCalibrating(false);
          resolve();
          return;
        }

        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: false,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });

        let noiseSamples: number[] = [];

        await safeStop();
        await new Promise(r => setTimeout(r, 200));

        await recorder.prepareToRecordAsync();
        recorder.record();

        calibrationInterval.current = setInterval(() => {
          if (!isMounted.current) return;
          const status = safeGetStatus();
          const db = status?.metering ?? -160;
          if (db > -160) noiseSamples.push(db);
        }, 100);

        setTimeout(async () => {
          try {
            if (calibrationInterval.current) {
              clearInterval(calibrationInterval.current);
              calibrationInterval.current = null;
            }

            await safeStop();

            if (isMounted.current) {
              if (noiseSamples.length > 0) {
                const peakNoise = Math.max(...noiseSamples);
                const newThreshold = Math.max(-50, peakNoise + sensitivityPadding);
                setThreshold(newThreshold);
                console.log(`Calibration complete. Threshold: ${newThreshold.toFixed(1)}dB`);
              } else {
                console.warn('No audio samples collected during calibration. Using defaults.');
              }
              setIsCalibrating(false);
              setIsReady(true);
            }
            resolve();
          } catch (err) {
            console.error('Error during calibration analysis:', err);
            if (isMounted.current) {
              setIsCalibrating(false);
              setIsReady(true);
            }
            resolve();
          }
        }, 2000);
      } catch (err) {
        console.error('Calibration error:', err);
        if (isMounted.current) setIsCalibrating(false);
        resolve();
      }
    });
  }, [recorder, safeGetStatus, safeStop, sensitivityPadding]);

  const startMonitoring = useCallback(async () => {
    try {
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: false,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });

      await safeStop();
      await new Promise(resolve => setTimeout(resolve, 500));

      await recorder.prepareToRecordAsync();
      await new Promise(resolve => setTimeout(resolve, 300));

      recorder.record();
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!isMounted.current) return false;

      meterInterval.current = setInterval(updateMeter, 100);
      return true;
    } catch (err) {
      console.error('Failed to start monitoring:', err);
      return false;
    }
  }, [recorder, safeStop, updateMeter]);

  const stopMonitoring = useCallback(async () => {
    // Clear intervals first so no further getStatus() calls are made
    if (meterInterval.current) {
      clearInterval(meterInterval.current);
      meterInterval.current = null;
    }
    if (calibrationInterval.current) {
      clearInterval(calibrationInterval.current);
      calibrationInterval.current = null;
    }

    // Then safely stop the recorder — guarded against already-released state
    await safeStop();

    if (isMounted.current) {
      setIsReady(false);
    }
  }, [safeStop]);

  // Cleanup on unmount — clear intervals before component is gone
  useEffect(() => {
    return () => {
      if (meterInterval.current) clearInterval(meterInterval.current);
      if (calibrationInterval.current) clearInterval(calibrationInterval.current);
    };
  }, []);

  return {
    isSpeaking,
    volume,
    threshold,
    isCalibrating,
    isReady,
    calibrate,
    startMonitoring,
    stopMonitoring,
  };
};