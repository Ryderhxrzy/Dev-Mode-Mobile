import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { OnboardingProvider, useOnboarding } from '@/state/onboarding';
import { useTheme } from '@/theme';

// Prevent splash screen from auto-hiding until fonts and onboarding state are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="light" />
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
    if (complete !== null) {
      SplashScreen.hideAsync();
    }
  }, [complete]);

  if (complete === null) return null;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: t.bg },
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTintColor: t.primaryLight,
        headerTitleStyle: {
          color: t.textPrimary,
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 18,
        },
      }}>
      <Stack.Protected guard={!complete}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={complete}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="setup"
          options={{
            title: 'ADB Authorization',
            headerBackTitle: 'Dev Mode',
          }}
        />
        <Stack.Screen
          name="dev-settings"
          options={{
            title: 'Developer Settings',
            headerBackTitle: 'Dev Mode',
          }}
        />
        <Stack.Screen
          name="success"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
