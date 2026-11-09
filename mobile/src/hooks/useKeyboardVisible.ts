// Keyboard visibility as a boolean. iOS fires the "will" events so the layout
// can change in step with the keyboard animation; Android only has "did".
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export const useKeyboardVisible = (): boolean => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
};
