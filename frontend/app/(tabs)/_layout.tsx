// Bottom tab layout — 3 tabs, dark glass.
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICON: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  reply: { active: "chatbubbles", inactive: "chatbubbles-outline" },
  pro: { active: "sparkles", inactive: "sparkles-outline" },
  memory: { active: "bookmark", inactive: "bookmark-outline" },
};

function TabBarBackground() {
  if (Platform.OS === "ios") {
    return (
      <BlurView tint="dark" intensity={28} style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,12,20,0.78)" }]} />
      </BlurView>
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,12,20,0.92)" }]} />;
}

// Forward all props (including testID) to a styled Pressable.
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
          { height: 64 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) },
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: colors.lavender,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarButton: TabButton,
      }}
    >
      <Tabs.Screen
        name="reply"
        options={{
          title: "Reply",
          tabBarTestID: "bottom-nav-reply",
          tabBarButtonTestID: "bottom-nav-reply",
          tabBarAccessibilityLabel: "Reply tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICON.reply.active : TAB_ICON.reply.inactive} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pro"
        options={{
          title: "Pro",
          tabBarTestID: "bottom-nav-pro",
          tabBarButtonTestID: "bottom-nav-pro",
          tabBarAccessibilityLabel: "Pro tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICON.pro.active : TAB_ICON.pro.inactive} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: "Memory",
          tabBarTestID: "bottom-nav-memory",
          tabBarButtonTestID: "bottom-nav-memory",
          tabBarAccessibilityLabel: "Memory tab",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICON.memory.active : TAB_ICON.memory.inactive} size={22} color={color} />
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
    borderTopColor: colors.border,
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
