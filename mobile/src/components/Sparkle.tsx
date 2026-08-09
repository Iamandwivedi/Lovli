// Violet ✦ four-point sparkle — Lovli's AI signature mark.
// Used on the logo, on Generate CTAs, in loading states, on AI message bubbles.
// SVG for crisp rendering at any size.
import React from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { colors } from "@/src/theme";
import { useEffect } from "react";

interface SparkleProps {
  size?: number;
  color?: string;
  /** When true, the sparkle gently pulses — use in loading states & on Generate CTAs. */
  animated?: boolean;
  /** Optional soft halo behind the sparkle. */
  glow?: boolean;
}

export function Sparkle({
  size = 16,
  color = colors.sparkle,
  animated = false,
  glow = false,
}: SparkleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    scale.value = withRepeat(
      withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(0.75, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [animated, scale, opacity]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animated ? aStyle : undefined}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {glow ? (
          <Defs>
            <RadialGradient id="haloGrad" cx="12" cy="12" r="12" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={color} stopOpacity="0.55" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
        ) : null}
        {glow ? <Circle cx="12" cy="12" r="12" fill="url(#haloGrad)" /> : null}
        <Path
          // 4-point sparkle: tall vertical lens + horizontal lens, intersecting.
          d="M12 1.5 C 12.6 6 13.5 8.7 18 9.6 C 22.5 10.5 22.5 13.5 18 14.4 C 13.5 15.3 12.6 18 12 22.5 C 11.4 18 10.5 15.3 6 14.4 C 1.5 13.5 1.5 10.5 6 9.6 C 10.5 8.7 11.4 6 12 1.5 Z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}
