import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHistory, SessionRecord } from '../features/sessionStorage';
import { useIsFocused } from '@react-navigation/native';

export const HistoryScreen = () => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused]);

  const loadData = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  const renderItem = ({ item }: { item: SessionRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.details}>{item.totalSteps} activities completed</Text>
        {/* Sync status badge */}
        <View style={[styles.syncBadge, item.synced ? styles.syncedBg : styles.unsyncedBg]}>
          <Text style={[styles.syncText, item.synced ? styles.syncedText : styles.unsyncedText]}>
            {item.synced ? '✓ Synced' : '↑ Not synced'}
          </Text>
        </View>
      </View>
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{item.accuracy}%</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Progress History</Text>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No sessions yet. Start playing to see progress!
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 28, fontWeight: 'bold', padding: 20, color: '#111827' },
  list: { padding: 20 },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  date: { fontSize: 16, fontWeight: '600', color: '#374151' },
  details: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  syncBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  syncedBg: { backgroundColor: '#D1FAE5' },
  unsyncedBg: { backgroundColor: '#FEF3C7' },
  syncText: { fontSize: 11, fontWeight: '600' },
  syncedText: { color: '#065F46' },
  unsyncedText: { color: '#92400E' },
  scoreBadge: { backgroundColor: '#D1FAE5', padding: 10, borderRadius: 12 },
  scoreText: { color: '#065F46', fontWeight: 'bold', fontSize: 18 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16 },
});