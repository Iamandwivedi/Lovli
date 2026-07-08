// Bottom tab layout — V2 dark, 4 tabs: Reply · Ask Lovli · Memory · More.
// bg rgba(9,10,20,.9) + blur(20) (iOS), solid rgba(9,10,20,.96) elsewhere.
// Top hairline #2A2B3A. Active #A78BFA (✦ glows), inactive #71717A.
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICON: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  reply: { active: "chatbubble", inactive: "chatbubble-outline" },
  memory: { active: "heart", inactive: "heart-outline" },
  more: { active: "grid", inactive: "grid-outline" },
};

function TabBarBackground() {
  if (Platform.OS === "ios") {
    return (
      <BlurView tint="dark" intensity={20} style={StyleSheet.absoluteFill}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(9,10,20,0.9)" }]}
        />
      </BlurView>
    );
  }
  // Android/web fallback: solid per spec
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(9,10,20,0.96)" }]} />
  );
}

// Ask Lovli tab icon — ✦ text glyph, glows when active.
function AskLovliIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontSize: 20,
        lineHeight: 25,
        color,
        textShadowColor: focused ? "rgba(167,139,250,0.7)" : "transparent",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: focused ? 12 : 0,
      }}
    >
      ✦
    </Text>
  );
}

function TabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      android_ripple={{ color: "transparent" }}
      style={styles.tabButton}
    >
      {children}
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
            height: 62 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: colors.lavender,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: typography.fonts.bodySemibold, fontSize: 11 },
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
              size={23}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ask-lovli"
        options={{
          title: "Ask Lovli",
          tabBarButtonTestID: "bottom-nav-ask-lovli",
          tabBarAccessibilityLabel: "Ask Lovli tab",
          tabBarIcon: ({ color, focused }) => (
            <AskLovliIcon color={color} focused={focused} />
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
              size={23}
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
              size={23}
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
