import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Dimensions, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import { getHistory, SessionRecord, StepResult, clearStepRecordingPath } from '../features/sessionStorage';
import { deleteRecording, recordingExists, getRecordingsStorageSize } from '../services/recordingService';
import { useIsFocused } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadow } from '../theme/theme';
import { LEVEL_META } from '../features/recommendationEngine';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Recording player button ──────────────────────────────────────────────────
const RecordingPlayer = ({
  filePath, sessionId, stepId,
  onDeleted,
}: {
  filePath: string;
  sessionId: string;
  stepId: number;
  onDeleted: () => void;
}) => {
  const [exists, setExists] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer({ uri: filePath });

  useEffect(() => {
    recordingExists(filePath).then(setExists);
  }, [filePath]);

  useEffect(() => {
    if (!player) return;
    // Listen for playback finish
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) setIsPlaying(false);
    });
    return () => sub?.remove?.();
  }, [player]);

  const handlePlay = async () => {
    if (!player || !exists) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.seekTo(0);
      player.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete recording?',
      'This will permanently delete this audio recording. The session result will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteRecording(filePath);
            await clearStepRecordingPath(sessionId, stepId);
            setExists(false);
            onDeleted();
          },
        },
      ]
    );
  };

  if (!exists) return null;

  return (
    <View style={playerStyles.container}>
      <TouchableOpacity style={playerStyles.playBtn} onPress={handlePlay} activeOpacity={0.8}>
        <Text style={playerStyles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        <Text style={playerStyles.playText}>
          {isPlaying ? 'Pause' : 'Play recording'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={playerStyles.deleteBtn} onPress={handleDelete}>
        <Text style={playerStyles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
};

const playerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginTop: Spacing.sm,
  },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: Radius.full, flex: 1,
  },
  playIcon: { fontSize: 14, color: Colors.primaryDark },
  playText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center',
  },
  deleteIcon: { fontSize: 15 },
});

// ─── Session detail modal ─────────────────────────────────────────────────────
const SessionDetailModal = ({
  session, onClose, onRecordingDeleted,
}: {
  session: SessionRecord | null;
  onClose: () => void;
  onRecordingDeleted: () => void;
}) => {
  if (!session) return null;
  const levelMeta = LEVEL_META[session.level as keyof typeof LEVEL_META] ?? LEVEL_META.Beginner;
  const responded = session.stepResults?.filter(s => s.didSpeak).length ?? 0;
  const hasRecordings = session.stepResults?.some(s => s.recordingPath);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <View>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalEmoji}>{levelMeta.emoji}</Text>
              <Text style={styles.modalTitle}>{session.sessionTitle || 'Session'}</Text>
            </View>
            <Text style={styles.modalDate}>{session.date} · {session.level}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Score summary */}
        <View style={styles.modalScoreRow}>
          {[
            { value: `${session.accuracy}%`, label: 'Accuracy', color: Colors.ink },
            { value: String(responded), label: 'Responded ✓', color: Colors.success },
            { value: String(session.totalSteps - responded), label: 'Skipped', color: Colors.inkFaint },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.modalScoreDivider} />}
              <View style={styles.modalScoreItem}>
                <Text style={[styles.modalScoreValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.modalScoreLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {hasRecordings && (
          <View style={styles.recordingsNote}>
            <Text style={styles.recordingsNoteIcon}>🎙</Text>
            <Text style={styles.recordingsNoteText}>
              Tap ▶ to hear what your child said
            </Text>
          </View>
        )}

        <Text style={styles.modalSectionLabel}>ACTIVITY BREAKDOWN</Text>

        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
        >
          {session.stepResults?.length > 0 ? (
            session.stepResults.map((step, index) => (
              <View key={step.stepId} style={styles.stepCard}>
                <View style={styles.stepCardTop}>
                  <View style={[styles.stepIndexBadge, {
                    backgroundColor: step.didSpeak ? Colors.successLight : Colors.dangerLight,
                  }]}>
                    <Text style={[styles.stepIndexText, {
                      color: step.didSpeak ? Colors.successDark : Colors.danger,
                    }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepCardContent}>
                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                    <View style={styles.stepTipRow}>
                      <Text style={styles.stepTipIcon}>💡</Text>
                      <Text style={styles.stepTipText}>{step.tip}</Text>
                    </View>
                  </View>
                  <View style={[styles.stepResponseBadge, {
                    backgroundColor: step.didSpeak ? Colors.successLight : Colors.surfaceMuted,
                  }]}>
                    <Text style={[styles.stepResponseText, {
                      color: step.didSpeak ? Colors.successDark : Colors.inkFaint,
                    }]}>
                      {step.didSpeak ? '✓ Yes' : '– No'}
                    </Text>
                  </View>
                </View>

                {/* Recording player — only shown when child responded and recording exists */}
                {step.didSpeak && step.recordingPath && (
                  <RecordingPlayer
                    filePath={step.recordingPath}
                    sessionId={session.id}
                    stepId={step.stepId}
                    onDeleted={onRecordingDeleted}
                  />
                )}
              </View>
            ))
          ) : (
            <View style={styles.noDetailState}>
              <Text style={styles.noDetailText}>
                Detailed breakdown not available for older sessions.
                Complete a new session to see per-activity results.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Mini chart ───────────────────────────────────────────────────────────────
const MiniChart = ({ history }: { history: SessionRecord[] }) => {
  const last7 = [...history].slice(0, 7).reverse();
  if (last7.length < 2) return null;
  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>Last {last7.length} sessions</Text>
      <View style={chartStyles.bars}>
        {last7.map((s) => {
          const h = Math.max((s.accuracy / 100) * 72, 4);
          const color = s.accuracy >= 70 ? Colors.success
            : s.accuracy >= 40 ? Colors.warning : Colors.danger;
          return (
            <View key={s.id} style={chartStyles.barWrap}>
              <Text style={chartStyles.barValue}>{s.accuracy}%</Text>
              <View style={[chartStyles.bar, { height: h, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={chartStyles.baseline} />
    </View>
  );
};

const chartStyles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  label: { fontSize: 10, fontWeight: '700', color: Colors.inkFaint, letterSpacing: 0.8, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 6 },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  barValue: { fontSize: 8, color: Colors.inkFaint, marginBottom: 2, fontWeight: '600' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  baseline: { height: 1, backgroundColor: Colors.border, marginTop: 4 },
});

const getScoreStyle = (a: number) => {
  if (a >= 70) return { bg: Colors.successLight, text: Colors.successDark, label: 'Great' };
  if (a >= 40) return { bg: Colors.warningLight, text: Colors.warning, label: 'Good' };
  return { bg: Colors.dangerLight, text: Colors.danger, label: 'Keep going' };
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export const HistoryScreen = () => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [storageSize, setStorageSize] = useState(0);
  const isFocused = useIsFocused();

  const loadData = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
    const size = await getRecordingsStorageSize();
    setStorageSize(size);
  }, []);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused]);

  const avgAccuracy = history.length > 0
    ? Math.round(history.reduce((a, b) => a + b.accuracy, 0) / history.length)
    : null;

  const renderItem = ({ item, index }: { item: SessionRecord; index: number }) => {
    const score = getScoreStyle(item.accuracy);
    const levelMeta = LEVEL_META[item.level as keyof typeof LEVEL_META] ?? LEVEL_META.Beginner;
    const hasRecordings = item.stepResults?.some(s => s.recordingPath);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedSession(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>#{history.length - index}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {item.sessionTitle || `Session ${item.sessionNumber || ''}`}
            </Text>
            <Text style={styles.cardDate}>{item.date}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.levelEmoji}>{levelMeta.emoji}</Text>
              <Text style={styles.cardLevel}>{item.level}</Text>
              {hasRecordings && (
                <View style={styles.hasRecordingBadge}>
                  <Text style={styles.hasRecordingText}>🎙 recordings</Text>
                </View>
              )}
              <View style={[styles.syncDot, {
                backgroundColor: item.synced ? Colors.success : Colors.warning,
              }]}>
                <Text style={styles.syncText}>{item.synced ? '✓' : '↑'}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.scoreBadge, { backgroundColor: score.bg }]}>
            <Text style={[styles.scoreText, { color: score.text }]}>{item.accuracy}%</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: score.text }]}>{score.label}</Text>
          <Text style={styles.tapHint}>tap for details</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <Text style={styles.title}>Progress History</Text>

      {history.length > 0 && (
        <>
          <View style={styles.summaryRow}>
            {[
              { value: String(history.length), label: 'Sessions' },
              { value: avgAccuracy !== null ? `${avgAccuracy}%` : '-', label: 'Avg score' },
              { value: String(history.filter(s => s.accuracy >= 70).length), label: 'Great' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.summaryDivider} />}
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{s.value}</Text>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {history.length >= 2 && (
            <View style={styles.chartCard}>
              <MiniChart history={history} />
            </View>
          )}

          {storageSize > 0 && (
            <View style={styles.storageRow}>
              <Text style={styles.storageIcon}>💾</Text>
              <Text style={styles.storageText}>
                Recordings using {storageSize} MB on your device
              </Text>
            </View>
          )}
        </>
      )}

      <Text style={styles.sectionLabel}>ALL SESSIONS — tap any to see details</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>
            Complete your first session to see your progress here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
        />
      )}

      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onRecordingDeleted={() => {
          loadData(); // refresh storage size
          // Refresh the selected session from updated history
          getHistory().then(data => {
            const updated = data.find(s => s.id === selectedSession?.id);
            if (updated) setSelectedSession(updated);
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.ink, letterSpacing: -0.5, marginBottom: Spacing.lg },
  summaryRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  summaryLabel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  chartCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  storageRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  storageIcon: { fontSize: 16 },
  storageText: { fontSize: 13, color: Colors.inkFaint, fontWeight: '500' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.inkFaint, letterSpacing: 1, marginBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.surfaceCard, padding: Spacing.md, borderRadius: Radius.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  indexBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  indexText: { fontSize: 11, fontWeight: '700', color: Colors.inkFaint },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  cardDate: { fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  levelEmoji: { fontSize: 12 },
  cardLevel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600' },
  hasRecordingBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  hasRecordingText: { fontSize: 10, color: Colors.primaryDark, fontWeight: '600' },
  syncDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  syncText: { fontSize: 9, color: '#FFF', fontWeight: '800' },
  cardRight: { alignItems: 'center', gap: 2, flexShrink: 0 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  scoreText: { fontSize: 15, fontWeight: '900' },
  scoreLabel: { fontSize: 10, fontWeight: '700' },
  tapHint: { fontSize: 9, color: Colors.inkFaint, marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink, marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', color: Colors.inkLight, fontSize: 15, lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.88, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalEmoji: { fontSize: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: Colors.ink },
  modalDate: { fontSize: 13, color: Colors.inkFaint, marginTop: 2 },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { fontSize: 14, color: Colors.inkFaint, fontWeight: '700' },
  modalScoreRow: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  modalScoreItem: { flex: 1, alignItems: 'center' },
  modalScoreValue: { fontSize: 22, fontWeight: '900' },
  modalScoreLabel: { fontSize: 11, color: Colors.inkFaint, fontWeight: '600', marginTop: 2 },
  modalScoreDivider: { width: 1, backgroundColor: Colors.border },
  recordingsNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryLight, marginHorizontal: Spacing.lg, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  recordingsNoteIcon: { fontSize: 16 },
  recordingsNoteText: { fontSize: 13, fontWeight: '600', color: Colors.primaryDark },
  modalSectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.inkFaint, letterSpacing: 1, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  modalScroll: { maxHeight: SCREEN_HEIGHT * 0.5 },
  modalScrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  stepCard: { backgroundColor: Colors.surfaceCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  stepCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepIndexBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepIndexText: { fontSize: 12, fontWeight: '800' },
  stepCardContent: { flex: 1 },
  stepInstruction: { fontSize: 14, fontWeight: '600', color: Colors.ink, lineHeight: 20, marginBottom: 6 },
  stepTipRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  stepTipIcon: { fontSize: 11, marginTop: 1 },
  stepTipText: { fontSize: 12, color: Colors.inkFaint, lineHeight: 17, flex: 1 },
  stepResponseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, flexShrink: 0 },
  stepResponseText: { fontSize: 11, fontWeight: '700' },
  noDetailState: { padding: Spacing.xl, alignItems: 'center' },
  noDetailText: { textAlign: 'center', color: Colors.inkFaint, fontSize: 14, lineHeight: 20 },
});