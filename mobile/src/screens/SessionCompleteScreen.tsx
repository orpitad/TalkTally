import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useSessionStore } from '../features/useSessionStore';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SessionComplete'>;
};

export const SessionCompleteScreen = ({ navigation }: Props) => {
  const completeSession = useSessionStore((state) => state.completeSession);
  const resetSession = useSessionStore((state) => state.resetSession);

  // Capture accuracy before completeSession resets the store
  const sessionResults = useSessionStore((state) => state.sessionResults);
  const steps = useSessionStore((state) => state.steps);
  const accuracy = steps.length > 0
    ? Math.round((sessionResults.filter(r => r.didSpeak).length / steps.length) * 100)
    : 0;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run completion then animate
    completeSession().then(() => {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true, tension: 50, friction: 6,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(confettiAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, []);

  const getMessage = () => {
    if (accuracy >= 80) return { emoji: '🌟', title: 'Outstanding!', sub: 'Your child is making incredible progress!' };
    if (accuracy >= 60) return { emoji: '🎉', title: 'Great session!', sub: 'Every response is a step forward.' };
    if (accuracy >= 40) return { emoji: '💪', title: 'Keep going!', sub: 'Consistency is what matters most.' };
    return { emoji: '❤️', title: 'Well done!', sub: 'Just showing up is the biggest win.' };
  };

  const msg = getMessage();
  const getScoreColor = () => {
    if (accuracy >= 70) return Colors.success;
    if (accuracy >= 40) return Colors.warning;
    return Colors.accent;
  };

  const handleGoHome = () => {
    resetSession();
    navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.content}>
        {/* Emoji */}
        <Animated.View style={[styles.emojiWrap, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>{msg.emoji}</Text>
        </Animated.View>

        {/* Score ring */}
        <Animated.View style={[styles.scoreWrap, { opacity: fadeAnim }]}>
          <View style={[styles.scoreRing, { borderColor: getScoreColor() }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor() }]}>{accuracy}%</Text>
            <Text style={styles.scoreLabel}>Response rate</Text>
          </View>
        </Animated.View>

        {/* Message */}
        <Animated.View style={[styles.messageWrap, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.subtitle}>{msg.sub}</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessionResults.filter(r => r.didSpeak).length}</Text>
            <Text style={styles.statLabel}>Responded</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessionResults.filter(r => !r.didSpeak).length}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{steps.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Back to Home 🏠</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              resetSession();
              navigation.navigate('Session');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Do another session</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, overflow: 'hidden' },
  bgCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.primaryLight, top: -100, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.accentLight, bottom: -60, left: -60,
  },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emojiWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.surfaceCard, alignItems: 'center',
    justifyContent: 'center', marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  emoji: { fontSize: 52 },
  scoreWrap: { marginBottom: Spacing.lg },
  scoreRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceCard,
  },
  scoreNumber: { fontSize: 28, fontWeight: '900' },
  scoreLabel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600' },
  messageWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  title: {
    fontSize: 30, fontWeight: '900', color: Colors.ink,
    letterSpacing: -0.5, marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: 16, color: Colors.inkLight, textAlign: 'center', lineHeight: 22 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1,
    borderColor: Colors.border, ...Shadow.sm, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: Colors.ink },
  statLabel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  buttons: { width: '100%', gap: Spacing.sm },
  primaryButton: {
    backgroundColor: Colors.primary, paddingVertical: 18,
    borderRadius: Radius.lg, alignItems: 'center', ...Shadow.lg,
  },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  secondaryButton: {
    paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: Colors.inkLight },
});