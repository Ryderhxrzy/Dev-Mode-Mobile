import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
}

export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/android-icon-background.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* High-contrast translucent overlay to guarantee readability of cards and text */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050D0A',
  },
  overlay: {
    backgroundColor: 'rgba(5, 13, 10, 0.72)',
  },
});
