// Screen scaffold: V3 dark iOS canvas + safe area + scrollable content.
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, space } from "@/src/theme/colors";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  keyboardAvoiding?: boolean;
  bottomTabSpacing?: boolean;
  testID?: string;
};

const TAB_BAR_SPACE = 126; // floating glass tab bar + safe area + breathing room

export const Screen: React.FC<Props> = ({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  scrollProps,
  keyboardAvoiding = true,
  bottomTabSpacing = false,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPad = bottomTabSpacing ? TAB_BAR_SPACE : Math.max(insets.bottom, space.l);

  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: bottomPad },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lavender}
            colors={[colors.lavender]}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: bottomPad, flex: 1 },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <LinearGradient
      colors={gradients.screen}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
      testID={testID}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: space.l,
  },
});
