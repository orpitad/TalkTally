import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './src/navigation/types';
import { retryUnsyncedSessions } from './src/services/syncService';
import { analytics } from './src/services/analytics';
import { logger } from './src/services/logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Screens
import { LandingScreen } from './src/screens/LandingScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { SessionCompleteScreen } from './src/screens/SessionCompleteScreen';
import { MainTabs } from './src/navigation/MainTabs';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    analytics.track('app_opened');
    logger.info('App', 'Started');

    // Retry any sessions that failed to sync in a previous launch
    retryUnsyncedSessions();

    // Retry whenever the app returns to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        logger.info('App', 'Foregrounded — retrying unsynced sessions');
        retryUnsyncedSessions();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Landing"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Session" component={SessionScreen} />
          <Stack.Screen name="SessionComplete" component={SessionCompleteScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}