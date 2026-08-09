// AmbientGlow — large radial lavender glow for hero/emotional screens
// (Welcome, Generating, Premium). Pulses opacity .5→1 (~3s ease-in-out loop).
// radial-gradient(closest-side, rgba(139,92,246,.27), rgba(56,189,248,.05) 72%, transparent)
import React, { useEffect } from "react";
import { ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

type Props = {
  size?: number;
  style?: ViewStyle;
};

export function AmbientGlow({ size = 400, style }: Props) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, aStyle, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="lovliAmbient" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.27" />
            <Stop offset="0.72" stopColor="#38BDF8" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#lovliAmbient)" />
      </Svg>
    </Animated.View>
  );
}
