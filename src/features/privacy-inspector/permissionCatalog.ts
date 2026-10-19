import type { AppPermissionInfo, AppPermissionsResult, InstalledApp } from '@/modules/dev-toggle-native';
import type {
  PrivacyAppReport,
  PrivacyCategoryId,
  PrivacyControlType,
  PrivacyIconId,
  PrivacyPermission,
  PrivacyPermissionCategory,
  PrivacySensitivity,
} from './types';

/**
 * Offline permission explanation catalog.
 *
 * Wording rules: a permission only describes what an app is ALLOWED to do. Nothing here
 * (or in the UI) may claim that an app has actually used the permission or sent data anywhere.
 */
type CatalogEntry = {
  category: PrivacyCategoryId;
  sensitivity: PrivacySensitivity;
  icon: PrivacyIconId;
  /** Plain-English name shown in Simple view. */
  title: string;
  /** What the permission lets the app do. */
  explanation: string;
  /** Why it matters for privacy, without implying real use. */
  privacyNote: string;
  control: PrivacyControlType;
  /** Overrides the default "how to control" text for the control type. */
  howToControl?: string;
  /** Plain-English notes about related permissions. */
  dependencies?: string[];
};

const CATEGORY_META: Record<PrivacyCategoryId, Omit<PrivacyPermissionCategory, 'permissions'>> = {
  location: { id: 'location', title: 'Location', description: 'Where this device is, or where a photo was taken.', risk: 'high' },
  camera_microphone: { id: 'camera_microphone', title: 'Camera & Microphone', description: 'Taking photos, video, or recording sound.', risk: 'high' },
  files_notifications: { id: 'files_notifications', title: 'Photos, Files & Notifications', description: 'Your media, stored files, and alerts from the app.', risk: 'medium' },
  device_activity: { id: 'device_activity', title: 'Device, People & Activity', description: 'Contacts, calls, messages, sensors, nearby devices, and everything else.', risk: 'medium' },
};

const DEFAULT_CONTROL: Record<PrivacyControlType, string> = {
  individual: "Open Settings › Apps › this app › Permissions, choose this permission, then pick \"Don't allow\". Some Android versions also offer \"Ask every time\" or \"Only while using the app\".",
  special_access: 'This is a special access setting. Open Settings › Apps › Special app access (the name varies by phone), choose the matching entry, and switch this app off.',
  automatic: 'Android grants this automatically when the app is installed and does not offer an on/off switch. The only way to remove it is to uninstall or disable the app.',
  system_only: 'Normal apps cannot be given this permission by the user. It is reserved for system components or apps signed by the same developer, so there is nothing to switch off.',
};

const CATALOG: Record<string, CatalogEntry> = {
  ACCESS_COARSE_LOCATION: {
    category: 'location', sensitivity: 'high', icon: 'location', control: 'individual',
    title: 'Approximate location',
    explanation: 'Lets the app find roughly where you are, such as your neighbourhood or city.',
    privacyNote: 'Approximate location can still reveal where you live or spend time. Being allowed does not mean the app has read it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Location. Choose "Don\'t allow", or keep Location on and turn off "Use precise location".',
    dependencies: ['Android lets you grant approximate location without precise location. The app cannot get more detail than you allow.'],
  },
  ACCESS_FINE_LOCATION: {
    category: 'location', sensitivity: 'high', icon: 'location', control: 'individual',
    title: 'Precise location',
    explanation: 'Lets the app find your exact position, for example for maps or navigation.',
    privacyNote: 'Precise location can pinpoint a street address. Being allowed does not mean the app has read it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Location. Turn off "Use precise location" or choose "Don\'t allow".',
    dependencies: ['Works together with approximate location. On Android 12+ you can give the app approximate location only.'],
  },
  ACCESS_BACKGROUND_LOCATION: {
    category: 'location', sensitivity: 'high', icon: 'location', control: 'individual',
    title: 'Location in the background',
    explanation: 'Lets the app check your location even when you are not using it.',
    privacyNote: 'This is broader than normal location access because it is not limited to when the app is open. Being allowed does not mean the app is tracking you.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Location and choose "Allow only while using the app".',
    dependencies: ['Only useful if the app also has approximate or precise location. It adds the "all the time" part on top of those.'],
  },
  ACCESS_MEDIA_LOCATION: {
    category: 'location', sensitivity: 'high', icon: 'location', control: 'individual',
    title: 'Photo location details',
    explanation: 'Lets the app read the location tag (GPS coordinates) saved inside photos it can already see.',
    privacyNote: 'Photos can quietly store where they were taken. This permission only matters for photos the app is allowed to open.',
    howToControl: 'Open Settings › Apps › this app › Permissions, then turn off "Photos and videos" location access if shown ("Media location" on some phones).',
    dependencies: ['It does NOT give access to your photos by itself. The app also needs a photo or media permission (such as Photos & videos) to open any picture.'],
  },
  CAMERA: {
    category: 'camera_microphone', sensitivity: 'high', icon: 'camera', control: 'individual',
    title: 'Camera',
    explanation: 'Lets the app take photos or record video using your camera.',
    privacyNote: 'Android shows a green dot while the camera is in use, so you can notice it. Being allowed does not mean it has been used.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Camera and choose "Don\'t allow". You can also use the Camera privacy toggle in Quick Settings on Android 12+.',
  },
  RECORD_AUDIO: {
    category: 'camera_microphone', sensitivity: 'high', icon: 'microphone', control: 'individual',
    title: 'Microphone',
    explanation: 'Lets the app record sound through the microphone, for calls, voice notes, or voice search.',
    privacyNote: 'Android shows a green dot while the microphone is in use. Being allowed does not mean any audio has been recorded.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Microphone and choose "Don\'t allow", or use the Microphone privacy toggle on Android 12+.',
  },
  READ_EXTERNAL_STORAGE: {
    category: 'files_notifications', sensitivity: 'medium', icon: 'folder', control: 'individual',
    title: 'Read shared files (older Android)',
    explanation: 'Lets the app read photos, videos, music, and documents saved in shared storage on Android 12 and older.',
    privacyNote: 'Shared storage often holds personal files. On Android 13+ this permission is replaced by the Photos, Videos, and Music permissions.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Files and media (or Storage) and choose "Don\'t allow".',
  },
  WRITE_EXTERNAL_STORAGE: {
    category: 'files_notifications', sensitivity: 'medium', icon: 'folder', control: 'individual',
    title: 'Save or change shared files (older Android)',
    explanation: 'Lets the app add or edit files in shared storage on Android 9 and older.',
    privacyNote: 'It is mostly ignored on newer Android versions, where apps use safer storage rules.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Storage and choose "Don\'t allow".',
    dependencies: ['On Android 10 and newer this permission has little or no effect.'],
  },
  MANAGE_EXTERNAL_STORAGE: {
    category: 'files_notifications', sensitivity: 'high', icon: 'folder', control: 'special_access',
    title: 'Access to all files',
    explanation: 'Lets the app see and manage almost every file in shared storage, not only photos or media.',
    privacyNote: 'This is one of the broadest file permissions. Android makes you turn it on manually because of that.',
    howToControl: 'Open Settings › Apps › Special app access › All files access, then switch this app off.',
  },
  READ_MEDIA_IMAGES: {
    category: 'files_notifications', sensitivity: 'medium', icon: 'image', control: 'individual',
    title: 'Photos',
    explanation: 'Lets the app open the photos stored on your device (Android 13+).',
    privacyNote: 'Photos can show people, places, and documents. Being allowed does not mean the app has looked at them or copied them.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Photos and videos. Choose "Don\'t allow" or, on Android 14+, "Select photos and videos" to share only some.',
    dependencies: ['Photo location tags are only readable if the separate "Photo location details" permission is also granted.'],
  },
  READ_MEDIA_VIDEO: {
    category: 'files_notifications', sensitivity: 'medium', icon: 'video', control: 'individual',
    title: 'Videos',
    explanation: 'Lets the app open the videos stored on your device (Android 13+).',
    privacyNote: 'Being allowed does not mean the app has watched or copied your videos.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Photos and videos and choose "Don\'t allow" or limit it to selected items.',
  },
  READ_MEDIA_AUDIO: {
    category: 'files_notifications', sensitivity: 'medium', icon: 'music', control: 'individual',
    title: 'Music and audio files',
    explanation: 'Lets the app open the music and audio files stored on your device (Android 13+).',
    privacyNote: 'Audio files can include voice recordings. Being allowed does not mean the app has read them.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Music and audio and choose "Don\'t allow".',
  },
  READ_MEDIA_VISUAL_USER_SELECTED: {
    category: 'files_notifications', sensitivity: 'low', icon: 'image', control: 'individual',
    title: 'Only the photos you pick',
    explanation: 'Lets the app open just the photos and videos you choose to share with it (Android 14+).',
    privacyNote: 'This is the more private option. The app only sees what you select.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Photos and videos and change the selection or choose "Don\'t allow".',
    dependencies: ['If you pick "Allow all" instead, the full Photos permission replaces this limited access.'],
  },
  POST_NOTIFICATIONS: {
    category: 'files_notifications', sensitivity: 'low', icon: 'bell', control: 'individual',
    title: 'Notifications',
    explanation: 'Lets the app show alerts in your notification bar (Android 13+).',
    privacyNote: 'Notifications can show message previews on your lock screen. This permission does not give access to other apps\' notifications.',
    howToControl: 'Open Settings › Apps › this app › Notifications and turn them off, or hide content on the lock screen.',
  },
  READ_CONTACTS: {
    category: 'device_activity', sensitivity: 'high', icon: 'contacts', control: 'individual',
    title: 'Read your contacts',
    explanation: 'Lets the app see the names, numbers, and emails in your contacts.',
    privacyNote: 'Contacts include other people\'s details. Being allowed does not mean the app has read or uploaded them.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Contacts and choose "Don\'t allow".',
  },
  WRITE_CONTACTS: {
    category: 'device_activity', sensitivity: 'high', icon: 'contacts', control: 'individual',
    title: 'Change your contacts',
    explanation: 'Lets the app add, edit, or delete contacts.',
    privacyNote: 'The app could change your address book. This is separate from being able to read it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Contacts and choose "Don\'t allow".',
    dependencies: ['Android groups read and write contact access under one "Contacts" switch.'],
  },
  GET_ACCOUNTS: {
    category: 'device_activity', sensitivity: 'high', icon: 'contacts', control: 'individual',
    title: 'See accounts on this device',
    explanation: 'Lets the app list the accounts (such as email accounts) signed in on this device.',
    privacyNote: 'It shows which accounts exist, not their passwords or messages.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Contacts (or Accounts) and choose "Don\'t allow".',
  },
  READ_CALENDAR: {
    category: 'device_activity', sensitivity: 'high', icon: 'calendar', control: 'individual',
    title: 'Read your calendar',
    explanation: 'Lets the app see your calendar events.',
    privacyNote: 'Events can reveal your routine and who you meet. Being allowed does not mean they were read.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Calendar and choose "Don\'t allow".',
  },
  WRITE_CALENDAR: {
    category: 'device_activity', sensitivity: 'high', icon: 'calendar', control: 'individual',
    title: 'Change your calendar',
    explanation: 'Lets the app add or edit calendar events.',
    privacyNote: 'The app could add or change events. This is separate from reading them.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Calendar and choose "Don\'t allow".',
    dependencies: ['Android groups read and write calendar access under one "Calendar" switch.'],
  },
  READ_CALL_LOG: {
    category: 'device_activity', sensitivity: 'high', icon: 'phone', control: 'individual',
    title: 'Read call history',
    explanation: 'Lets the app see who you called or who called you, and when.',
    privacyNote: 'Call history shows personal relationships. Being allowed does not mean it was read.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Call logs (or Phone) and choose "Don\'t allow".',
  },
  WRITE_CALL_LOG: {
    category: 'device_activity', sensitivity: 'high', icon: 'phone', control: 'individual',
    title: 'Change call history',
    explanation: 'Lets the app add or remove entries in your call history.',
    privacyNote: 'The app could edit your call history. This is separate from reading it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Call logs (or Phone) and choose "Don\'t allow".',
  },
  READ_PHONE_STATE: {
    category: 'device_activity', sensitivity: 'high', icon: 'phone', control: 'individual',
    title: 'Phone status',
    explanation: 'Lets the app see whether a call is happening and some details about your phone line and network.',
    privacyNote: 'Newer Android versions hide permanent device identifiers from normal apps even when this is allowed.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Phone and choose "Don\'t allow".',
  },
  CALL_PHONE: {
    category: 'device_activity', sensitivity: 'high', icon: 'phone', control: 'individual',
    title: 'Start phone calls',
    explanation: 'Lets the app place a call directly, without opening the dialer first.',
    privacyNote: 'Calls could cost money. This does not let the app listen to your calls.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Phone and choose "Don\'t allow".',
  },
  READ_PHONE_NUMBERS: {
    category: 'device_activity', sensitivity: 'high', icon: 'phone', control: 'individual',
    title: 'Your phone number',
    explanation: 'Lets the app read the phone number(s) linked to this device.',
    privacyNote: 'Your number can be used to identify you. Being allowed does not mean the app has read it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Phone (or Nearby devices on some phones) and choose "Don\'t allow".',
  },
  READ_SMS: {
    category: 'device_activity', sensitivity: 'high', icon: 'message', control: 'individual',
    title: 'Read text messages',
    explanation: 'Lets the app read the text messages stored on your phone.',
    privacyNote: 'Texts often contain verification codes and private conversations. Being allowed does not mean they were read.',
    howToControl: 'Open Settings › Apps › this app › Permissions › SMS and choose "Don\'t allow". On some Android versions this is restricted for most apps.',
  },
  RECEIVE_SMS: {
    category: 'device_activity', sensitivity: 'high', icon: 'message', control: 'individual',
    title: 'Receive text messages',
    explanation: 'Lets the app be notified when a new text message arrives.',
    privacyNote: 'The app could see incoming texts, including one-time codes.',
    howToControl: 'Open Settings › Apps › this app › Permissions › SMS and choose "Don\'t allow".',
  },
  SEND_SMS: {
    category: 'device_activity', sensitivity: 'high', icon: 'message', control: 'individual',
    title: 'Send text messages',
    explanation: 'Lets the app send text messages from your number.',
    privacyNote: 'Messages could cost money. This does not by itself let the app read your texts.',
    howToControl: 'Open Settings › Apps › this app › Permissions › SMS and choose "Don\'t allow".',
  },
  BODY_SENSORS: {
    category: 'device_activity', sensitivity: 'high', icon: 'sensor', control: 'individual',
    title: 'Body sensors',
    explanation: 'Lets the app read health sensors such as heart rate from supported devices.',
    privacyNote: 'Health readings are very personal. Many phones have no such sensors.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Body sensors and choose "Don\'t allow".',
  },
  BODY_SENSORS_BACKGROUND: {
    category: 'device_activity', sensitivity: 'high', icon: 'sensor', control: 'individual',
    title: 'Body sensors in the background',
    explanation: 'Lets the app read health sensors while you are not using it.',
    privacyNote: 'Adds the "while not in use" part on top of Body sensors.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Body sensors and choose "Allow only while using the app".',
    dependencies: ['Only useful together with the regular Body sensors permission.'],
  },
  ACTIVITY_RECOGNITION: {
    category: 'device_activity', sensitivity: 'medium', icon: 'activity', control: 'individual',
    title: 'Physical activity',
    explanation: 'Lets the app know if you are walking, running, cycling, or in a vehicle, and count steps.',
    privacyNote: 'Activity patterns can reveal daily habits. Being allowed does not mean they were recorded.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Physical activity and choose "Don\'t allow".',
  },
  BLUETOOTH_SCAN: {
    category: 'device_activity', sensitivity: 'medium', icon: 'bluetooth', control: 'individual',
    title: 'Find nearby Bluetooth devices',
    explanation: 'Lets the app search for Bluetooth devices around you (Android 12+).',
    privacyNote: 'Nearby device scans can hint at where you are. Unless the app opts out, it may also be treated as location access.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Nearby devices and choose "Don\'t allow".',
    dependencies: ['Android groups Bluetooth scan, connect, and advertise under one "Nearby devices" switch.'],
  },
  BLUETOOTH_CONNECT: {
    category: 'device_activity', sensitivity: 'medium', icon: 'bluetooth', control: 'individual',
    title: 'Connect to Bluetooth devices',
    explanation: 'Lets the app connect to Bluetooth devices you have already paired, like headphones or a watch.',
    privacyNote: 'It can see your paired device names. Being allowed does not mean it has connected to anything.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Nearby devices and choose "Don\'t allow".',
  },
  BLUETOOTH_ADVERTISE: {
    category: 'device_activity', sensitivity: 'medium', icon: 'bluetooth', control: 'individual',
    title: 'Be visible to Bluetooth devices',
    explanation: 'Lets the app make this phone discoverable to nearby Bluetooth devices.',
    privacyNote: 'Nearby devices could notice your phone while this is active.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Nearby devices and choose "Don\'t allow".',
  },
  NEARBY_WIFI_DEVICES: {
    category: 'device_activity', sensitivity: 'medium', icon: 'wifi', control: 'individual',
    title: 'Find nearby Wi-Fi devices',
    explanation: 'Lets the app discover and connect to nearby Wi-Fi devices without needing location access (Android 13+).',
    privacyNote: 'It can learn about devices around you. Being allowed does not mean it has scanned.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Nearby devices and choose "Don\'t allow".',
  },
  UWB_RANGING: {
    category: 'device_activity', sensitivity: 'medium', icon: 'sensor', control: 'individual',
    title: 'Measure distance to nearby devices',
    explanation: 'Lets the app measure how far away nearby ultra-wideband devices are.',
    privacyNote: 'It can work out how close certain nearby devices are, on phones that support it.',
    howToControl: 'Open Settings › Apps › this app › Permissions › Nearby devices and choose "Don\'t allow".',
  },
};

function suffix(permissionName: string) {
  return permissionName.split('.').pop() || permissionName;
}

/** Catalog keys are Android permission suffixes, so only trust them for platform permissions. */
function lookupCatalog(permission: AppPermissionInfo): CatalogEntry | undefined {
  if (!permission.name.startsWith('android.permission.')) return undefined;
  return CATALOG[suffix(permission.name)];
}

function fallbackSensitivity(permission: AppPermissionInfo): PrivacySensitivity {
  if (permission.protectionLevel === 'dangerous') return 'medium';
  if (permission.protectionLevel === 'normal') return 'low';
  return permission.isCustom ? 'medium' : 'low';
}

function fallbackControl(permission: AppPermissionInfo): PrivacyControlType {
  if (permission.protectionLevel === 'dangerous') return 'individual';
  if (permission.protectionFlags.includes('app_op')) return 'special_access';
  if (permission.protectionLevel === 'normal') return 'automatic';
  if (permission.protectionLevel === 'unknown') return 'automatic';
  return 'system_only';
}

function fallbackExplanation(permission: AppPermissionInfo) {
  const base = permission.description
    ? `Android describes this permission as: "${permission.description}"`
    : permission.isCustom
      ? 'This permission was created by an app, not by Android. Its meaning is decided by the app that defines it.'
      : 'This Android permission is not in the built-in guide yet, so no plain-English summary is available.';
  return base;
}

function fallbackPrivacyNote(permission: AppPermissionInfo) {
  if (permission.protectionLevel === 'dangerous') {
    return 'Android treats this as a sensitive permission, so it asks you before granting it. Being allowed does not mean the app has used it.';
  }
  if (permission.protectionLevel === 'normal') {
    return 'Android treats this as low risk and grants it automatically at install.';
  }
  if (!permission.known) {
    return 'This permission is not recognised by this version of Android, so it may have no effect here.';
  }
  return 'Being declared or granted only describes what the app is allowed to do, not what it has done.';
}

function derivedStatus(permission: AppPermissionInfo, control: PrivacyControlType): PrivacyPermission['status'] {
  if (permission.granted) return 'allowed';
  // A permission the user can never grant (or Android doesn't know about) is restricted, not simply "denied".
  if (control === 'system_only' || !permission.known) return 'restricted';
  return 'denied';
}

function permissionPresentation(permission: AppPermissionInfo): PrivacyPermission & { category: PrivacyCategoryId } {
  const entry = lookupCatalog(permission);
  const control = entry?.control ?? fallbackControl(permission);
  return {
    ...permission,
    id: permission.name,
    displayName: entry?.title ?? (permission.label || suffix(permission.name).replace(/_/g, ' ')),
    status: derivedStatus(permission, control),
    explanation: entry?.explanation ?? fallbackExplanation(permission),
    privacyNote: entry?.privacyNote ?? fallbackPrivacyNote(permission),
    howToControl: entry?.howToControl ?? DEFAULT_CONTROL[control],
    controlType: control,
    canDisableIndividually: control === 'individual' || control === 'special_access',
    dependencies: entry?.dependencies ?? [],
    icon: entry?.icon ?? 'lock',
    sensitivity: entry?.sensitivity ?? fallbackSensitivity(permission),
    category: entry?.category ?? 'device_activity',
    catalogued: !!entry,
  };
}

const RISK_ORDER: Record<PrivacySensitivity, number> = { low: 0, medium: 1, high: 2 };

export function createPrivacyReport(app: InstalledApp, result: AppPermissionsResult): PrivacyAppReport {
  const presented = result.permissions.map(permissionPresentation);
  const categories = (Object.keys(CATEGORY_META) as PrivacyCategoryId[])
    .map(id => {
      const permissions = presented.filter(permission => permission.category === id);
      const highestRisk = permissions.reduce<PrivacySensitivity>(
        (current, permission) => RISK_ORDER[permission.sensitivity] > RISK_ORDER[current] ? permission.sensitivity : current,
        'low'
      );
      return { ...CATEGORY_META[id], risk: highestRisk, permissions };
    })
    .filter(category => category.permissions.length > 0);

  return {
    ...app,
    appName: result.appName || app.appName,
    packageName: result.packageName,
    targetSdk: result.targetSdk,
    categories,
    summary: {
      allowed: presented.filter(permission => permission.status === 'allowed').length,
      denied: presented.filter(permission => permission.status === 'denied').length,
      restricted: presented.filter(permission => permission.status === 'restricted').length,
      attention: presented.filter(permission => permission.granted && permission.sensitivity === 'high').length,
      total: presented.length,
    },
  };
}
