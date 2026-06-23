// Screen scaffold: dark background + safe area + scrollable content.
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
import { colors, space } from "@/src/theme/colors";

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

const TAB_BAR_SPACE = 132; // bottom tab bar height + safe area + breathing room

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
        { paddingTop: insets.top + space.s, paddingBottom: bottomPad },
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
        { paddingTop: insets.top + space.s, paddingBottom: bottomPad, flex: 1 },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root} testID={testID}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: space.l,
    gap: space.l,
  },
});
