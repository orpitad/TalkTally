import React, { useEffect , useState} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../features/useSessionStore';
import { useVoiceDetection } from '../hooks/useVoiceDetection';
import { AudioModule, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export const SessionScreen = ({ navigation }: any) => {
  const { steps, currentStepIndex, nextStep, logResponse } = useSessionStore();
  const [hasStarted, setHasStarted] = useState(false);
  
  // 1. Initialize adaptive voice detection
  const { 
    isSpeaking, 
    volume, 
    isCalibrating, 
    isReady,
    calibrate, 
    startMonitoring, 
    stopMonitoring 
  } = useVoiceDetection(12);
  
  const player = useAudioPlayer(require('../../assets/success.mp3'));
  const currentStep = steps[currentStepIndex];

  // 2. Start-up Sequence: Calibrate THEN Monitor
  useEffect(() => {
    const sequence = async () => {
      try {
        console.log('🚀 Session starting - calibrating...');
        await calibrate();
        console.log('✅ Calibration done');
        
        // Add longer delay between calibration and monitoring to ensure clean state
        console.log('⏳ Waiting for recorder to stabilize...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🎙️ Starting monitoring...');
        const success = await startMonitoring();
        if (success) {
          console.log('✨ Session ready - monitoring active');
          setHasStarted(true);
        } else {
          console.error('❌ Failed to start monitoring');
        }
      } catch (err) {
        console.error('❌ Startup sequence error:', err);
      }
    };
    sequence();
    
    return () => {
      stopMonitoring();
    };
  }, []);

  // 3. Monitor microphone health after full startup
  useEffect(() => {
    if (!hasStarted || isCalibrating) return; // Don't check until ready
    
    const checkHardware = setTimeout(() => {
      if (volume === -160 && isReady) {
        console.warn('⚠️ Microphone not responding after startup. Volume still at -160dB');
        console.warn(`Debug - isReady: ${isReady}, isCalibrating: ${isCalibrating}, volume: ${volume}`);
        alert("Microphone not responding. Please check app permissions or restart the app.");
      }
    }, 12000); // Wait 12 seconds total (2s calibration + 10s monitoring buffer)

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

  // 4. Show calibration screen while calibrating
  if (isCalibrating) {
    return (
      <View style={styles.calibrationOverlay}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.calibTitle}>Calibrating...</Text>
        <Text style={styles.calibSub}>Shhh! I'm checking the room noise so I can hear your child better.</Text>
      </View>
    );
  }

  // 5. Guard: Make sure we have steps and current step
  if (!currentStep || !steps || steps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: No session steps loaded</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ... (Your existing progress bar and header JSX) */}
      <View style={styles.header}>
         <Text style={styles.counterText}>PROMPT {currentStepIndex + 1} OF {steps.length}</Text>
         <View style={styles.visualizer}>
            <View style={[styles.indicatorPill, isSpeaking && styles.indicatorPillActive]}>
                <Text style={styles.indicatorText}>{isSpeaking ? "🗣️ I HEAR YOU!" : "👂 LISTENING..."}</Text>
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  progressWrapper: { height: 6, backgroundColor: '#E2E8F0', width: '100%' },
  progressBar: { height: '100%', backgroundColor: '#10B981' },
  header: { padding: 20, alignItems: 'center' },
  counterText: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  visualizer: { height: 140, justifyContent: 'center', alignItems: 'center', width: '100%' },
  pulseCircle: { position: 'absolute', width: 85, height: 85, borderRadius: 45, backgroundColor: '#10B981', opacity: 0.2 },
  indicatorPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  indicatorPillActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1 },
  indicatorEmoji: { fontSize: 18, marginRight: 8 },
  indicatorText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  mainCard: { flex: 1, marginHorizontal: 25, backgroundColor: '#FFF', borderRadius: 28, padding: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15 },
  instructionText: { fontSize: 32, fontWeight: '900', textAlign: 'center', color: '#1E293B', lineHeight: 42 },
  errorText: { fontSize: 16, color: '#DC2626', textAlign: 'center' },
  coachBox: { marginTop: 30, backgroundColor: '#F0F9FF', padding: 15, borderRadius: 18, width: '100%' },
  coachTitle: { fontSize: 10, fontWeight: '900', color: '#0369A1', marginBottom: 4 },
  coachText: { fontSize: 14, color: '#0C4A6E', lineHeight: 20 },
  footer: { padding: 25, gap: 12 },
  primaryBtn: { backgroundColor: '#10B981', height: 80, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 10 },
  primaryBtnText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  subBtnText: { color: '#D1FAE5', fontSize: 12, fontWeight: '600' },
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
});