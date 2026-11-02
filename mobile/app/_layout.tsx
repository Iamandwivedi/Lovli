// Root layout: wraps the app in providers, loads Lovli fonts, configures Stack routes.
// Fonts are the real families the theme tokens name (Bricolage Grotesque for
// display, Outfit for body), loaded from their expo-google-fonts packages.
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
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
      BricolageGrotesque_600SemiBold,
      BricolageGrotesque_700Bold,
      Outfit_400Regular,
      Outfit_500Medium,
      Outfit_600SemiBold,
      Outfit_700Bold,
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
