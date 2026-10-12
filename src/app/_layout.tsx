import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, StyleSheet, useColorScheme, View } from 'react-native';
import { useFonts } from 'expo-font';
import { OnboardingProvider, useOnboarding } from '@/state/onboarding';
import { useTheme } from '@/theme';

// Prevent splash screen from auto-hiding until fonts and onboarding state are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Require each weight directly: the package index pulls in every weight (21 fonts, ~3 MB)
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular: require('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
    SpaceGrotesk_500Medium: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
    SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
    JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_700Bold: require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
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
    <View style={layoutStyles.root}>
      <Image
        source={require('@/assets/images/android-icon-background.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#050D0A' },
          headerStyle: { backgroundColor: '#050D0A' },
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
            name="notification-settings"
            options={{
              title: 'Notification Settings',
              headerBackTitle: 'Settings',
            }}
          />
          <Stack.Screen
            name="security-settings"
            options={{
              title: 'Security & Privacy',
              headerBackTitle: 'Settings',
            }}
          />
          <Stack.Screen
            name="widget-settings"
            options={{
              title: 'Home Screen Widgets',
              headerBackTitle: 'Settings',
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
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050D0A',
  },
});
