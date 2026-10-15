import React from 'react';
import { ScreenBackground } from '@/components/ScreenBackground';
import { DevSettingsView } from '@/views/DevSettingsView';

export default function DevSettingsScreen() {
  return (
    <ScreenBackground>
      <DevSettingsView />
    </ScreenBackground>
  );
}
