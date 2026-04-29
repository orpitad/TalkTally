import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useSessionStore } from '../features/useSessionStore';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SessionComplete'>;
};

export const SessionCompleteScreen = ({ navigation }: Props) => {
  const completeSession = useSessionStore((state) => state.completeSession);
  const resetSession = useSessionStore((state) => state.resetSession);

  useEffect(() => {
    const finish = async () => {
      await completeSession();
    };
    finish();
  }, []);

  const handleGoHome = () => {
    resetSession();
    navigation.navigate('MainTabs'); // Home lives inside MainTabs, not the root stack
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Session Done!</Text>
      <Text style={styles.subtitle}>You're doing amazing! Every word counts.</Text>

      <TouchableOpacity style={styles.button} onPress={handleGoHome}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F0FDFA' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#065F46', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#047857', textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#10B981', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});