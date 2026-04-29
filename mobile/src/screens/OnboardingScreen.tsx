import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export const OnboardingScreen = ({ navigation }: Props) => (
  <View style={styles.container}>
    <Text style={styles.step}>Step 1 of 1</Text>
    <Text style={styles.title}>How it works</Text>
    <Text style={styles.desc}>
      1. Open the app during playtime.{'\n'}
      2. Follow the 3-minute prompts.{'\n'}
      3. We'll track progress automatically!
    </Text>

    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('MainTabs')} // Home lives inside MainTabs
    >
      <Text style={styles.buttonText}>Got it!</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  step: { color: '#4F46E5', fontWeight: 'bold', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  desc: { fontSize: 18, lineHeight: 28, color: '#4B5563', marginBottom: 40 },
  button: { backgroundColor: '#10B981', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});