import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const LandingScreen = ({ navigation }: any) => (
  <View style={styles.container}>
    <Text style={styles.emojiText}>🗣️</Text>
    <Text style={styles.title}>TalkTally</Text>
    <Text style={styles.subtitle}>
      Transform daily play into speech milestones.
    </Text>
    
    <TouchableOpacity 
      style={styles.button} 
      onPress={() => navigation.navigate('Onboarding')}
    >
      <Text style={styles.buttonText}>Get Started</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', padding: 20 },
  emojiText: { fontSize: 80, marginBottom: 10 }, // Big emoji for visual
  title: { fontSize: 36, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 18, color: '#6B7280', textAlign: 'center', marginTop: 10, marginBottom: 40 },
  button: { backgroundColor: '#4F46E5', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});