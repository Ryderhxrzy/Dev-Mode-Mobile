import type { AppDetailsResult, InstalledApp } from '@/modules/dev-toggle-native';
import type { PrivacyAppReport } from './types';

/**
 * In-memory cache for the Privacy Inspector. It lives for as long as the JS runtime does, so
 * re-opening the screen shows the previous app list and totals instantly while a background
 * refresh runs. Nothing is written to disk and nothing leaves the device.
 */
export const FRESH_FOR_MS = 5 * 60 * 1000;

type PrivacyCache = {
  apps: InstalledApp[];
  reports: Record<string, PrivacyAppReport>;
  failures: Record<string, boolean>;
  details: Record<string, AppDetailsResult>;
  savedAt: number;
};

export const privacyCache: PrivacyCache = {
  apps: [],
  reports: {},
  failures: {},
  details: {},
  savedAt: 0,
};

export function hasFreshCompleteScan() {
  if (privacyCache.apps.length === 0 || Date.now() - privacyCache.savedAt > FRESH_FOR_MS) return false;
  return privacyCache.apps.every(app => privacyCache.reports[app.packageName] || privacyCache.failures[app.packageName]);
}

