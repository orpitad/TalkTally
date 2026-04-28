import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';

export const useVoiceDetection = (sensitivityPadding = 10) => {
  // 1. State Management
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(-160);
  const [threshold, setThreshold] = useState(-45);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Create custom recording options with metering EXPLICITLY enabled
  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,  // ✅ EXPLICITLY ENABLE
  };
  
  const recorder = useAudioRecorder(recordingOptions);
  
  const meterInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibrationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio mode on component mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('🔊 Initializing audio mode...');
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: false,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });
        console.log('✅ Audio mode initialized');
      } catch (err) {
        console.error('❌ Failed to set audio mode:', err);
      }
    };
    initAudio();
  }, []);

  // 2. Logic: Sampling the volume - USE DIRECT getStatus()
  const updateMeter = useCallback(() => {
    const status = recorder.getStatus();
    if (status?.isRecording) {
      const currentDb = status.metering ?? -160;
      
      if (currentDb > -160) {
        console.log(`📊 Metering: ${currentDb.toFixed(1)}dB, Threshold: ${threshold.toFixed(1)}dB, Speaking: ${currentDb > threshold}`);
      }
      
      setVolume(currentDb);
      setIsSpeaking(currentDb > threshold);
    }
  }, [recorder, threshold]);

  // 3. Calibration Engine - FIX: Ensure permissions and audio mode first
  const calibrate = useCallback(async () => {
    return new Promise<void>(async (resolve) => {
      try {
        setIsCalibrating(true);
        console.log('🎤 Requesting microphone permission...');
        
        // REQUEST PERMISSIONS FIRST
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          console.error('❌ Microphone permission denied');
          setIsCalibrating(false);
          resolve();
          return;
        }
        console.log('✅ Microphone permission granted');

        // SET AUDIO MODE BEFORE RECORDING
        console.log('🔊 Setting audio mode...');
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: false,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });

        console.log('Starting calibration...');
        
        let noiseSamples: number[] = [];

        // Stop any previous recording
        if (recorder.getStatus().isRecording) {
          console.log('🛑 Stopping previous calibration recording...');
          await recorder.stop();
          await new Promise(r => setTimeout(r, 200));
        }

        // Prepare and start recording
        console.log('🔧 Preparing recorder for calibration...');
        await recorder.prepareToRecordAsync();
        console.log('▶️ Starting calibration recording...');
        recorder.record();

        // Collect samples for 2 seconds
        calibrationInterval.current = setInterval(() => {
          const status = recorder.getStatus();
          const db = status?.metering ?? -160;
          if (db > -160) {
            noiseSamples.push(db);
            console.log(`📈 Calibration sample: ${db.toFixed(1)}dB`);
          }
        }, 100);

        // Wait 2 seconds then analyze
        setTimeout(async () => {
          try {
            if (calibrationInterval.current) {
              clearInterval(calibrationInterval.current);
              calibrationInterval.current = null;
            }

            // Stop the calibration recording
            console.log('🛑 Stopping calibration recording...');
            if (recorder.getStatus().isRecording) {
              await recorder.stop();
            }

            if (noiseSamples.length > 0) {
              const avgNoise = noiseSamples.reduce((a, b) => a + b) / noiseSamples.length;
              const peakNoise = Math.max(...noiseSamples);
              const newThreshold = Math.max(-50, peakNoise + sensitivityPadding);
              
              setThreshold(newThreshold);
              console.log(`✅ Calibration Complete. Samples: ${noiseSamples.length}, Peak: ${peakNoise.toFixed(1)}dB, Threshold: ${newThreshold.toFixed(1)}dB`);
            } else {
              console.warn('⚠️ No audio samples collected during calibration. Using defaults.');
              console.log(`Threshold set to: ${threshold.toFixed(1)}dB`);
            }

            setIsCalibrating(false);
            setIsReady(true);
            resolve();
          } catch (err) {
            console.error('Error during calibration analysis:', err);
            setIsCalibrating(false);
            setIsReady(true);
            resolve();
          }
        }, 2000);
      } catch (err) {
        console.error('❌ Calibration error:', err);
        setIsCalibrating(false);
        resolve();
      }
    });
  }, [recorder, sensitivityPadding, threshold]);

  // 4. Lifecycle Management - FIX: Better state management between calibration and monitoring
  const startMonitoring = useCallback(async () => {
    try {
      console.log('🎙️ Starting monitoring...');
      
      // Ensure audio mode is set
      console.log('🔊 Ensuring audio mode...');
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: false,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });

      // Stop any previous recording
      const currentStatus = recorder.getStatus();
      console.log(`Current status - isRecording: ${currentStatus?.isRecording}, canRecord: ${currentStatus?.canRecord}`);
      
      if (currentStatus?.isRecording) {
        console.log('🛑 Stopping previous recording...');
        await recorder.stop();
        // CRITICAL: Longer delay to ensure recorder fully stops
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Reset recorder state with fresh prepare
      console.log('🔧 Preparing recorder for monitoring...');
      await recorder.prepareToRecordAsync();
      
      // Delay after prepare to let it stabilize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('▶️ Starting record for monitoring...');
      recorder.record();
      
      // Check status immediately after record
      const statusAfterRecord = recorder.getStatus();
      console.log(`After record - isRecording: ${statusAfterRecord?.isRecording}, metering available: ${statusAfterRecord?.metering !== undefined}, metering value: ${statusAfterRecord?.metering}`);
      
      // CRITICAL: Give recording time to stabilize metering
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Verify metering is working before starting loop
      const verifyStatus = recorder.getStatus();
      console.log(`Before meter loop - metering value: ${verifyStatus?.metering}, isRecording: ${verifyStatus?.isRecording}`);
      
      // Start the meter loop
      console.log('📊 Starting meter polling...');
      meterInterval.current = setInterval(updateMeter, 100);
      
      console.log('✅ Monitoring started - meter loop active');
      return true;
    } catch (err) {
      console.error('❌ Failed to start monitoring:', err);
      return false;
    }
  }, [recorder, updateMeter]);

  const stopMonitoring = useCallback(async () => {
    try {
      if (meterInterval.current) {
        clearInterval(meterInterval.current);
        meterInterval.current = null;
      }
      if (calibrationInterval.current) {
        clearInterval(calibrationInterval.current);
        calibrationInterval.current = null;
      }
      if (recorder.getStatus().isRecording) {
        await recorder.stop();
      }
      setIsReady(false);
      console.log('✅ Monitoring stopped');
    } catch (err) {
      console.error('Error stopping monitoring:', err);
    }
  }, [recorder]);

  // Cleanup on unmount
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