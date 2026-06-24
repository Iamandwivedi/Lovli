// Root layout — wraps the app in providers, loads Lovli fonts, configures Stack routes.
import "react-native-gesture-handler";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "@/src/context/AuthContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { colors } from "@/src/theme/colors";

// Keep splash visible until fonts are ready so we never flash unstyled text.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Font.loadAsync({
      // Clash Display — bundled TTFs under /assets/fonts
      "ClashDisplay-Bold": require("../assets/fonts/ClashDisplay-Bold.ttf"),
      "ClashDisplay-Semibold": require("../assets/fonts/ClashDisplay-Semibold.ttf"),
      "ClashDisplay-Medium": require("../assets/fonts/ClashDisplay-Medium.ttf"),
      // Plus Jakarta Sans — via @expo-google-fonts
      PlusJakartaSans_400Regular,
      PlusJakartaSans_500Medium,
      PlusJakartaSans_600SemiBold,
      PlusJakartaSans_700Bold,
    })
      .catch(() => {})
      .finally(() => {
        if (mounted) setFontsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onLayout = useCallback(async () => {
    if (fontsReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: "fade",
              }}
            />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
