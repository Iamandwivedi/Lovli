// Root layout — wraps the app in providers, loads Lovli fonts, configures Stack routes.
// V3 maps the mock typography families to bundled fonts: Bricolage-style
// display from local Clash Display, Outfit-style UI from Plus Jakarta Sans.
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
import { AppLockGate } from "@/src/components/AppLockGate";
import { colors } from "@/src/theme/colors";

// Keep splash visible until fonts are ready so we never flash unstyled text.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Font.loadAsync({
      BricolageGrotesque_600SemiBold: require("../assets/fonts/ClashDisplay-Semibold.ttf"),
      BricolageGrotesque_700Bold: require("../assets/fonts/ClashDisplay-Bold.ttf"),
      Outfit_400Regular: PlusJakartaSans_400Regular,
      Outfit_500Medium: PlusJakartaSans_500Medium,
      Outfit_600SemiBold: PlusJakartaSans_600SemiBold,
      Outfit_700Bold: PlusJakartaSans_700Bold,
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
            <AppLockGate>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: "fade",
                }}
              />
            </AppLockGate>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
