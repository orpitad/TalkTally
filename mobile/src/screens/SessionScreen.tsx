import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useSessionStore } from '../features/useSessionStore';
import { useVoiceDetection } from '../hooks/useVoiceDetection';
import { useAudioPlayer, useAudioRecorder, RecordingPresets } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { saveRecording } from '../services/recordingService';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Session'>;
};

type ActionHandler = (didSpeak: boolean, fromTimer?: boolean) => Promise<void>;

const STEP_TIMEOUT_SECONDS = 30;

export const SessionScreen = ({ navigation }: Props) => {
  const { steps, currentStepIndex, nextStep, logResponse, sessionMeta } = useSessionStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [micError, setMicError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(STEP_TIMEOUT_SECONDS);
  const [isRecordingChild, setIsRecordingChild] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(STEP_TIMEOUT_SECONDS);
  const isHandlingAction = useRef(false);
  const sessionIdRef = useRef(Date.now().toString());

  // Tracks whether we've started recording for the CURRENT step
  // Reset explicitly in cleanupStepRecording() — not just on step index change
  const hasStartedChildRecording = useRef(false);

  const handleActionRef = useRef<ActionHandler>(async () => {});

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const recordingLoop = useRef<Animated.CompositeAnimation | null>(null);

  const {
    isSpeaking, volume, isCalibrating, isReady,
    calibrate, startMonitoring, stopMonitoring,
  } = useVoiceDetection(12);

  const childRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: false,
  });

  const player = useAudioPlayer(require('../../assets/success.mp3'));
  const currentStep = steps[currentStepIndex];

  // ─── Cleanup child recorder between steps ────────────────────────────────
  // Called BEFORE advancing to the next step.
  // Stops any active recording and resets state so the next step starts fresh.
  const cleanupStepRecording = useCallback(async () => {
    try {
      if (childRecorder.isRecording) {
        await childRecorder.stop();
      }
    } catch (e) {
      console.warn('Cleanup stop error:', e);
    }
    setIsRecordingChild(false);
    hasStartedChildRecording.current = false;
  }, [childRecorder]);

  // ─── Start child recording ────────────────────────────────────────────────
  const startChildRecording = useCallback(async () => {
    try {
      // Always prepare fresh — required after every stop()
      await childRecorder.prepareToRecordAsync();
      childRecorder.record();
      setIsRecordingChild(true);
      console.log('🎙 Child recording started for step', currentStep?.id);
    } catch (e) {
      console.warn('Could not start child recording:', e);
      hasStartedChildRecording.current = false; // allow retry
    }
  }, [childRecorder, currentStep]);

  // ─── Stop and save child recording ───────────────────────────────────────
  const stopAndSaveChildRecording = useCallback(async (): Promise<string | undefined> => {
    try {
      if (childRecorder.isRecording) {
        await childRecorder.stop();
        setIsRecordingChild(false);

        const uri: string | undefined = (childRecorder as any).uri ?? undefined;
        if (uri) {
          const saved = await saveRecording(uri, sessionIdRef.current, currentStep.id);
          console.log('💾 Recording saved:', saved);
          return saved ?? undefined;
        }
      }
    } catch (e) {
      console.warn('Could not stop/save child recording:', e);
    }
    setIsRecordingChild(false);
    return undefined;
  }, [childRecorder, currentStep]);

  // ─── Watch isSpeaking — start recording on first detection per step ──────
  useEffect(() => {
    if (!hasStarted || isCalibrating || isHandlingAction.current) return;
    if (isSpeaking && !hasStartedChildRecording.current) {
      hasStartedChildRecording.current = true;
      startChildRecording();
    }
  }, [isSpeaking, hasStarted, isCalibrating, startChildRecording]);

  // ─── Action handler ───────────────────────────────────────────────────────
  const handleAction = useCallback<ActionHandler>(
    async (didSpeak, fromTimer = false) => {
      if (isHandlingAction.current) return;
      isHandlingAction.current = true;

      // Stop timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        let recordingPath: string | undefined;

        if (didSpeak && !fromTimer) {
          // Save the recording before advancing
          recordingPath = await stopAndSaveChildRecording();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (player) player.play();
        } else {
          // Discard — cleanup without saving
          await cleanupStepRecording();
        }

        logResponse(currentStep.id, didSpeak, recordingPath);
        const hasMore = nextStep();

        if (!hasMore) {
          await stopMonitoring();
          navigation.navigate('SessionComplete');
        } else {
          // FIX: explicitly reset recording state for the next step
          // This runs AFTER nextStep() so currentStepIndex has already incremented
          await cleanupStepRecording();
        }
      } finally {
        setTimeout(() => { isHandlingAction.current = false; }, 500);
      }
    },
    [
      currentStep, logResponse, nextStep, stopMonitoring, navigation,
      player, stopAndSaveChildRecording, cleanupStepRecording,
    ]
  );

  useEffect(() => {
    handleActionRef.current = handleAction;
  }, [handleAction]);

  // ─── Startup sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    const sequence = async () => {
      try {
        await calibrate();
        await new Promise(r => setTimeout(r, 1000));
        const success = await startMonitoring();
        if (success) setHasStarted(true);
        else setMicError(true);
      } catch {
        setMicError(true);
      }
    };
    sequence();
    return () => {
      stopMonitoring();
      // Clean up child recorder on unmount
      if (childRecorder.isRecording) {
        childRecorder.stop().catch(() => {});
      }
    };
  }, []);

  // ─── Mic health check ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || isCalibrating) return;
    const check = setTimeout(() => {
      if (volume === -160 && isReady) setMicError(true);
    }, 12000);
    return () => clearTimeout(check);
  }, [volume, hasStarted, isCalibrating, isReady]);

  // ─── Mic pulse animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isSpeaking) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseLoop.current?.stop(); };
  }, [isSpeaking]);

  // ─── Recording blink animation ────────────────────────────────────────────
  useEffect(() => {
    if (isRecordingChild) {
      recordingLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      recordingLoop.current.start();
    } else {
      recordingLoop.current?.stop();
      recordingAnim.setValue(1);
    }
    return () => { recordingLoop.current?.stop(); };
  }, [isRecordingChild]);

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return;
    secondsRef.current = STEP_TIMEOUT_SECONDS;
    setSecondsLeft(STEP_TIMEOUT_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);
      if (secondsRef.current <= 0) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        handleActionRef.current(false, true);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStepIndex, hasStarted]);

  const getTimerColor = () => {
    if (secondsLeft > 20) return Colors.success;
    if (secondsLeft > 10) return Colors.warning;
    return Colors.danger;
  };

  // ─── Error / calibration / guard screens ─────────────────────────────────
  if (micError) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorIcon}>🎤</Text>
        <Text style={styles.errorTitle}>Microphone not responding</Text>
        <Text style={styles.errorBody}>
          Please check microphone permissions in your device settings, then restart the app.
        </Text>
      </View>
    );
  }

  if (isCalibrating) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.calibTitle}>Calibrating...</Text>
        <Text style={styles.calibSub}>
          Shhh! Checking room noise so I can hear your child better.
        </Text>
      </View>
    );
  }

  if (!currentStep || steps.length === 0) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorTitle}>No session steps loaded</Text>
        <Text style={styles.errorBody}>Please go back and start a new session.</Text>
      </View>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.counterText}>
            PROMPT {currentStepIndex + 1} OF {steps.length}
          </Text>
          <Text style={styles.sessionTitle}>{sessionMeta.sessionTitle}</Text>
        </View>
        <View style={styles.timerWrapper}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>{secondsLeft}</Text>
          <Text style={styles.timerLabel}>sec</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {
          width: `${(currentStepIndex / steps.length) * 100}%` as any,
        }]} />
      </View>

      <View style={styles.micWrapper}>
        <Animated.View style={[styles.micPulseOuter, {
          transform: [{ scale: pulseAnim }],
          backgroundColor: isSpeaking ? Colors.primaryLight : Colors.surfaceMuted,
        }]}>
          <View style={[styles.micPulseInner, isSpeaking && styles.micPulseInnerActive]}>
            <Text style={styles.micEmoji}>🎤</Text>
          </View>
        </Animated.View>
        <Text style={[styles.micLabel, isSpeaking && styles.micLabelActive]}>
          {isSpeaking ? 'I HEAR YOU!' : 'LISTENING...'}
        </Text>
        {isRecordingChild && (
          <View style={styles.recordingBadge}>
            <Animated.View style={[styles.recordingDot, { opacity: recordingAnim }]} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.instructionText}>{currentStep.instruction}</Text>
        {currentStep.tip ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>💡 TIP</Text>
            <Text style={styles.tipText}>{currentStep.tip}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => handleAction(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>✓  Child Responded</Text>
          {isRecordingChild && (
            <Text style={styles.primaryBtnSub}>Recording will be saved</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => handleAction(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>No response — skip</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  counterText: { fontSize: 11, fontWeight: '900', color: Colors.inkFaint, letterSpacing: 1.5 },
  sessionTitle: { fontSize: 13, fontWeight: '600', color: Colors.inkLight, marginTop: 2 },
  timerWrapper: { alignItems: 'center' },
  timerText: { fontSize: 28, fontWeight: '900' },
  timerLabel: { fontSize: 10, color: Colors.inkFaint, fontWeight: '600', marginTop: -4 },
  progressTrack: {
    height: 4, backgroundColor: Colors.surfaceMuted, marginHorizontal: Spacing.lg,
    borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  micWrapper: { alignItems: 'center', marginVertical: Spacing.md },
  micPulseOuter: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  micPulseInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  micPulseInnerActive: { backgroundColor: Colors.primary },
  micEmoji: { fontSize: 26 },
  micLabel: { fontSize: 12, fontWeight: '800', color: Colors.inkFaint, letterSpacing: 1.2 },
  micLabelActive: { color: Colors.primary },
  recordingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dangerLight, paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: Radius.full, marginTop: Spacing.sm,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  recordingText: { fontSize: 12, fontWeight: '700', color: Colors.danger },
  mainCard: {
    flex: 1, marginHorizontal: Spacing.lg, backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl, padding: Spacing.lg, justifyContent: 'center',
    ...Shadow.md, borderWidth: 1, borderColor: Colors.border,
  },
  instructionText: {
    fontSize: 28, fontWeight: '900', textAlign: 'center',
    color: Colors.ink, lineHeight: 38, marginBottom: Spacing.lg,
  },
  tipBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.md },
  tipLabel: { fontSize: 10, fontWeight: '900', color: Colors.primaryDark, marginBottom: 4, letterSpacing: 1 },
  tipText: { fontSize: 14, color: Colors.primaryDark, lineHeight: 20 },
  footer: { padding: Spacing.lg, gap: Spacing.sm },
  primaryBtn: {
    backgroundColor: Colors.primary, minHeight: 72, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', ...Shadow.lg, paddingVertical: Spacing.md,
  },
  primaryBtnText: { color: '#FFF', fontSize: 19, fontWeight: '800' },
  primaryBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  secondaryBtn: { padding: Spacing.md, alignItems: 'center' },
  secondaryBtnText: { color: Colors.inkFaint, fontSize: 15, fontWeight: '700' },
  centeredScreen: {
    flex: 1, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  errorIcon: { fontSize: 48, marginBottom: Spacing.lg },
  errorTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink, marginBottom: Spacing.sm, textAlign: 'center' },
  errorBody: { fontSize: 15, color: Colors.inkFaint, textAlign: 'center', lineHeight: 22 },
  calibTitle: { fontSize: 24, fontWeight: '900', color: Colors.ink, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  calibSub: { fontSize: 16, color: Colors.inkFaint, textAlign: 'center', lineHeight: 22 },
});