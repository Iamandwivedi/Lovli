import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/theme';

// 2-tab nav: Reply / Memory.
// Pro is a pushed screen (app/pro.tsx), not a tab.
// Settings lives behind the header cog on Reply.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navBackdrop,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.lavender,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Figtree_500Medium',
          fontSize: 11,
        },
        // Center-align items so 2 tabs don't stretch awkwardly on wide screens (390/360).
        tabBarItemStyle: { flex: 0, minWidth: 80 },
        tabBarContentContainerStyle: { justifyContent: 'center' },
      }}
    >
      <Tabs.Screen
        name="reply"
        options={{
          title: 'Reply',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>◎</Text>,
        }}
      />
    </Tabs>
  );
}
