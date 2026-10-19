import type { AppPermissionInfo, InstalledApp } from '@/modules/dev-toggle-native';

export type PrivacyPermissionStatus = 'allowed' | 'denied' | 'restricted';
export type PrivacySensitivity = 'high' | 'medium' | 'low';
export type PrivacyCategoryId = 'location' | 'camera_microphone' | 'files_notifications' | 'device_activity';
export type PrivacyViewMode = 'simple' | 'advanced';
export type PrivacyIconId =
  | 'location'
  | 'camera'
  | 'microphone'
  | 'image'
  | 'video'
  | 'music'
  | 'folder'
  | 'bell'
  | 'contacts'
  | 'calendar'
  | 'phone'
  | 'message'
  | 'sensor'
  | 'bluetooth'
  | 'wifi'
  | 'activity'
  | 'lock';

/**
 * How a user can control a permission:
 * - individual: normal runtime permission, can be allowed/denied by itself.
 * - special_access: managed from Android's "Special app access" screens.
 * - automatic: granted at install, Android gives no on/off switch.
 * - system_only: only the system or apps signed with the same key can hold it.
 */
export type PrivacyControlType = 'individual' | 'special_access' | 'automatic' | 'system_only';

export interface PrivacyPermission extends AppPermissionInfo {
  id: string;
  displayName: string;
  status: PrivacyPermissionStatus;
  explanation: string;
  privacyNote: string;
  howToControl: string;
  controlType: PrivacyControlType;
  canDisableIndividually: boolean;
  dependencies: string[];
  icon: PrivacyIconId;
  sensitivity: PrivacySensitivity;
  /** True when the explanation comes from the offline catalog rather than the generic fallback. */
  catalogued: boolean;
}

export interface PrivacyPermissionCategory {
  id: PrivacyCategoryId;
  title: string;
  description: string;
  risk: PrivacySensitivity;
  permissions: PrivacyPermission[];
}

export interface PrivacyPermissionSummary {
  allowed: number;
  denied: number;
  restricted: number;
  attention: number;
  total: number;
}

export interface PrivacyAppReport extends InstalledApp {
  targetSdk: number;
  categories: PrivacyPermissionCategory[];
  summary: PrivacyPermissionSummary;
}

export type PrivacyAppFilter = 'all' | 'attention' | 'allowed' | 'system';
