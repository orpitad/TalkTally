/**
 * STUB SCREENS — for development/navigation scaffolding only.
 * Prefixed with "Stub" to avoid shadowing the real screen implementations.
 * Delete this file once all real screens are wired up in your navigator.
 */
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type Props = StackScreenProps<RootStackParamList, any>;

const ScreenFactory = (name: string, next?: keyof RootStackParamList) =>
  ({ navigation }: Props) => (
    <View style={styles.container}>
      <Text style={styles.title}>{name} Screen</Text>
      {next && (
        <Button
          title={`Go to ${next}`}
          onPress={() => navigation.navigate(next as any)}
        />
      )}
    </View>
  );

export const StubLandingScreen = ScreenFactory('Landing', 'Onboarding');
export const StubOnboardingScreen = ScreenFactory('Onboarding', 'MainTabs'); // ← was 'Home'
export const StubHomeScreen = ScreenFactory('Home', 'Session');
export const StubSessionScreen = ScreenFactory('Session', 'SessionComplete');
export const StubCompleteScreen = ScreenFactory('SessionComplete', 'MainTabs'); // ← was 'Home'

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});