import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  noStageWash?: boolean;
}

// Stage background with radial-like lavender/sky wash (simulated via overlays)
export function Screen({ children, style, edges = ['top', 'bottom'], noStageWash = false }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {!noStageWash && (
        <>
          {/* Top-left lavender wash */}
          <View style={styles.washLavender} pointerEvents="none" />
          {/* Bottom-right sky wash */}
          <View style={styles.washSky} pointerEvents="none" />
        </>
      )}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  washLavender: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.stageWashLavender,
    opacity: 0.24,
    // RN doesn't support radial gradient — this approximates it
  },
  washSky: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.stageWashSky,
    opacity: 0.14,
  },
});
