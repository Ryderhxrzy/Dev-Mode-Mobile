import { requireOptionalNativeModule } from 'expo-modules-core';

export type SettingName = 'developerOptions' | 'usbDebugging' | 'wirelessDebugging';
export type SettingState = 'enabled' | 'disabled' | 'unknown';
export type PermissionStatus = 'granted' | 'denied' | 'unknown';
export type DeviceStatus = Record<SettingName, SettingState> & {
  writeSecureSettings: PermissionStatus;
  nativeAvailable: boolean;
};
type Result = { opened?: boolean; changed?: boolean; message: string };

type NativeModule = {
  getStatus(): Promise<DeviceStatus>;
  getPermissionStatus(): Promise<PermissionStatus>;
  openSettings(setting: SettingName): Promise<Result>;
  setEnabled(setting: SettingName, enabled: boolean): Promise<Result>;
  getOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<boolean>;
};

const native = requireOptionalNativeModule<NativeModule>('DevToggle');
const NEEDS_BUILD = 'This feature requires an Android development or production build.';

export const UNAVAILABLE_STATUS: DeviceStatus = {
  developerOptions: 'unknown',
  usbDebugging: 'unknown',
  wirelessDebugging: 'unknown',
  writeSecureSettings: 'unknown',
  nativeAvailable: false,
};

// In-memory fallback when the native module is missing (e.g. Expo Go).
let memoryOnboarding = false;

export default {
  getStatus: async (): Promise<DeviceStatus> => (native ? native.getStatus() : UNAVAILABLE_STATUS),
  getPermissionStatus: async (): Promise<PermissionStatus> =>
    native ? native.getPermissionStatus() : 'unknown',
  openSettings: async (setting: SettingName): Promise<Result> =>
    native ? native.openSettings(setting) : { opened: false, message: NEEDS_BUILD },
  setEnabled: async (setting: SettingName, enabled: boolean): Promise<Result> =>
    native ? native.setEnabled(setting, enabled) : { changed: false, message: NEEDS_BUILD },
  getOnboardingComplete: async (): Promise<boolean> => {
    if (!native?.getOnboardingComplete) return memoryOnboarding;
    try {
      return await native.getOnboardingComplete();
    } catch {
      return memoryOnboarding;
    }
  },
  setOnboardingComplete: async (complete: boolean): Promise<void> => {
    memoryOnboarding = complete;
    try {
      await native?.setOnboardingComplete?.(complete);
    } catch {
      // Keep the in-memory value; the user can still use the app this session.
    }
  },
};
