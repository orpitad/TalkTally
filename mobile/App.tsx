import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons'; // Add this import
// Screen Imports
import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { SessionCompleteScreen } from './src/screens/SessionCompleteScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

// Types for Navigation
export type RootStackParamList = {
  MainTabs: undefined;
  Session: undefined;
  SessionComplete: undefined;
};

export type TabParamList = {
  Play: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Tab Navigator: Handles the main app dashboard
 */
function TabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'play-circle';

          if (route.name === 'Play') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Play" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
/**
 * Root Component: Wraps the app in necessary Providers
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator 
          initialRouteName="MainTabs"
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right' 
          }}
        >
          {/* Main App Experience */}
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          
          {/* Active Session Screens (Hidden Tabs) */}
          <Stack.Screen 
            name="Session" 
            component={SessionScreen} 
            options={{ gestureEnabled: false }} // Prevent swiping back during session
          />
          <Stack.Screen 
            name="SessionComplete" 
            component={SessionCompleteScreen} 
            options={{ gestureEnabled: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}