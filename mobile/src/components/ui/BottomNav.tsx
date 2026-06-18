import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@/theme';
import { BOTTOM_TABS, BottomTab } from '@/constants/product';

const TAB_ICONS: Record<BottomTab, string> = {
  Reply: '💬',
  Pro: '✦',
  Memory: '◎',
};

interface BottomNavProps {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
}

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const activeIndex = BOTTOM_TABS.indexOf(activeTab);
  const indicatorLeft = useSharedValue(activeIndex);

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

  return (
    <View style={styles.root}>
      {/* Gliding lavender indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {BOTTOM_TABS.map(tab => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => onTabPress(tab)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {TAB_ICONS[tab]}
            </Text>
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
    gap: 3,
  },
  icon: {
    fontSize: 18,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
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
