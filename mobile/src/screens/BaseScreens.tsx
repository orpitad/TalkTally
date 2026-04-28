import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type Props = StackScreenProps<RootStackParamList, any>;

const ScreenFactory = (name: string, next?: keyof RootStackParamList) => ({ navigation }: Props) => (
  <View style={styles.container}>
    <Text style={styles.title}>{name} Screen</Text>
    {next && <Button title={`Go to ${next}`} onPress={() => navigation.navigate(next as any)} />}
  </View>
);

export const LandingScreen = ScreenFactory('Landing', 'Onboarding');
export const OnboardingScreen = ScreenFactory('Onboarding', 'Home');
export const HomeScreen = ScreenFactory('Home', 'Session');
export const SessionScreen = ScreenFactory('Session', 'SessionComplete');
export const CompleteScreen = ScreenFactory('SessionComplete', 'Home');

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});