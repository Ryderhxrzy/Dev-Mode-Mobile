import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}><StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} /><Stack><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="setup" options={{ title: 'ADB setup', headerBackTitle: 'Dashboard' }} /></Stack></ThemeProvider>;
}
