import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  getNextRecommendation, Recommendation, LEVEL_META,
} from '../features/recommendationEngine';
import { getHistory, SessionRecord } from '../features/sessionStorage';
import { useIsFocused } from '@react-navigation/native';
import { useSessionStore } from '../features/useSessionStore';
import { ALL_SESSIONS } from '../features/sessionData';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList>;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const HomeScreen = ({ navigation }: Props) => {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const isFocused = useIsFocused();
  const { currentStepIndex, sessionResults, resetSession, setSteps, setSessionMeta } = useSessionStore();
  const isResuming = currentStepIndex > 0 && sessionResults.length > 0;

  useEffect(() => {
    if (isFocused) {
      getNextRecommendation().then(setRec);
      getHistory().then(setHistory);
    }
  }, [isFocused]);

  const lastAccuracy = history[0]?.accuracy ?? null;
  const levelMeta = rec ? LEVEL_META[rec.level as keyof typeof LEVEL_META] : null;

  const handleStart = () => {
    if (isResuming) {
      navigation.navigate('Session');
    } else {
      resetSession();
      if (rec) {
        setSteps(rec.steps);
        setSessionMeta({
          sessionNumber: rec.sessionNumber,
          sessionTitle:  rec.title,
          level:         rec.level,
        });
      }
      navigation.navigate('Session');
    }
  };

  const nextSession = rec && rec.sessionNumber < 15
    ? ALL_SESSIONS[rec.sessionNumber]
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.headerSub}>Ready for today's session?</Text>
          </View>
          {lastAccuracy !== null && (
            <View style={[styles.lastScoreBadge, {
              backgroundColor: lastAccuracy >= 70 ? Colors.successLight : Colors.warningLight,
            }]}>
              <Text style={styles.lastScoreLabel}>Last</Text>
              <Text style={[styles.lastScoreValue, {
                color: lastAccuracy >= 70 ? Colors.successDark : Colors.warning,
              }]}>{lastAccuracy}%</Text>
            </View>
          )}
        </View>

        {/* Overall progress */}
        {rec && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Overall Progress</Text>
                <Text style={styles.progressSub}>
                  Session {Math.min(history.length + 1, 15)} of 15
                </Text>
              </View>
              {levelMeta && (
                <View style={[styles.levelBadge, {
                  backgroundColor: levelMeta.bg, borderColor: levelMeta.border,
                }]}>
                  <Text style={styles.levelEmoji}>{levelMeta.emoji}</Text>
                  <Text style={[styles.levelText, { color: levelMeta.color }]}>
                    {rec.level}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${rec.progressPercent}%` as any }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressPercent}>{rec.progressPercent}% complete</Text>
              {rec.isLastSession && (
                <Text style={styles.lastSessionTag}>🏆 Final session!</Text>
              )}
            </View>
          </View>
        )}

        {/* Recommendation card */}
        {rec && levelMeta && (
          <View style={styles.recCard}>
            <View style={styles.recCardTop}>
              <View style={styles.sessionNumberBadge}>
                <Text style={styles.sessionNumberText}>#{rec.sessionNumber}</Text>
              </View>
              <View style={[styles.typePill, {
                backgroundColor: levelMeta.bg, borderColor: levelMeta.border,
              }]}>
                <Text style={[styles.typePillText, { color: levelMeta.color }]}>
                  {rec.sessionType}
                </Text>
              </View>
            </View>
            <Text style={styles.recTitle}>{rec.title}</Text>
            <Text style={styles.recReason}>{rec.reason}</Text>
            <View style={styles.recMeta}>
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaIcon}>⏱</Text>
                <Text style={styles.recMetaText}>~3 minutes</Text>
              </View>
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaIcon}>📋</Text>
                <Text style={styles.recMetaText}>{rec.steps.length} activities</Text>
              </View>
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaIcon}>{levelMeta.emoji}</Text>
                <Text style={styles.recMetaText}>{rec.level}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.9}>
              <Text style={styles.startButtonText}>
                {isResuming ? '▶ Resume Session' : '▶ Start Session'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next session preview */}
        {nextSession && (() => {
          const nextMeta = LEVEL_META[nextSession.level as keyof typeof LEVEL_META];
          return (
            <View style={styles.nextCard}>
              <Text style={styles.nextLabel}>COMING UP NEXT</Text>
              <View style={styles.nextRow}>
                <Text style={styles.nextEmoji}>{nextMeta.emoji}</Text>
                <View>
                  <Text style={styles.nextName}>
                    Session {nextSession.id} — {nextSession.title}
                  </Text>
                  <Text style={styles.nextLevel}>
                    {nextSession.level} · {nextSession.type}
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}

        {rec?.isLastSession && (
          <View style={styles.masteryCard}>
            <Text style={styles.masteryEmoji}>🏆</Text>
            <Text style={styles.masteryTitle}>You're on the final session!</Text>
            <Text style={styles.masteryText}>
              After this, sessions cycle back to reinforce everything learned.
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>Keep talking, keep growing. 🌱</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.lg,
  },
  greeting: { fontSize: 26, fontWeight: '900', color: Colors.ink, letterSpacing: -0.5 },
  headerSub: { fontSize: 15, color: Colors.inkLight, marginTop: 2 },
  lastScoreBadge: { borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', minWidth: 60 },
  lastScoreLabel: { fontSize: 10, fontWeight: '600', color: Colors.inkFaint },
  lastScoreValue: { fontSize: 20, fontWeight: '900' },
  progressCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  progressSub: { fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  levelEmoji: { fontSize: 13 },
  levelText: { fontSize: 12, fontWeight: '700' },
  progressBarTrack: {
    height: 8, backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.xs,
  },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPercent: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600' },
  lastSessionTag: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  recCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
  },
  recCardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sessionNumberBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  sessionNumberText: { fontSize: 13, fontWeight: '900', color: Colors.primaryDark },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  recTitle: { fontSize: 22, fontWeight: '900', color: Colors.ink, letterSpacing: -0.3, marginBottom: Spacing.xs },
  recReason: { fontSize: 15, color: Colors.inkLight, lineHeight: 22, marginBottom: Spacing.md },
  recMeta: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  recMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recMetaIcon: { fontSize: 13 },
  recMetaText: { fontSize: 12, color: Colors.inkFaint, fontWeight: '500' },
  startButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center', ...Shadow.lg },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  nextCard: {
    backgroundColor: Colors.surfaceMuted, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  nextLabel: { fontSize: 10, fontWeight: '700', color: Colors.inkFaint, letterSpacing: 1, marginBottom: Spacing.sm },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nextEmoji: { fontSize: 24 },
  nextName: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  nextLevel: { fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
  masteryCard: {
    backgroundColor: '#FFF7ED', borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#FED7AA', alignItems: 'center',
  },
  masteryEmoji: { fontSize: 32, marginBottom: Spacing.xs },
  masteryTitle: { fontSize: 16, fontWeight: '800', color: Colors.accentDark, marginBottom: 4 },
  masteryText: { fontSize: 13, color: '#9A3412', textAlign: 'center', lineHeight: 18 },
  footerText: { textAlign: 'center', color: Colors.inkFaint, fontStyle: 'italic', fontSize: 14, marginTop: Spacing.sm },
});