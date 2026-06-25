// Input — light variant per PR2.1.
// White field, hairline border, radius 16; focus border violet #7C5CFF.
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
import { colors, radii, space, typography } from "@/src/theme";

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
    ...typography.body.label,
    color: colors.textPrimary,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.input,
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
    borderColor: colors.violet,
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
