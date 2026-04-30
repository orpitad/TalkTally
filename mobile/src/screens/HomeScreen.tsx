import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  getNextRecommendation,
  Recommendation,
} from '../features/recommendationEngine';
import { useIsFocused } from '@react-navigation/native';
import { useSessionStore } from '../features/useSessionStore';

type Props = {
  navigation: StackNavigationProp<RootStackParamList>;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 18) return 'Good afternoon!';
  return 'Good evening!';
};

export const HomeScreen = ({ navigation }: Props) => {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const isFocused = useIsFocused();
  const { currentStepIndex, sessionResults, resetSession, setSteps } =
    useSessionStore();

  const isResuming = currentStepIndex > 0 && sessionResults.length > 0;

  useEffect(() => {
    if (isFocused) {
      getNextRecommendation().then(setRec);
    }
  }, [isFocused]);

  const handleStart = () => {
    if (isResuming) {
      navigation.navigate('Session');
    } else {
      resetSession();
      // Use the recommended steps — not a hardcoded default
      if (rec) setSteps(rec.steps);
      navigation.navigate('Session');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{getGreeting()}</Text>

      {rec && (
        <View style={styles.aiCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SMART SUGGESTION</Text>
          </View>

          {/* Session type pill */}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{rec.sessionType}</Text>
          </View>

          <Text style={styles.recTitle}>{rec.title}</Text>
          <Text style={styles.recReason}>{rec.reason}</Text>

          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>
              {isResuming ? 'Resume Session' : 'Start New Session'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.footerText}>Keep talking, keep growing.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 25,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 20,
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 25,
    elevation: 10,
    shadowColor: '#6366F1',
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: { color: '#6366F1', fontSize: 10, fontWeight: '900' },
  typePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  typePillText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  recTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  recReason: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  footerText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});