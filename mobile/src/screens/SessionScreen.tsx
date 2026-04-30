import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useSessionStore } from '../features/useSessionStore';
import { useVoiceDetection } from '../hooks/useVoiceDetection';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Session'>;
};

const STEP_TIMEOUT_SECONDS = 30;

export const SessionScreen = ({ navigation }: Props) => {
  const { steps, currentStepIndex, nextStep, logResponse } = useSessionStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [micError, setMicError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(STEP_TIMEOUT_SECONDS);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(STEP_TIMEOUT_SECONDS); // mirrors secondsLeft without closure issues
  const isHandlingAction = useRef(false);           // debounce guard

  // ─── Mic pulse animation ──────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Voice detection ──────────────────────────────────────────────────────
  const {
    isSpeaking,
    volume,
    isCalibrating,
    isReady,
    calibrate,
    startMonitoring,
    stopMonitoring,
  } = useVoiceDetection(12);

  const player = useAudioPlayer(require('../../assets/success.mp3'));
  const currentStep = steps[currentStepIndex];

  // ─── Action handler (debounced) ───────────────────────────────────────────
  // Defined before the timer effect so the timer can reference it via a ref
  const handleAction = useCallback(
    async (didSpeak: boolean, fromTimer = false) => {
      if (isHandlingAction.current) return;
      isHandlingAction.current = true;

      // Stop the timer immediately so it can't fire again mid-action
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        if (didSpeak && !fromTimer) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (player) player.play();
        }

        logResponse(currentStep.id, didSpeak);
        const hasMore = nextStep();

        if (!hasMore) {
          await stopMonitoring();
          navigation.navigate('SessionComplete');
        }
      } finally {
        setTimeout(() => {
          isHandlingAction.current = false;
        }, 500);
      }
    },
    [currentStep, logResponse, nextStep, stopMonitoring, navigation, player]
  );

  // Keep a stable ref to handleAction so the timer interval can always call
  // the latest version without needing to be recreated
  const handleActionRef = useRef(handleAction);
  useEffect(() => {
    handleActionRef.current = handleAction;
  }, [handleAction]);

  // ─── Startup sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    const sequence = async () => {
      try {
        await calibrate();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const success = await startMonitoring();
        if (success) {
          setHasStarted(true);
        } else {
          setMicError(true);
        }
      } catch (err) {
        console.error('Startup error:', err);
        setMicError(true);
      }
    };
    sequence();
    return () => { stopMonitoring(); };
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

  // ─── Countdown timer ──────────────────────────────────────────────────────
  // FIX: never call handleAction() from inside setSecondsLeft().
  // Instead, the interval decrements a ref each tick and calls handleAction
  // via handleActionRef only when the ref hits zero — outside of any setState.
  useEffect(() => {
    if (!hasStarted) return;

    // Reset both the display state and the ref
    secondsRef.current = STEP_TIMEOUT_SECONDS;
    setSecondsLeft(STEP_TIMEOUT_SECONDS);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current); // update display — safe, not inside another setState

      if (secondsRef.current <= 0) {
        // Time's up — clear interval first, then handle action outside setState
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        handleActionRef.current(false, true); // log no-response, advance step
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStepIndex, hasStarted]);

  // ─── Timer colour ─────────────────────────────────────────────────────────
  const getTimerColor = () => {
    if (secondsLeft > 20) return '#10B981';
    if (secondsLeft > 10) return '#F59E0B';
    return '#EF4444';
  };

  // ─── Screens: error / calibrating / no steps ─────────────────────────────
  if (micError) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorIcon}>🎤</Text>
        <Text style={styles.errorTitle}>Microphone not responding</Text>
        <Text style={styles.errorBody}>
          Please check that the app has microphone permission in your device
          settings, then restart the app.
        </Text>
      </View>
    );
  }

  if (isCalibrating) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.calibTitle}>Calibrating...</Text>
        <Text style={styles.calibSub}>
          Shhh! I'm checking the room noise so I can hear your child better.
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.counterText}>
          PROMPT {currentStepIndex + 1} OF {steps.length}
        </Text>
        <View style={styles.timerWrapper}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>
            {secondsLeft}
          </Text>
          <Text style={styles.timerLabel}>sec</Text>
        </View>
      </View>

      {/* Mic indicator */}
      <View style={styles.micWrapper}>
        <Animated.View
          style={[
            styles.micPulseOuter,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: isSpeaking ? '#D1FAE5' : '#F1F5F9',
            },
          ]}
        >
          <View style={[styles.micPulseInner, isSpeaking && styles.micPulseInnerActive]}>
            <Text style={styles.micEmoji}>🎤</Text>
          </View>
        </Animated.View>
        <Text style={[styles.micLabel, isSpeaking && styles.micLabelActive]}>
          {isSpeaking ? 'I HEAR YOU!' : 'LISTENING...'}
        </Text>
      </View>

      {/* Instruction card */}
      <View style={styles.mainCard}>
        <Text style={styles.instructionText}>{currentStep.instruction}</Text>
        {currentStep.tip ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>💡 TIP</Text>
            <Text style={styles.tipText}>{currentStep.tip}</Text>
          </View>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => handleAction(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>✓  Child Responded</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 6,
  },
  counterText: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  timerWrapper: { alignItems: 'center' },
  timerText: { fontSize: 28, fontWeight: '900' },
  timerLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: -4 },
  micWrapper: { alignItems: 'center', marginVertical: 16 },
  micPulseOuter: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  micPulseInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },
  micPulseInnerActive: { backgroundColor: '#10B981' },
  micEmoji: { fontSize: 26 },
  micLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2 },
  micLabelActive: { color: '#10B981' },
  mainCard: {
    flex: 1, marginHorizontal: 25, backgroundColor: '#FFF',
    borderRadius: 28, padding: 28, justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15,
  },
  instructionText: {
    fontSize: 30, fontWeight: '900', textAlign: 'center',
    color: '#1E293B', lineHeight: 40, marginBottom: 20,
  },
  tipBox: { backgroundColor: '#F0F9FF', borderRadius: 14, padding: 14 },
  tipLabel: { fontSize: 10, fontWeight: '900', color: '#0369A1', marginBottom: 4, letterSpacing: 1 },
  tipText: { fontSize: 14, color: '#0C4A6E', lineHeight: 20 },
  footer: { padding: 25, gap: 10 },
  primaryBtn: {
    backgroundColor: '#10B981', height: 72, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.25, shadowRadius: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 19, fontWeight: '800' },
  secondaryBtn: { padding: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '700' },
  centeredScreen: {
    flex: 1, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 10, textAlign: 'center' },
  errorBody: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  calibTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  calibSub: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});