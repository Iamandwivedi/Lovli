// Dark inset input with optional label / helper. Auto focus border lavender.
import React, { forwardRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

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
        cursorColor={colors.lavender}
        selectionColor={colors.lavender}
        {...rest}
        multiline={multiline}
        onFocus={(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
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
    color: colors.textSoft,
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: space.l,
    paddingVertical: 14,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 48,
  },
  multiline: {
    minHeight: 96,
    paddingTop: space.m,
    textAlignVertical: "top",
  },
  focused: {
    borderColor: colors.lavender,
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  helper: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: 2,
    marginTop: 2,
  },
});
