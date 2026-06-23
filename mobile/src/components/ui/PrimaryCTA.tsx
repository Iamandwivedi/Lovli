import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, shadows } from '@/theme';

interface PrimaryCTAProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// White pill primary CTA with a soft, premium glow.
// The glow is layered as a faint lavender wash + a real platform shadow so it
// reads as ambient light on iOS and a subtle elevation on Android — closer
// to Apple-grade than the previous solid lavender oval behind the pill.
export function PrimaryCTA({ label, onPress, loading = false, disabled = false, style }: PrimaryCTAProps) {
  const scale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.55);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 380 });
    haloOpacity.value = withTiming(1, { duration: 140 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 18, stiffness: 380 });
    haloOpacity.value = withTiming(0.55, { duration: 200 });
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      {!disabled && <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />}
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
  // Soft halo. iOS: a low-opacity lavender tint with a large blurred shadow.
  // Android: same tint at slightly higher opacity + elevation (no blur).
  halo: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: -8,
    right: -8,
    borderRadius: 999,
    backgroundColor: colors.ctaGlow, // rgba(167,139,250,0.24)
    ...Platform.select({
      ios: {
        shadowColor: colors.lavender,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 22,
      },
      android: {
        elevation: 8,
      },
    }),
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
