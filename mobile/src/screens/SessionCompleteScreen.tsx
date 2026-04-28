import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSessionStore } from '../features/useSessionStore';

export const SessionCompleteScreen = ({ navigation }: any) => {
const completeSession = useSessionStore((state: any) => state.completeSession);
  const resetSession = useSessionStore((state: any) => state.resetSession);

  useEffect(() => {
    const finish = async () => {
      if (completeSession) {
        await completeSession();
      }
    };
    finish();
  }, []);

  const handleGoHome = () => {
    // Double safety: reset session before leaving
    resetSession(); 
    navigation.navigate('MainTabs', { screen: 'Home' });
  };  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Session Done!</Text>
      <Text style={styles.subtitle}>You're doing amazing! Every word counts.</Text>
      
      {/* <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
      >
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity> */}
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
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});