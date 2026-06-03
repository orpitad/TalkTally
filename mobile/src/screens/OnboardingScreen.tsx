import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const steps = [
  {
    emoji: '🧸',
    title: 'Open during playtime',
    desc: 'No special setup — just open the app when you\'re playing with your child.',
  },
  {
    emoji: '💬',
    title: 'Follow simple prompts',
    desc: 'Each session gives you 6 easy activities. Takes about 3 minutes.',
  },
  {
    emoji: '📈',
    title: 'Watch them grow',
    desc: 'We track responses automatically and show your child\'s progress over time.',
  },
];

export const OnboardingScreen = ({ navigation }: Props) => {
  const anims = steps.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.stagger(150, anims.map(anim =>
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 })
    )).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>HOW IT WORKS</Text>
        <Text style={styles.title}>Three simple steps</Text>
        <Text style={styles.subtitle}>
          Designed for busy parents. No training required.
        </Text>
      </View>

      <View style={styles.stepsList}>
        {steps.map((s, i) => (
          <Animated.View
            key={s.title}
            style={[
              styles.stepCard,
              {
                opacity: anims[i],
                transform: [{
                  translateY: anims[i].interpolate({
                    inputRange: [0, 1], outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.stepIconWrap}>
              <Text style={styles.stepIcon}>{s.emoji}</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Let's Start! 🚀</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          You can always revisit this guide from settings
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.xl,
  },
  header: { marginBottom: Spacing.xl },
  step: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: Colors.primary, marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 30, fontWeight: '900', color: Colors.ink,
    letterSpacing: -0.5, marginBottom: Spacing.sm,
  },
  subtitle: { fontSize: 16, color: Colors.inkLight, lineHeight: 24 },
  stepsList: { flex: 1, justifyContent: 'center', gap: Spacing.md },
  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.md, gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  stepIconWrap: {
    width: 56, height: 56, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepIcon: { fontSize: 28 },
  stepContent: { flex: 1 },
  stepNumberBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepNumber: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  stepTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.ink,
    marginBottom: 4,
  },
  stepDesc: { fontSize: 14, color: Colors.inkLight, lineHeight: 20 },
  footer: { marginTop: Spacing.xl },
  button: {
    backgroundColor: Colors.primary, paddingVertical: 18,
    borderRadius: Radius.lg, alignItems: 'center',
    ...Shadow.lg, marginBottom: Spacing.md,
  },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  footerNote: { textAlign: 'center', color: Colors.inkFaint, fontSize: 13 },
});