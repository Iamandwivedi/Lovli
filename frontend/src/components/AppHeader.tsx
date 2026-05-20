// Top header — Lovli icon + name + right settings icon.
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LovliLogo } from "@/src/components/LovliLogo";
import { colors, space } from "@/src/theme/colors";

type Props = {
  showSettings?: boolean;
  rightElement?: React.ReactNode;
};

export const AppHeader: React.FC<Props> = ({ showSettings = true, rightElement }) => {
  const router = useRouter();
  return (
    <View style={styles.row} testID="app-header">
      <LovliLogo size={28} />
      <View style={styles.right}>
        {rightElement}
        {showSettings ? (
          <Pressable
            onPress={() => router.push("/settings")}
            testID="open-settings-button"
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            hitSlop={10}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSoft} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.s,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
