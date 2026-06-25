// Bottom tab layout — 3 tabs: Reply · More · Memory.
// PR2.1 light redesign: light tab bar, top hairline #ECEAF3, active violet, inactive textMuted.
// Pro is NOT a tab — lives behind /paywall reached from Settings + More-tab upsell row.
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICON: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  reply: { active: "chatbubbles", inactive: "chatbubbles-outline" },
  more: { active: "grid", inactive: "grid-outline" },
  memory: { active: "bookmark", inactive: "bookmark-outline" },
};

function TabBarBackground() {
  if (Platform.OS === "ios") {
    return (
      <BlurView tint="light" intensity={32} style={StyleSheet.absoluteFill}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.85)" }]}
        />
      </BlurView>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
  );
}

function TabButton(props: React.ComponentProps<typeof Pressable>) {
  return (
    <Pressable
      {...props}
      android_ripple={{ color: "transparent" }}
      style={styles.tabButton}
    >
      {props.children as React.ReactNode}
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 64 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: colors.violet,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: typography.fonts.bodyMedium, fontSize: 11 },
        tabBarButton: TabButton,
      }}
    >
      <Tabs.Screen
        name="reply"
        options={{
          title: "Reply",
          tabBarButtonTestID: "bottom-nav-reply",
          tabBarAccessibilityLabel: "Reply tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? TAB_ICON.reply.active : TAB_ICON.reply.inactive}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarButtonTestID: "bottom-nav-more",
          tabBarAccessibilityLabel: "More tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? TAB_ICON.more.active : TAB_ICON.more.inactive}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: "Memory",
          tabBarButtonTestID: "bottom-nav-memory",
          tabBarAccessibilityLabel: "Memory tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? TAB_ICON.memory.active : TAB_ICON.memory.inactive}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    backgroundColor: "transparent",
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    elevation: 0,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
});
