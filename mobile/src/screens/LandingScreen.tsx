import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Landing'>;
};

const { width } = Dimensions.get('window');

const FloatingBubble = ({ size, color, top, left, delay }: {
  size: number; color: string; top: number; left: number; delay: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -12, duration: 2200 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2200 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', top, left,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: 0.12,
      transform: [{ translateY: anim }],
    }} />
  );
};

export const LandingScreen = ({ navigation }: Props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <FloatingBubble size={140} color={Colors.primary} top={-40} left={-40} delay={0} />
      <FloatingBubble size={90} color={Colors.accent} top={80} left={width - 70} delay={400} />
      <FloatingBubble size={70} color={Colors.success} top={220} left={-20} delay={700} />
      <FloatingBubble size={110} color={Colors.primary} top={500} left={width - 50} delay={200} />

      <Animated.View style={[styles.content, {
        opacity: fadeAnim, transform: [{ translateY: slideAnim }],
      }]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🗣️</Text>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>Ba ba ba! 🎉</Text>
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>TalkTally</Text>
          <Text style={styles.tagline}>
            Turn playtime into{'\n'}
            <Text style={styles.taglineAccent}>speech milestones.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Guided 3-minute sessions that help your toddler find their voice — one word at a time.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { value: '3 min', label: 'per session' },
            { value: '4', label: 'session types' },
            { value: '100%', label: 'free to start' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Get Started — It's Free</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>No account needed to start</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, overflow: 'hidden' },
  content: {
    flex: 1, paddingHorizontal: Spacing.lg,
    paddingTop: 60, paddingBottom: Spacing.xl, justifyContent: 'center',
  },
  heroCard: { alignItems: 'center', marginBottom: Spacing.xl },
  heroEmoji: { fontSize: 80, marginBottom: Spacing.md },
  speechBubble: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderBottomLeftRadius: 4,
  },
  speechText: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  copyBlock: { marginBottom: Spacing.xl },
  title: {
    fontSize: 42, fontWeight: '900', color: Colors.primary,
    letterSpacing: -1.5, marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: 28, fontWeight: '800', color: Colors.ink,
    lineHeight: 36, marginBottom: Spacing.md, letterSpacing: -0.5,
  },
  taglineAccent: { color: Colors.accent },
  subtitle: { fontSize: 16, color: Colors.inkLight, lineHeight: 24 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.xl, gap: Spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600', marginTop: 2 },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 18,
    paddingHorizontal: Spacing.xl, borderRadius: Radius.lg,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm,
    ...Shadow.lg, marginBottom: Spacing.md,
  },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  ctaArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  footerNote: { textAlign: 'center', color: Colors.inkFaint, fontSize: 13 },
});