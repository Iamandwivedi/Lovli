import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@/theme';
import { BOTTOM_TABS, BottomTab } from '@/constants/product';
import { Icon, IconName } from './Icon';

// Custom 2-segment tab bar. Per-segment indicator math (no 3-segment hardcoding).
// Note: the live navigation uses expo-router's <Tabs> in app/(tabs)/_layout.tsx;
// this component is kept for screens that want the same look outside the
// router (kept in sync visually).
const TAB_ICONS: Record<BottomTab, { idle: IconName; active: IconName }> = {
  Reply: { idle: 'message-circle', active: 'message-circle' },
  Pro: { idle: 'star', active: 'star' },
  Memory: { idle: 'bookmark', active: 'bookmark' },
};

interface BottomNavProps {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
}

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const activeIndex = BOTTOM_TABS.indexOf(activeTab);
  const indicatorLeft = useSharedValue(activeIndex);

  // Per-segment width. Avoids the old 3-segment hardcoded math.
  const TAB_WIDTH = 100 / BOTTOM_TABS.length;

  useDerivedValue(() => {
    indicatorLeft.value = withTiming(BOTTOM_TABS.indexOf(activeTab), {
      duration: 240,
    });
  }, [activeTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicatorLeft.value * TAB_WIDTH}%`,
    width: `${TAB_WIDTH}%`,
  }));

  function handlePress(tab: BottomTab) {
    Haptics.selectionAsync().catch(() => {});
    onTabPress(tab);
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {BOTTOM_TABS.map(tab => {
        const isActive = tab === activeTab;
        const iconName = isActive ? TAB_ICONS[tab].active : TAB_ICONS[tab].idle;
        return (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => handlePress(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab}
          >
            <Icon
              name={iconName}
              size={20}
              color={isActive ? colors.lavender : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.navBackdrop,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingBottom: Platform.OS === 'ios' ? 0 : spacing[2],
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 2,
    backgroundColor: colors.lavender,
    borderRadius: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: 4,
  },
  label: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 11,
  },
  labelActive: {
    color: colors.lavender,
  },
});
