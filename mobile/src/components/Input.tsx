// Input — V3 dark glass field.
import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, space, typography } from "@/src/theme";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  multiline?: boolean;
  inputTestID?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, helper, containerStyle, multiline, inputTestID, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        cursorColor={colors.violet}
        selectionColor={colors.violet}
        {...rest}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        testID={inputTestID}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          style,
        ]}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    ...typography.body.label,
    color: colors.textPrimary,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: space.l,
    paddingVertical: 14,
    ...typography.body.base,
    color: colors.textPrimary,
    minHeight: 50,
  },
  multiline: {
    minHeight: 96,
    paddingTop: space.m,
    textAlignVertical: "top",
  },
  focused: {
    borderColor: "rgba(167,139,250,0.42)",
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  helper: {
    ...typography.body.caption,
    color: colors.textSecondary,
    marginLeft: 2,
    marginTop: 2,
  },
});
