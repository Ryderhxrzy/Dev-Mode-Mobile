import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { OnboardingProvider, useOnboarding } from '@/state/onboarding';
import { useTheme } from '@/theme';

// Keep the splash visible until we know whether to show onboarding.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <OnboardingProvider>
        <RootStack />
      </OnboardingProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { complete } = useOnboarding();
  const t = useTheme();

  useEffect(() => {
    if (complete !== null) SplashScreen.hideAsync();
  }, [complete]);

  if (complete === null) return null;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: t.bg },
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTintColor: t.primary,
        headerTitleStyle: { color: t.text, fontWeight: '800' },
      }}>
      <Stack.Protected guard={!complete}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={complete}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="setup" options={{ title: 'ADB setup', headerBackTitle: 'Dashboard' }} />
      </Stack.Protected>
    </Stack>
  );
}
