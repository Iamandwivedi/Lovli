import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { colors, typography, shadows } from '@/theme';

interface PrimaryCTAProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryCTA({ label, onPress, loading = false, disabled = false, style }: PrimaryCTAProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.18);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    glowOpacity.value = withTiming(0.32, { duration: 120 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    glowOpacity.value = withTiming(0.18, { duration: 180 });
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      {!disabled && <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />}
      <AnimatedPressable
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {loading ? (
          <ActivityIndicator color={colors.ctaText} size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Soft halo that sits *behind* the button (contained on all sides),
  // not a separate bar protruding below it.
  glow: {
    position: 'absolute',
    top: -5,
    bottom: -5,
    left: -5,
    right: -5,
    borderRadius: 999,
    backgroundColor: colors.lavender,
    opacity: 0.18,
    // blur not supported natively — approximate
  },
  btn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...shadows.ctaGlow,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.ctaText,
    fontSize: 15,
    fontWeight: '600',
  },
});
