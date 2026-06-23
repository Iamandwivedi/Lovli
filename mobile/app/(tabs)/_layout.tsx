import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
        tabBarItemStyle: { flex: 0, minWidth: 100, maxWidth: 160 },
      }}
      screenListeners={{
        // Subtle native haptic on tab change. Silent on most Androids — by design.
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      <Tabs.Screen
        name="reply"
        options={{
          title: 'Reply',
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color }) => (
            <Feather name="bookmark" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
