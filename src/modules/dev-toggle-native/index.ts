import { requireOptionalNativeModule } from 'expo-modules-core';

export type SettingName = 'developerOptions' | 'usbDebugging' | 'wirelessDebugging';
export type ExtraSettingName = 'stayAwake' | 'showTouches' | 'pointerLocation' | 'keepWirelessOn';
// Web Remote Dashboard disabled: | 'webRemote' | 'autoWirelessConnect'
export type SettingState = 'enabled' | 'disabled' | 'unknown';
export type PermissionStatus = 'granted' | 'denied' | 'unknown';

export type NotificationMode = 'always' | 'when_dev_active' | 'disabled';

export type PerformanceMetrics = {
  cpu: { cores: number };
  ram: { totalMb: number; usedMb: number; availableMb: number; percentage: number };
  battery: { level: number; temperature: number; voltage: number; isCharging: boolean; plugged: string; health: string };
  thermal: { status: string };
};

export type DeviceInfo = {
  model: string;
  manufacturer: string;
  brand: string;
  androidVersion: string;
  sdkInt: number;
  ip: string;
  port: number;
};

export type DeviceStatus = Record<SettingName, SettingState> & {
  writeSecureSettings: PermissionStatus;
  shizukuStatus?: 'unavailable' | 'needs_permission' | 'authorized';
  nativeAvailable: boolean;
  wirelessEndpoint?: string | null;
  notificationMode?: NotificationMode;
};

export type AnimationScales = {
  window: number;
  transition: number;
  animator: number;
};

// MediaProjection disabled.
// export type ScreenMirrorStatus = {
//   streaming: boolean;
//   width: number;
//   height: number;
//   streamUrl: string;
// };

type Result = { opened?: boolean; changed?: boolean; message: string };

export type InstalledApp = {
  packageName: string;
  appName: string;
  isSystem: boolean;
  icon?: string;
};

export type AppShieldSettings = {
  enabled: boolean;
  hasUsageAccess: boolean;
  protectedPackages: string[];
};

type NativeModule = {
  getStatus(): Promise<DeviceStatus>;
  getPermissionStatus(): Promise<PermissionStatus>;
  openSettings(setting: SettingName): Promise<Result>;
  setEnabled(setting: SettingName, enabled: boolean): Promise<Result>;
  getOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<boolean>;
  getAnimationScales(): Promise<AnimationScales>;
  setAnimationScale(type: string, scale: number): Promise<Result>;
  getExtraSettings(): Promise<Record<ExtraSettingName, SettingState>>;
  setExtraSetting(setting: ExtraSettingName, enabled: boolean): Promise<Result>;
  getWirelessEndpoint?(): Promise<string | null>;
  getNotificationMode?(): Promise<NotificationMode>;
  getShizukuStatus?(): Promise<'unavailable' | 'needs_permission' | 'authorized'>;
  requestShizukuPermission?(): Promise<boolean>;
  openShizuku?(): Promise<boolean>;
  setNotificationMode?(mode: NotificationMode): Promise<{ mode: NotificationMode; success: boolean }>;
  hasNotificationPermission?(): Promise<boolean>;
  requestNotificationPermission?(): Promise<boolean>;
  getPerformanceMetrics?(): Promise<string>;
  getDeviceInfo?(): Promise<string>;
  // MediaProjection disabled.
  // isScreenMirroring?(): Promise<boolean>;
  // startScreenMirror?(): Promise<boolean>;
  // stopScreenMirror?(): Promise<boolean>;
  // getScreenMirrorUrl?(): Promise<string>;
  // getScreenMirrorStatus?(): Promise<ScreenMirrorStatus>;
  getLanguagePreference?(): Promise<string>;
  setLanguagePreference?(language: string): Promise<boolean>;
  canWriteSystemSettings?(): Promise<boolean>;
  openWriteSettingsPermission?(): Promise<boolean>;
  downloadTranslationModel?(language: string): Promise<boolean>;
  isTranslationModelDownloaded?(language: string): Promise<boolean>;
  translateText?(text: string, language: string): Promise<string>;
  getAppShieldSettings?(): Promise<AppShieldSettings>;
  setAppShieldEnabled?(enabled: boolean): Promise<boolean>;
  setProtectedPackages?(packages: string[]): Promise<boolean>;
  getInstalledApps?(): Promise<InstalledApp[]>;
  openUsageAccessSettings?(): Promise<boolean>;
  launchProtectedApp?(packageName: string): Promise<boolean>;
  createShieldedShortcut?(packageName: string): Promise<boolean>;
  openBatteryOptimizationSettings?(): Promise<boolean>;
  openAppDetailsSettings?(): Promise<boolean>;
  isWidgetPinningSupported?(): boolean;
  pinShieldWidget1x1?(packageName: string): Promise<boolean>;
  pinShieldWidget3x1?(): Promise<boolean>;
};

const native = requireOptionalNativeModule<NativeModule>('DevToggle');
const NEEDS_BUILD = 'This feature requires an Android development or production build.';

export const UNAVAILABLE_STATUS: DeviceStatus = {
  developerOptions: 'unknown',
  usbDebugging: 'unknown',
  wirelessDebugging: 'unknown',
  wirelessEndpoint: null,
  writeSecureSettings: 'unknown',
  nativeAvailable: false,
  shizukuStatus: 'unavailable',
};

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
      // In-memory fallback
    }
  },
  getAnimationScales: async (): Promise<AnimationScales> =>
    native?.getAnimationScales
      ? native.getAnimationScales()
      : { window: 1.0, transition: 1.0, animator: 1.0 },
  setAnimationScale: async (type: string, scale: number): Promise<Result> =>
    native?.setAnimationScale
      ? native.setAnimationScale(type, scale)
      : { changed: false, message: NEEDS_BUILD },
  getExtraSettings: async (): Promise<Record<ExtraSettingName, SettingState>> =>
    native?.getExtraSettings
      ? native.getExtraSettings()
      : { stayAwake: 'unknown', showTouches: 'unknown', pointerLocation: 'unknown', keepWirelessOn: 'unknown' },
  setExtraSetting: async (setting: ExtraSettingName, enabled: boolean): Promise<Result> =>
    native?.setExtraSetting
      ? native.setExtraSetting(setting, enabled)
      : { changed: false, message: NEEDS_BUILD },
  getWirelessEndpoint: async (): Promise<string | null> =>
    native?.getWirelessEndpoint ? native.getWirelessEndpoint() : null,
  getNotificationMode: async (): Promise<NotificationMode> =>
    native?.getNotificationMode ? native.getNotificationMode() : 'disabled',
  setNotificationMode: async (
    mode: NotificationMode
  ): Promise<{ mode: NotificationMode; success: boolean }> =>
    native?.setNotificationMode ? native.setNotificationMode(mode) : { mode, success: true },
  getShizukuStatus: async (): Promise<'unavailable' | 'needs_permission' | 'authorized'> =>
    native?.getShizukuStatus ? native.getShizukuStatus() : 'unavailable',
  requestShizukuPermission: async (): Promise<boolean> =>
    native?.requestShizukuPermission ? native.requestShizukuPermission() : false,
  openShizuku: async (): Promise<boolean> =>
    native?.openShizuku ? native.openShizuku() : false,
  hasNotificationPermission: async (): Promise<boolean> =>
    native?.hasNotificationPermission ? native.hasNotificationPermission() : true,
  requestNotificationPermission: async (): Promise<boolean> =>
    native?.requestNotificationPermission ? native.requestNotificationPermission() : true,
  getPerformanceMetrics: async (): Promise<PerformanceMetrics | null> => {
    if (!native?.getPerformanceMetrics) return null;
    try {
      const res = await native.getPerformanceMetrics();
      return typeof res === 'string' ? JSON.parse(res) : (res as PerformanceMetrics);
    } catch {
      return null;
    }
  },
  getDeviceInfo: async (): Promise<DeviceInfo | null> => {
    if (!native?.getDeviceInfo) return null;
    try {
      const res = await native.getDeviceInfo();
      return typeof res === 'string' ? JSON.parse(res) : (res as DeviceInfo);
    } catch {
      return null;
    }
  },
  // MediaProjection disabled.
  // isScreenMirroring: async (): Promise<boolean> =>
  //   native?.isScreenMirroring ? native.isScreenMirroring() : false,
  // startScreenMirror: async (): Promise<boolean> =>
  //   native?.startScreenMirror ? native.startScreenMirror() : false,
  // stopScreenMirror: async (): Promise<boolean> =>
  //   native?.stopScreenMirror ? native.stopScreenMirror() : false,
  // getScreenMirrorUrl: async (): Promise<string> =>
  //   native?.getScreenMirrorUrl ? native.getScreenMirrorUrl() : '',
  // getScreenMirrorStatus: async (): Promise<ScreenMirrorStatus> =>
  //   native?.getScreenMirrorStatus
  //     ? native.getScreenMirrorStatus()
  //     : { streaming: false, width: 540, height: 1170, streamUrl: '' },
  getLanguagePreference: async (): Promise<string> =>
    native?.getLanguagePreference ? native.getLanguagePreference() : 'auto',
  setLanguagePreference: async (language: string): Promise<boolean> =>
    native?.setLanguagePreference ? native.setLanguagePreference(language) : false,
  canWriteSystemSettings: async (): Promise<boolean> =>
    native?.canWriteSystemSettings ? native.canWriteSystemSettings() : false,
  openWriteSettingsPermission: async (): Promise<boolean> =>
    native?.openWriteSettingsPermission ? native.openWriteSettingsPermission() : false,
  downloadTranslationModel: async (language: string): Promise<boolean> =>
    native?.downloadTranslationModel ? native.downloadTranslationModel(language) : false,
  isTranslationModelDownloaded: async (language: string): Promise<boolean> =>
    native?.isTranslationModelDownloaded ? native.isTranslationModelDownloaded(language) : false,
  translateText: async (text: string, language: string): Promise<string> =>
    native?.translateText ? native.translateText(text, language) : text,
  getAppShieldSettings: async (): Promise<AppShieldSettings> =>
    native?.getAppShieldSettings
      ? native.getAppShieldSettings()
      : { enabled: false, hasUsageAccess: false, protectedPackages: [] },
  setAppShieldEnabled: async (enabled: boolean): Promise<boolean> =>
    native?.setAppShieldEnabled ? native.setAppShieldEnabled(enabled) : false,
  setProtectedPackages: async (packages: string[]): Promise<boolean> =>
    native?.setProtectedPackages ? native.setProtectedPackages(packages) : false,
  getInstalledApps: async (): Promise<InstalledApp[]> =>
    native?.getInstalledApps ? native.getInstalledApps() : [],
  openUsageAccessSettings: async (): Promise<boolean> =>
    native?.openUsageAccessSettings ? native.openUsageAccessSettings() : false,
  launchProtectedApp: async (packageName: string): Promise<boolean> =>
    native?.launchProtectedApp ? native.launchProtectedApp(packageName) : false,
  createShieldedShortcut: async (packageName: string): Promise<boolean> =>
    native?.createShieldedShortcut ? native.createShieldedShortcut(packageName) : false,
  openBatteryOptimizationSettings: async (): Promise<boolean> =>
    native?.openBatteryOptimizationSettings ? native.openBatteryOptimizationSettings() : false,
  openAppDetailsSettings: async (): Promise<boolean> =>
    native?.openAppDetailsSettings ? native.openAppDetailsSettings() : false,
  isWidgetPinningSupported: (): boolean =>
    native?.isWidgetPinningSupported ? native.isWidgetPinningSupported() : false,
  pinShieldWidget1x1: async (packageName: string): Promise<boolean> =>
    native?.pinShieldWidget1x1 ? native.pinShieldWidget1x1(packageName) : false,
  pinShieldWidget3x1: async (): Promise<boolean> =>
    native?.pinShieldWidget3x1 ? native.pinShieldWidget3x1() : false,
};
