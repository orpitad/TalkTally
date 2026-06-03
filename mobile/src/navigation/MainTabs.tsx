import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { Colors } from '../theme/theme';

export type MainTabsParamList = {
  Home: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E7E0D9',
          borderTopWidth: 1,
          // Add bottom inset so tab bar sits above system nav buttons
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 56 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inkFaint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📈</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};