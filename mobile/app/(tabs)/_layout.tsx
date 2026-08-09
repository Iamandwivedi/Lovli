// Bottom tab layout — V3 iOS Liquid Glass, 4 tabs:
// Reply · Ask Lovli · Memory · More.
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { initNotifications, resyncNotificationsFromStorage } from "@/src/utils/notifications";
import { colors, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICON: Record<string, { active: IoniconName; inactive: IoniconName; label: string }> = {
  reply: { active: "chatbubble", inactive: "chatbubble-outline", label: "Reply" },
  "ask-lovli": { active: "sparkles", inactive: "sparkles-outline", label: "Ask Lovli" },
  memory: { active: "heart", inactive: "heart-outline", label: "Memory" },
  more: { active: "grid", inactive: "grid-outline", label: "More" },
};

const TAB_BAR_PADDING = 5;
const TAB_GAP = 2;
const LASER_MAX_WIDTH = 94;
const LASER_WIDTH_RATIO = 0.76;

function GlassBackground() {
  if (Platform.OS === "ios") {
    return (
      <BlurView tint="dark" intensity={58} style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
      </BlurView>
    );
  }
  return <View style={[StyleSheet.absoluteFill, styles.glassTintFallback]} />;
}

function LiquidTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const bottom = Math.max(insets.bottom, 10);
  const [barWidth, setBarWidth] = useState(0);
  const laserX = useSharedValue(0);
  const laserWidth = useSharedValue(0);
  const glow = useSharedValue(0.45);
  const glint = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    glint.value = withRepeat(
      withTiming(1, { duration: 1550, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [glint, glow]);

  useEffect(() => {
    const routeCount = state.routes.length;
    if (!barWidth || routeCount === 0) return;

    const usableWidth = barWidth - TAB_BAR_PADDING * 2 - TAB_GAP * (routeCount - 1);
    const tabWidth = usableWidth / routeCount;
    const nextWidth = Math.min(LASER_MAX_WIDTH, tabWidth * LASER_WIDTH_RATIO);
    const activeLeft = TAB_BAR_PADDING + state.index * (tabWidth + TAB_GAP);
    const nextX = activeLeft + (tabWidth - nextWidth) / 2;

    laserX.value = withTiming(nextX, {
      duration: 360,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    laserWidth.value = withTiming(nextWidth, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [barWidth, laserWidth, laserX, state.index, state.routes.length]);

  const onTabBarLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setBarWidth((current) => (Math.abs(current - nextWidth) > 0.5 ? nextWidth : current));
  };

  const laserMoverStyle = useAnimatedStyle(() => ({
    width: laserWidth.value,
    transform: [{ translateX: laserX.value }],
    opacity: laserWidth.value > 0 ? 1 : 0,
  }));

  const laserHaloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.34,
    transform: [{ scaleX: 0.92 + glow.value * 0.14 }],
  }));

  const laserCoreStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + glow.value * 0.2,
  }));

  const laserGlintStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + glow.value * 0.36,
    transform: [{ translateX: -18 + glint.value * (laserWidth.value + 36) }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.tabShell, { bottom }]}>
      <View style={styles.tabBar} onLayout={onTabBarLayout}>
        <GlassBackground />
        <View pointerEvents="none" style={styles.laserLayer}>
          <View style={styles.laserRail} />
          <Animated.View pointerEvents="none" style={[styles.laserMover, laserMoverStyle]}>
            <Animated.View style={[styles.laserHalo, laserHaloStyle]} />
            <Animated.View style={[styles.laserCoreWrap, laserCoreStyle]}>
              <LinearGradient
                colors={[
                  "rgba(196,181,253,0)",
                  "rgba(236,230,255,0.98)",
                  "rgba(196,181,253,0)",
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View style={[styles.laserGlint, laserGlintStyle]} />
            </Animated.View>
          </Animated.View>
        </View>
        <View style={styles.tabInner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const options = descriptors[route.key]?.options ?? {};
            const label =
              typeof options.title === "string"
                ? options.title
                : TAB_ICON[route.name]?.label || route.name;
            const iconMeta = TAB_ICON[route.name] || TAB_ICON.more;
            const color = focused ? colors.lavenderText : colors.textFaint;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                android_ripple={{ color: "transparent" }}
                style={({ pressed }) => [
                  styles.tabButton,
                  focused && styles.tabButtonActive,
                  pressed && { opacity: 0.82 },
                ]}
              >
                <Ionicons
                  name={focused ? iconMeta.active : iconMeta.inactive}
                  size={route.name === "more" ? 19 : 21}
                  color={color}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  // Final PR: keep local reminder notifications in sync on (authed) app start.
  useEffect(() => {
    initNotifications();
    resyncNotificationsFromStorage();
  }, []);

  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="reply"
        options={{
          title: "Reply",
          tabBarButtonTestID: "bottom-nav-reply",
          tabBarAccessibilityLabel: "Reply tab",
        }}
      />
      <Tabs.Screen
        name="ask-lovli"
        options={{
          title: "Ask Lovli",
          tabBarButtonTestID: "bottom-nav-ask-lovli",
          tabBarAccessibilityLabel: "Ask Lovli tab",
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: "Memory",
          tabBarButtonTestID: "bottom-nav-memory",
          tabBarAccessibilityLabel: "Memory tab",
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarButtonTestID: "bottom-nav-more",
          tabBarAccessibilityLabel: "More tab",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 68,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.62,
    shadowRadius: 60,
    elevation: 18,
  },
  tabBar: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassStroke,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  glassTint: { backgroundColor: "rgba(9,10,20,0.42)" },
  glassTintFallback: { backgroundColor: "rgba(9,10,20,0.92)" },
  laserLayer: {
    position: "absolute",
    top: 4,
    left: 0,
    right: 0,
    height: 12,
    zIndex: 1,
  },
  laserRail: {
    position: "absolute",
    top: 1,
    left: 22,
    right: 22,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  laserMover: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 12,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  laserHalo: {
    position: "absolute",
    top: -3,
    left: -10,
    right: -10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.28)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 13,
  },
  laserCoreWrap: {
    width: "100%",
    height: 2,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(196,181,253,0.92)",
    shadowColor: "#E9DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  laserGlint: {
    position: "absolute",
    top: -1,
    left: 0,
    width: 18,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
  tabInner: { flex: 1, flexDirection: "row", padding: TAB_BAR_PADDING, gap: TAB_GAP, zIndex: 2 },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 21,
    minWidth: 0,
  },
  tabButtonActive: {
    backgroundColor: "rgba(167,139,250,0.10)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.28)",
  },
  tabLabel: {
    fontFamily: typography.fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textFaint,
  },
  tabLabelActive: {
    fontFamily: typography.fonts.bodyBold,
    color: colors.lavenderText,
  },
});
