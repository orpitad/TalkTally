import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

export const SessionScreen = ({ navigation }: Props) => {
  const { steps, currentStepIndex, nextStep, logResponse } = useSessionStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [micError, setMicError] = useState(false);

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

  // Start-up sequence: calibrate then monitor
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
        console.error('Startup sequence error:', err);
        setMicError(true);
      }
    };
    sequence();

    return () => {
      stopMonitoring();
    };
  }, []);

  // Monitor microphone health after full startup — show in-UI error instead of alert()
  useEffect(() => {
    if (!hasStarted || isCalibrating) return;

    const checkHardware = setTimeout(() => {
      if (volume === -160 && isReady) {
        setMicError(true);
      }
    }, 12000);

    return () => clearTimeout(checkHardware);
  }, [volume, hasStarted, isCalibrating, isReady]);

  const handleAction = async (didSpeak: boolean) => {
    if (didSpeak) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (player) player.play();
    }

    logResponse(currentStep.id, didSpeak);
    const hasMore = nextStep();

    if (!hasMore) {
      await stopMonitoring();
      navigation.navigate('SessionComplete');
    }
  };

  // Mic error state — shown in-UI instead of a blocking alert()
  if (micError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎤</Text>
        <Text style={styles.errorTitle}>Microphone not responding</Text>
        <Text style={styles.errorBody}>
          Please check that the app has microphone permission in your device settings, then restart the app.
        </Text>
      </View>
    );
  }

  // Calibration overlay
  if (isCalibrating) {
    return (
      <View style={styles.calibrationOverlay}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.calibTitle}>Calibrating...</Text>
        <Text style={styles.calibSub}>
          Shhh! I'm checking the room noise so I can hear your child better.
        </Text>
      </View>
    );
  }

  // Guard: ensure steps are loaded
  if (!currentStep || steps.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>No session steps loaded</Text>
        <Text style={styles.errorBody}>Please go back and start a new session.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.counterText}>
          PROMPT {currentStepIndex + 1} OF {steps.length}
        </Text>
        <View style={styles.visualizer}>
          <View style={[styles.indicatorPill, isSpeaking && styles.indicatorPillActive]}>
            <Text style={styles.indicatorText}>
              {isSpeaking ? '🗣️ I HEAR YOU!' : '👂 LISTENING...'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.instructionText}>{currentStep.instruction}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(true)}>
          <Text style={styles.primaryBtnText}>Child Responded</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleAction(false)}>
          <Text style={styles.secondaryBtnText}>No response — skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, alignItems: 'center' },
  counterText: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  visualizer: { height: 140, justifyContent: 'center', alignItems: 'center', width: '100%' },
  indicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  indicatorPillActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1 },
  indicatorText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  mainCard: {
    flex: 1,
    marginHorizontal: 25,
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  instructionText: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1E293B',
    lineHeight: 42,
  },
  footer: { padding: 25, gap: 12 },
  primaryBtn: {
    backgroundColor: '#10B981',
    height: 80,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  secondaryBtn: { padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '700' },
  calibrationOverlay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  calibTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  calibSub: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});