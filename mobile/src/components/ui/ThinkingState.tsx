import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@/theme';

const PHASES = [
  'Reading your chat…',
  'Finding the right tone…',
  'Crafting your replies…',
];

interface ThinkingStateProps {
  visible: boolean;
}

export function ThinkingState({ visible }: ThinkingStateProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const textOpacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    setPhaseIndex(0);
    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 120 }, () => {
        // Switch phase on JS thread after fade
      });
      setTimeout(() => {
        setPhaseIndex(i => Math.min(i + 1, PHASES.length - 1));
        textOpacity.value = withTiming(1, { duration: 120 });
      }, 120);
    }, 1600);
    return () => clearInterval(interval);
  }, [visible]);

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  if (!visible) return null;

  return (
    <View style={styles.root}>
      {/* 3 breathing dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <MotiView
            key={i}
            from={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.1 }}
            transition={{
              type: 'timing',
              duration: 800,
              loop: true,
              delay: i * 200,
            }}
            style={styles.dot}
          />
        ))}
      </View>

      {/* Phase microcopy */}
      <Animated.Text style={[styles.phase, textStyle]}>
        {PHASES[phaseIndex]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lavender,
  },
  phase: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 13,
  },
});
