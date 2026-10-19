import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Activity from 'lucide-react-native/icons/activity';
import Bell from 'lucide-react-native/icons/bell';
import Bluetooth from 'lucide-react-native/icons/bluetooth';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Clock from 'lucide-react-native/icons/clock';
import Database from 'lucide-react-native/icons/database';
import Folder from 'lucide-react-native/icons/folder';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import ImageIcon from 'lucide-react-native/icons/image';
import Lock from 'lucide-react-native/icons/lock';
import MapPin from 'lucide-react-native/icons/map-pin';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Mic from 'lucide-react-native/icons/mic';
import Music from 'lucide-react-native/icons/music';
import Phone from 'lucide-react-native/icons/phone';
import ScanSearch from 'lucide-react-native/icons/scan-search';
import Search from 'lucide-react-native/icons/search';
import Settings2 from 'lucide-react-native/icons/settings-2';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Users from 'lucide-react-native/icons/users';
import Video from 'lucide-react-native/icons/video';
import Wifi from 'lucide-react-native/icons/wifi';
import X from 'lucide-react-native/icons/x';
import LocalizedText from '@/components/LocalizedText';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, Card, IconContainer, Overline, type Tone } from '@/components/ui';
import { createPrivacyReport } from '@/features/privacy-inspector/permissionCatalog';
import type {
  PrivacyAppFilter,
  PrivacyAppReport,
  PrivacyIconId,
  PrivacyPermission,
  PrivacyPermissionCategory,
  PrivacyPermissionStatus,
  PrivacySensitivity,
  PrivacyViewMode,
} from '@/features/privacy-inspector/types';
import { FRESH_FOR_MS, hasFreshCompleteScan, privacyCache } from '@/features/privacy-inspector/privacyCache';
import DevToggle, {
  type AppDetailsResult,
  type AppLastOpenedResult,
  type InstalledApp,
  type PermissionLastUsedEntry,
  type PermissionLastUsedResult,
} from '@/modules/dev-toggle-native';
import { fonts, radius, space, useTheme } from '@/theme';

const FILTERS: { id: PrivacyAppFilter; label: string }[] = [
  { id: 'all', label: 'All apps' },
  { id: 'attention', label: 'Review' },
  { id: 'allowed', label: 'Has access' },
  { id: 'system', label: 'System' },
];

const STATUS_META: Record<PrivacyPermissionStatus, { label: string; tone: Tone }> = {
  allowed: { label: 'Granted', tone: 'success' },
  denied: { label: 'Denied', tone: 'neutral' },
  restricted: { label: 'Restricted', tone: 'warning' },
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Permission information could not be loaded.';
}

function AppIcon({ app, size = 46 }: { app: InstalledApp; size?: number }) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={[s.appIcon, { width: size, height: size, borderRadius: size > 50 ? radius.lg : radius.md, backgroundColor: t.canvasElevated }]}>
      {app.icon && !failed ? (
        <Image source={{ uri: app.icon }} style={{ width: size, height: size }} resizeMode="contain" onError={() => setFailed(true)} />
      ) : (
        <ShieldCheck size={Math.round(size * 0.48)} color={t.accentCyan} />
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: PrivacyPermissionStatus }) {
  const t = useTheme();
  const meta = STATUS_META[status];
  const color = meta.tone === 'success' ? t.success : meta.tone === 'warning' ? t.warning : t.textMuted;
  return (
    <View style={[s.statusBadge, { backgroundColor: `${color}14`, borderColor: `${color}50` }]}>
      <View style={[s.statusDot, { backgroundColor: color }]} />
      <Text style={[s.statusBadgeText, { color }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

function MetaBadge({ label, color }: { label: string; color?: string }) {
  const t = useTheme();
  const badgeColor = color ?? t.textMuted;
  return (
    <View style={[s.statusBadge, { backgroundColor: `${badgeColor}12`, borderColor: `${badgeColor}45` }]}>
      <Text style={[s.statusBadgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

function SensitivityBadge({ level }: { level: PrivacySensitivity }) {
  const t = useTheme();
  const color = level === 'high' ? t.warning : level === 'medium' ? t.accentCyan : t.textMuted;
  return <MetaBadge label={`${level.toUpperCase()} SENSITIVITY`} color={color} />;
}

function SummaryCard({ value, label, tone }: { value: number; label: string; tone: Tone }) {
  const t = useTheme();
  const color = tone === 'danger' ? t.danger : tone === 'warning' ? t.warning : tone === 'success' ? t.success : t.accentCyan;
  return (
    <View style={[s.summaryCard, { backgroundColor: `${color}0D`, borderColor: `${color}35` }]}>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <LocalizedText style={[s.summaryLabel, { color: t.textSecondary }]}>{label}</LocalizedText>
    </View>
  );
}

function CategoryIcon({ category }: { category: PrivacyPermissionCategory['id'] }) {
  const t = useTheme();
  if (category === 'location') return <MapPin size={19} color={t.warning} />;
  if (category === 'camera_microphone') return <View style={s.dualIcon}><Camera size={16} color={t.danger} /><Mic size={13} color={t.danger} /></View>;
  if (category === 'files_notifications') return <View style={s.dualIcon}><Folder size={16} color={t.accentCyan} /><Bell size={13} color={t.accentCyan} /></View>;
  return <Activity size={19} color={t.success} />;
}

function PermissionIcon({ icon, color }: { icon: PrivacyIconId; color: string }) {
  const props = { size: 18, color };
  switch (icon) {
    case 'location': return <MapPin {...props} />;
    case 'camera': return <Camera {...props} />;
    case 'microphone': return <Mic {...props} />;
    case 'image': return <ImageIcon {...props} />;
    case 'video': return <Video {...props} />;
    case 'music': return <Music {...props} />;
    case 'folder': return <Folder {...props} />;
    case 'bell': return <Bell {...props} />;
    case 'contacts': return <Users {...props} />;
    case 'calendar': return <Calendar {...props} />;
    case 'phone': return <Phone {...props} />;
    case 'message': return <MessageSquare {...props} />;
    case 'sensor': return <HeartPulse {...props} />;
    case 'bluetooth': return <Bluetooth {...props} />;
    case 'wifi': return <Wifi {...props} />;
    case 'activity': return <Activity {...props} />;
    default: return <Lock {...props} />;
  }
}

function DetailBlock({ label, text, tint }: { label: string; text: string; tint: string }) {
  const t = useTheme();
  return (
    <View style={[s.detailBlock, { backgroundColor: `${tint}0F` }]}>
      <Text style={[s.detailBlockLabel, { color: tint }]}>{label}</Text>
      <LocalizedText style={[s.detailBlockText, { color: t.textSecondary }]}>{text}</LocalizedText>
    </View>
  );
}

function TechRow({ name, value }: { name: string; value: string }) {
  const t = useTheme();
  return (
    <View style={s.techRow}>
      <Text style={[s.techKey, { color: t.textMuted }]}>{name}</Text>
      <Text selectable style={[s.techValue, { color: t.textSecondary }]}>{value}</Text>
    </View>
  );
}

type LastUsedInfo = { text: string; technical: string; needsShizuku: boolean };

function formatAgo(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(timestamp?: number) {
  return timestamp ? new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown';
}

/**
 * Last use comes from Android's own AppOps access history, read through Shizuku. It says when Android
 * last recorded the permission being accessed, not what the app did with it or whether data left the device.
 */
function describeLastUsed(usage: PermissionLastUsedResult | null, entry: PermissionLastUsedEntry | undefined): LastUsedInfo {
  if (!usage) return { text: 'Checking last use...', technical: 'checking', needsShizuku: false };
  if (!usage.available) {
    if (usage.reason === 'failed') return { text: 'Last used: could not be read', technical: 'read failed', needsShizuku: false };
    const allow = usage.reason === 'needs_permission';
    return {
      text: allow ? 'Last used: hidden by Android. Tap to allow Shizuku access.' : 'Last used: hidden by Android for normal apps (needs Shizuku).',
      technical: allow ? 'needs Shizuku permission' : 'needs Shizuku',
      needsShizuku: allow,
    };
  }
  if (!entry) return { text: 'Last used: Android does not track this one', technical: 'not tracked (no AppOp)', needsShizuku: false };
  if (entry.lastAccessTime) {
    const when = new Date(entry.lastAccessTime).toLocaleString();
    return { text: `Last used: ${formatAgo(entry.lastAccessTime)}`, technical: `${when} (op ${entry.op}, mode ${entry.mode ?? 'n/a'})`, needsShizuku: false };
  }
  return { text: 'Last used: no access recorded by Android', technical: `no access recorded (op ${entry.op}, mode ${entry.mode ?? 'n/a'})`, needsShizuku: false };
}

function LastUsedLine({ info, onEnableShizuku }: { info: LastUsedInfo; onEnableShizuku: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole={info.needsShizuku ? 'button' : 'text'} disabled={!info.needsShizuku} onPress={onEnableShizuku} style={s.lastUsedRow}>
      <Clock size={12} color={info.needsShizuku ? t.accentCyan : t.textMuted} />
      <Text style={[s.lastUsedText, { color: info.needsShizuku ? t.accentCyan : t.textMuted }]}>{info.text}</Text>
    </Pressable>
  );
}

/** App-level "last opened" from Usage Access. It does not say when any single permission was used. */
function LastOpenedLine({ info, onGrant }: { info: AppLastOpenedResult | null; onGrant: () => void }) {
  const t = useTheme();
  if (!info) return null;
  const needsAccess = !info.available && info.reason === 'needs_usage_access';
  const text = needsAccess
    ? 'App last opened: tap to allow Usage Access'
    : info.lastUsedTime
      ? `App last opened: ${formatAgo(info.lastUsedTime)}`
      : info.available ? 'App last opened: no recent use recorded' : 'App last opened: unavailable';
  return (
    <Pressable accessibilityRole={needsAccess ? 'button' : 'text'} disabled={!needsAccess} onPress={onGrant} style={s.lastUsedRow}>
      <Clock size={12} color={needsAccess ? t.accentCyan : t.textMuted} />
      <Text style={[s.lastUsedText, { color: needsAccess ? t.accentCyan : t.textMuted }]}>{text}</Text>
    </Pressable>
  );
}

function commonName(distinguishedName?: string) {
  return distinguishedName?.match(/CN=([^,]+)/)?.[1] ?? distinguishedName ?? 'Unknown';
}

function CollapsibleCard({ title, count, icon, hint, children }: { title: string; count: number; icon: React.ReactNode; hint?: string; children: React.ReactNode }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ borderColor: `${t.accentCyan}30` }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={s.collapsibleHeader}>
        {icon}
        <View style={s.categoryCopy}>
          <Text style={[s.categoryTitle, { color: t.textPrimary }]}>{title} ({count})</Text>
          {hint ? <Text style={[s.categoryDescription, { color: t.textSecondary }]}>{hint}</Text> : null}
        </View>
        {open ? <ChevronUp size={18} color={t.accentCyan} /> : <ChevronDown size={18} color={t.accentCyan} />}
      </Pressable>
      {open && <View style={[s.collapsibleBody, { borderTopColor: t.borderSubtle }]}>{children}</View>}
    </Card>
  );
}

function AppDetailsSections({ details, mode }: { details: AppDetailsResult; mode: PrivacyViewMode }) {
  const t = useTheme();
  const advanced = mode === 'advanced';
  return (
    <>
      <CollapsibleCard title="Signatures" count={details.signatures.length} icon={<ShieldCheck size={19} color={t.accentCyan} />} hint="Who signed this app. Android only installs updates signed by the same key.">
        {details.signatures.length === 0 ? <Text style={[s.detailBlockText, { color: t.textSecondary }]}>No signing certificate was reported.</Text> : details.signatures.map(signature => (
          <View key={signature.sha256} style={{ gap: 4 }}>
            <TechRow name="Signed by" value={commonName(signature.subject)} />
            <TechRow name="Issuer" value={commonName(signature.issuer)} />
            <TechRow name="Valid" value={`${formatDate(signature.notBefore)} to ${formatDate(signature.notAfter)}`} />
            <TechRow name="SHA-256" value={signature.sha256} />
            {advanced && <>
              <TechRow name="SHA-1" value={signature.sha1} />
              <TechRow name="MD5" value={signature.md5} />
              <TechRow name="Subject" value={signature.subject ?? 'unknown'} />
              <TechRow name="Serial" value={signature.serialNumber ?? 'unknown'} />
              <TechRow name="Algorithm" value={signature.algorithm ?? 'unknown'} />
            </>}
          </View>
        ))}
        {details.multipleSigners && <Text style={[s.detailBlockText, { color: t.textSecondary }]}>This app is signed by more than one key.</Text>}
      </CollapsibleCard>
      <CollapsibleCard title="Providers" count={details.providers.length} icon={<Database size={19} color={t.accentCyan} />} hint="Content providers let an app share data. Exported ones can be reached by other apps.">
        {details.providers.length === 0 ? <Text style={[s.detailBlockText, { color: t.textSecondary }]}>This app does not declare any content providers.</Text> : details.providers.map(provider => (
          <View key={provider.name} style={{ gap: 4 }}>
            <Text selectable style={[s.techRawName, { color: t.textPrimary }]}>{advanced ? provider.name : provider.name.split('.').pop()}</Text>
            <View style={s.permissionBadges}>
              <MetaBadge label={provider.exported ? 'EXPORTED' : 'PRIVATE'} color={provider.exported ? t.warning : t.success} />
              {!provider.enabled && <MetaBadge label="DISABLED" />}
              {provider.grantUriPermissions && <MetaBadge label="GRANTS URI ACCESS" color={t.accentCyan} />}
            </View>
            <TechRow name="Authority" value={provider.authority ?? 'none'} />
            {advanced && <>
              <TechRow name="Read perm." value={provider.readPermission ?? 'none'} />
              <TechRow name="Write perm." value={provider.writePermission ?? 'none'} />
              <TechRow name="Process" value={provider.processName ?? 'default'} />
              <TechRow name="Multiprocess" value={provider.multiprocess ? 'yes' : 'no'} />
            </>}
          </View>
        ))}
      </CollapsibleCard>
    </>
  );
}

function PermissionRow({ permission, mode, onManage, lastUsed, onEnableShizuku }: { permission: PrivacyPermission; mode: PrivacyViewMode; onManage: () => void; lastUsed: LastUsedInfo; onEnableShizuku: () => void }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const iconColor = permission.sensitivity === 'high' ? t.warning : t.accentCyan;

  if (mode === 'advanced') {
    const flags = permission.protectionFlags.length ? permission.protectionFlags.join(', ') : 'none';
    const requested = permission.requestedFlags.length ? permission.requestedFlags.join(', ') : 'none';
    return (
      <View style={s.permissionCopy}>
        <View style={s.permissionTitleRow}>
          <Text selectable style={[s.techRawName, { color: t.textPrimary, flex: 1 }]}>{permission.name}</Text>
          <StatusBadge status={permission.status} />
        </View>
        <TechRow name="Declared" value="yes (in app manifest)" />
        <TechRow name="Granted" value={permission.granted ? 'yes' : 'no'} />
        <TechRow name="Protection" value={permission.protectionLevel} />
        <TechRow name="Prot. flags" value={flags} />
        <TechRow name="Request flags" value={`${requested} (raw ${permission.requestedFlagsRaw})`} />
        <TechRow name="Group" value={permission.group ?? 'none'} />
        <TechRow name="Defined by" value={permission.definingPackage ?? 'unknown'} />
        <TechRow name="Custom" value={permission.isCustom ? 'yes' : 'no'} />
        <TechRow name="Known here" value={permission.known ? 'yes' : 'no (not defined on this Android version)'} />
        <TechRow name="Actual usage" value={lastUsed.technical} />
        <TechRow name="AppOps" value={permission.protectionFlags.includes('app_op') ? 'uses AppOps; mode not readable' : 'not available'} />
      </View>
    );
  }

  return (
    <>
      <View style={[s.permissionIcon, { backgroundColor: `${iconColor}1A` }]}>
        <PermissionIcon icon={permission.icon} color={iconColor} />
      </View>
      <View style={s.permissionCopy}>
        <View style={s.permissionTitleRow}>
          <LocalizedText style={[s.permissionName, { color: t.textPrimary }]}>{permission.displayName}</LocalizedText>
          <StatusBadge status={permission.status} />
        </View>
        <LocalizedText style={[s.permissionExplanation, { color: t.textSecondary }]}>{permission.explanation}</LocalizedText>
        <LastUsedLine info={lastUsed} onEnableShizuku={onEnableShizuku} />
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? 'Hide' : 'Show'} details for ${permission.displayName}`} onPress={() => setExpanded(value => !value)} hitSlop={6} style={s.detailsToggle}>
          <Text style={[s.detailsToggleText, { color: t.accentCyan }]}>{expanded ? 'Hide details' : 'Privacy & controls'}</Text>
          {expanded ? <ChevronUp size={14} color={t.accentCyan} /> : <ChevronDown size={14} color={t.accentCyan} />}
        </Pressable>
        {expanded && (
          <View style={{ gap: space.sm }}>
            <DetailBlock label="PRIVACY" text={permission.privacyNote} tint={t.warning} />
            {permission.dependencies.map(note => <DetailBlock key={note} label="RELATED PERMISSIONS" text={note} tint={t.accentCyan} />)}
            <DetailBlock label="HOW TO CONTROL THIS" text={`${permission.canDisableIndividually ? 'You can turn this off on its own. ' : ''}${permission.howToControl}`} tint={t.success} />
            <Button label="Manage Permission" variant="secondary" icon={<Settings2 size={15} color={t.textPrimary} />} onPress={onManage} />
          </View>
        )}
      </View>
    </>
  );
}

const AppListItem = React.memo(function AppListItem({
  item,
  report,
  failed,
  scanning,
  onPress,
}: {
  item: InstalledApp;
  report?: PrivacyAppReport;
  failed?: boolean;
  scanning: boolean;
  onPress: (app: InstalledApp) => void;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Inspect permissions for ${item.appName}`} onPress={() => onPress(item)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
      <Card style={{ borderColor: report?.summary.attention ? `${t.warning}50` : `${t.accentCyan}30` }}>
        <View style={s.appRow}>
          <AppIcon app={item} />
          <View style={s.appCopy}>
            <View style={s.appTitleRow}>
              <LocalizedText style={[s.appName, { color: t.textPrimary }]} numberOfLines={1}>{item.appName}</LocalizedText>
              {item.isSystem && <MetaBadge label="SYSTEM" />}
            </View>
            <Text style={[s.packageName, { color: t.textMuted }]} numberOfLines={1}>{item.packageName}</Text>
            <LocalizedText style={[s.accessSummary, { color: t.textSecondary }]}>
              {report
                ? `${report.summary.allowed} granted | ${report.summary.denied + report.summary.restricted} not granted`
                : failed
                  ? 'Permission details unavailable'
                  : 'Reading requested permissions...'}
            </LocalizedText>
          </View>
          <View style={s.rowEnd}>
            {report?.summary.attention ? (
              <View style={[s.attentionCount, { backgroundColor: t.warningSoft }]}><CircleAlert size={12} color={t.warning} /><Text style={[s.attentionText, { color: t.warning }]}>{report.summary.attention}</Text></View>
            ) : report ? <CircleCheck size={18} color={t.success} /> : scanning && !failed ? <ActivityIndicator size="small" color={t.accentCyan} /> : null}
            <ChevronRight size={18} color={t.accentCyan} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

export default function PrivacyInspectorScreen() {
  const t = useTheme();
  const requestId = useRef(0);
  const extrasRequest = useRef(0);
  const scanGeneration = useRef(0);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>(() => privacyCache.apps);
  const [reports, setReports] = useState<Record<string, PrivacyAppReport>>(() => privacyCache.reports);
  const [scanFailures, setScanFailures] = useState<Record<string, boolean>>(() => privacyCache.failures);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(() => privacyCache.apps.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PrivacyAppFilter>('all');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PrivacyViewMode>('simple');
  const [compactHeader, setCompactHeader] = useState(false);
  const [usage, setUsage] = useState<PermissionLastUsedResult | null>(null);
  const [appDetails, setAppDetails] = useState<AppDetailsResult | null>(null);
  const [lastOpened, setLastOpened] = useState<AppLastOpenedResult | null>(null);

  /**
   * Scans permissions for the given apps. Existing cached reports stay on screen while rescanning,
   * so totals never flash back to zero.
   */
  const scanAllPermissions = useCallback(async (apps: InstalledApp[], onlyMissing: boolean) => {
    const generation = ++scanGeneration.current;
    const queue = onlyMissing ? apps.filter(app => !privacyCache.reports[app.packageName]) : apps;
    setScanning(queue.length > 0);
    let nextIndex = 0;

    // Updating the 100+ row list once per scanned app made it janky, so flush results in batches.
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      setScanFailures(privacyCache.failures);
      setReports(privacyCache.reports);
    };
    const scheduleFlush = () => { if (!flushTimer) flushTimer = setTimeout(flush, 400); };

    const worker = async () => {
      while (generation === scanGeneration.current) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= queue.length) return;
        const app = queue[index];
        try {
          const result = await DevToggle.getAppPermissions(app.packageName);
          if (generation !== scanGeneration.current) return;
          const report = createPrivacyReport(app, result);
          const { [app.packageName]: _removed, ...failures } = privacyCache.failures;
          privacyCache.failures = failures;
          privacyCache.reports = { ...privacyCache.reports, [app.packageName]: report };
          if (!privacyCache.savedAt) privacyCache.savedAt = Date.now();
          scheduleFlush();
        } catch {
          if (generation !== scanGeneration.current) return;
          privacyCache.failures = { ...privacyCache.failures, [app.packageName]: true };
          scheduleFlush();
        }
      }
    };

    const workerCount = Math.min(4, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    if (flushTimer) clearTimeout(flushTimer);
    flush();
    if (generation === scanGeneration.current) {
      privacyCache.savedAt = Date.now();
      setScanning(false);
    }
  }, []);

  const loadApps = useCallback(async (isRefresh = false) => {
    const hasCache = privacyCache.apps.length > 0;
    // Fresh and complete cache: nothing to do unless the user pulled to refresh.
    if (!isRefresh && hasFreshCompleteScan()) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else if (!hasCache) setLoading(true);
    setAppsError(null);
    try {
      const apps = await DevToggle.getInstalledApps();
      const installed = new Set(apps.map(app => app.packageName));
      privacyCache.apps = apps;
      privacyCache.reports = Object.fromEntries(Object.entries(privacyCache.reports).filter(([name]) => installed.has(name)));
      privacyCache.failures = Object.fromEntries(Object.entries(privacyCache.failures).filter(([name]) => installed.has(name)));
      setInstalledApps(apps);
      setReports(privacyCache.reports);
      setScanFailures(privacyCache.failures);
      // Cached results younger than the freshness window only need the missing apps scanned.
      await scanAllPermissions(apps, !isRefresh && Date.now() - privacyCache.savedAt <= FRESH_FOR_MS);
    } catch (error) {
      if (!hasCache) {
        setInstalledApps([]);
        setReports({});
      }
      setAppsError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scanAllPermissions]);

  const loadExtras = useCallback(async (app: InstalledApp, keepUsage = false) => {
    const currentRequest = ++extrasRequest.current;
    setAppDetails(privacyCache.details[app.packageName] ?? null);
    if (!keepUsage) { setUsage(null); setLastOpened(null); }
    const [detailsResult, usageResult, openedResult] = await Promise.allSettled([
      DevToggle.getAppDetails(app.packageName),
      DevToggle.getPermissionLastUsed(app.packageName),
      DevToggle.getAppLastOpened(app.packageName),
    ]);
    if (currentRequest !== extrasRequest.current) return;
    if (detailsResult.status === 'fulfilled') {
      privacyCache.details[app.packageName] = detailsResult.value;
      setAppDetails(detailsResult.value);
    }
    setUsage(usageResult.status === 'fulfilled' ? usageResult.value : { available: false, reason: 'failed', entries: [] });
    setLastOpened(openedResult.status === 'fulfilled' ? openedResult.value : { available: false, reason: 'unavailable', lastUsedTime: null });
  }, []);

  const loadPermissions = useCallback(async (app: InstalledApp, isRefresh = false) => {
    const currentRequest = ++requestId.current;
    if (isRefresh) setDetailRefreshing(true); else setDetailLoading(!privacyCache.reports[app.packageName]);
    setDetailError(null);
    void loadExtras(app, isRefresh);
    try {
      const result = await DevToggle.getAppPermissions(app.packageName);
      const report = createPrivacyReport(app, result);
      privacyCache.reports = { ...privacyCache.reports, [app.packageName]: report };
      setReports(privacyCache.reports);
    } catch (error) {
      if (currentRequest === requestId.current) {
        const { [app.packageName]: _removed, ...rest } = privacyCache.reports;
        privacyCache.reports = rest;
        setReports(rest);
        setDetailError(errorMessage(error));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setDetailLoading(false);
        setDetailRefreshing(false);
      }
    }
  }, [loadExtras]);

  useEffect(() => { void loadApps(); }, [loadApps]);

  // Stop an in-flight scan on leave. Finished reports are already cached, so the next visit resumes.
  useEffect(() => () => { scanGeneration.current += 1; }, []);

  useEffect(() => {
    if (!selectedApp) return;
    void loadPermissions(selectedApp);
  }, [loadPermissions, selectedApp]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && selectedApp) void loadPermissions(selectedApp, true);
    });
    return () => subscription.remove();
  }, [loadPermissions, selectedApp]);

  const usageByPermission = useMemo(() => {
    const map: Record<string, PermissionLastUsedEntry> = {};
    for (const entry of usage?.entries ?? []) map[entry.permission] = entry;
    return map;
  }, [usage]);

  const handleEnableShizuku = useCallback(async () => {
    if (!selectedApp) return;
    try {
      await DevToggle.requestShizukuPermission?.();
    } finally {
      void loadExtras(selectedApp);
    }
  }, [loadExtras, selectedApp]);

  const openApp = useCallback((app: InstalledApp) => {
    setCompactHeader(false);
    setSelectedApp(app);
  }, []);

  const handleDetailScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const compact = event.nativeEvent.contentOffset.y > 110;
    setCompactHeader(current => (current === compact ? current : compact));
  }, []);

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return installedApps.filter(app => {
      const report = reports[app.packageName];
      const matchesSearch = !normalizedQuery || app.appName.toLowerCase().includes(normalizedQuery) || app.packageName.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'all' || (filter === 'attention' && !!report?.summary.attention) || (filter === 'allowed' && !!report?.summary.allowed) || (filter === 'system' && app.isSystem);
      return matchesSearch && matchesFilter;
    });
  }, [filter, installedApps, query, reports]);

  const totals = useMemo(() => ({
    apps: installedApps.length,
    reviewed: Object.keys(reports).length,
    attention: Object.values(reports).filter(report => report.summary.attention > 0).length,
  }), [installedApps.length, reports]);

  const selectedReport = selectedApp ? reports[selectedApp.packageName] : undefined;

  const handleManagePermissions = useCallback(async () => {
    if (!selectedApp) return;
    try {
      const result = await DevToggle.openAppPermissionSettings(selectedApp.packageName);
      if (!result.opened) Alert.alert('Settings unavailable', result.message);
    } catch (error) {
      Alert.alert('Settings unavailable', errorMessage(error));
    }
  }, [selectedApp]);

  const renderApp = useCallback(({ item }: { item: InstalledApp }) => (
    <AppListItem
      item={item}
      report={reports[item.packageName]}
      failed={scanFailures[item.packageName]}
      scanning={scanning}
      onPress={openApp}
    />
  ), [openApp, reports, scanFailures, scanning]);

  return (
    <ScreenBackground>
    <View style={s.root}>
      <FlatList
        data={filteredApps}
        keyExtractor={item => item.packageName}
        renderItem={renderApp}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadApps(true)} tintColor={t.accentCyan} colors={[t.accentCyan]} />}
        ListHeaderComponent={<View style={s.headerContent}>
          <View style={s.pageHeader}>
            <Overline>APP PRIVACY OVERVIEW</Overline>
            <LocalizedText style={[s.pageTitle, { color: t.textPrimary }]}>Privacy Inspector</LocalizedText>
            <LocalizedText style={[s.pageSubtitle, { color: t.textSecondary }]}>Review permissions requested by installed apps.</LocalizedText>
          </View>
          <View style={[s.infoBanner, { backgroundColor: t.accentCyanGlow, borderColor: `${t.accentCyan}45` }]}>
            <ShieldCheck size={16} color={t.accentCyan} />
            <View style={s.infoCopy}>
              <Text style={[s.infoLabel, { color: t.accentCyan }]}>ON-DEVICE INSPECTION</Text>
              <LocalizedText style={[s.infoText, { color: t.textSecondary }]}>Permissions load automatically. Sensitive counts high-sensitivity access currently granted, not proven data collection.</LocalizedText>
            </View>
          </View>
          <View style={s.summaryGrid}>
            <SummaryCard value={totals.apps} label="Apps" tone="cyan" />
            <SummaryCard value={totals.reviewed} label="Reviewed" tone="success" />
            <SummaryCard value={totals.attention} label="Sensitive" tone="warning" />
          </View>
          <View style={[s.searchBar, { backgroundColor: t.canvasElevated, borderColor: t.cardBorder }]}>
            <Search size={18} color={t.textMuted} />
            <TextInput accessibilityLabel="Search installed apps" placeholder="Search app name or package..." placeholderTextColor={t.textMuted} value={query} onChangeText={setQuery} style={[s.searchInput, { color: t.textPrimary }]} />
            {!!query && <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><X size={16} color={t.textMuted} /></Pressable>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
            {FILTERS.map(item => {
              const active = filter === item.id;
              return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={({ pressed }) => [s.filterChip, { backgroundColor: active ? t.primaryGlow : t.canvas, borderColor: active ? t.primaryLight : t.cardBorder, opacity: pressed ? 0.75 : 1 }]}><Text style={[s.filterText, { color: active ? t.primaryLight : t.textSecondary }]}>{item.label}</Text></Pressable>;
            })}
          </ScrollView>
          <View style={s.listHeading}><Text style={[s.sectionLabel, { color: t.textMuted }]}>INSTALLED APPS</Text><Text style={[s.resultCount, { color: t.textSecondary }]}>{scanning ? `${totals.reviewed}/${totals.apps} reviewed` : `${filteredApps.length} shown`}</Text></View>
        </View>}
        ListEmptyComponent={loading ? <View style={s.emptyState}><ActivityIndicator color={t.accentCyan} /><LocalizedText style={[s.emptyText, { color: t.textSecondary }]}>Loading installed apps...</LocalizedText></View> : <Card style={s.emptyState}><ScanSearch size={30} color={t.accentCyan} /><LocalizedText style={[s.emptyTitle, { color: t.textPrimary }]}>{appsError ? 'Apps unavailable' : 'No matching apps'}</LocalizedText><LocalizedText style={[s.emptyText, { color: t.textSecondary }]}>{appsError ?? 'Clear the search or choose a different filter.'}</LocalizedText>{appsError && <Button label="Try Again" onPress={() => void loadApps()} />}</Card>}
      />

      <Modal visible={selectedApp !== null} animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedApp(null)}>
        {selectedApp && <View style={[s.modalRoot, { backgroundColor: t.bg }]}>
          <View style={[s.modalHeader, { backgroundColor: t.canvasElevated, borderBottomColor: t.cardBorder }]}>
            {compactHeader
              ? <View style={s.compactHeader}><AppIcon app={selectedApp} size={34} /><View style={s.compactHeaderCopy}><Text style={[s.modalTitle, { color: t.textPrimary }]} numberOfLines={1}>{selectedApp.appName}</Text><Text style={[s.modalSubtitle, { color: t.textMuted }]} numberOfLines={1}>{selectedApp.packageName}</Text></View></View>
              : <View><LocalizedText style={[s.modalTitle, { color: t.textPrimary }]}>App Privacy Details</LocalizedText><Text style={[s.modalSubtitle, { color: t.accentCyan }]}>ANDROID PERMISSION STATE</Text></View>}
            <Pressable accessibilityRole="button" accessibilityLabel="Close privacy details" onPress={() => setSelectedApp(null)} style={({ pressed }) => [s.closeButton, { backgroundColor: t.canvas, opacity: pressed ? 0.7 : 1 }]}><X size={18} color={t.textPrimary} /></Pressable>
          </View>
          <ScrollView onScroll={handleDetailScroll} scrollEventThrottle={32} contentContainerStyle={s.detailsContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={detailRefreshing} onRefresh={() => void loadPermissions(selectedApp, true)} tintColor={t.accentCyan} colors={[t.accentCyan]} />}>
            <Card style={{ borderColor: `${t.accentCyan}45` }}><View style={s.detailsAppHeader}><AppIcon app={selectedApp} size={62} /><View style={s.detailsAppCopy}><LocalizedText style={[s.detailsAppName, { color: t.textPrimary }]}>{selectedApp.appName}</LocalizedText><Text style={[s.detailsPackage, { color: t.textMuted }]}>{selectedApp.packageName}</Text><LastOpenedLine info={lastOpened} onGrant={() => void DevToggle.openUsageAccessSettings()} /><View style={s.detailsBadges}>{selectedApp.isSystem && <MetaBadge label="SYSTEM APP" />}{selectedReport && <MetaBadge label={`TARGET SDK ${selectedReport.targetSdk}`} />}{selectedReport?.summary.attention ? <MetaBadge label="REVIEW SUGGESTED" color={t.warning} /> : null}</View></View></View></Card>

            {detailLoading && !selectedReport ? <View style={s.detailState}><ActivityIndicator color={t.accentCyan} /><LocalizedText style={[s.emptyText, { color: t.textSecondary }]}>Reading requested permissions...</LocalizedText></View> : detailError && !selectedReport ? <Card style={s.emptyState}><CircleAlert size={28} color={t.warning} /><LocalizedText style={[s.emptyTitle, { color: t.textPrimary }]}>Permissions unavailable</LocalizedText><LocalizedText style={[s.emptyText, { color: t.textSecondary }]}>{detailError}</LocalizedText><Button label="Try Again" onPress={() => void loadPermissions(selectedApp)} /></Card> : selectedReport ? <>
              <View accessibilityRole="tablist" style={[s.viewToggle, { backgroundColor: t.canvas, borderColor: t.cardBorder }]}>
                {(['simple', 'advanced'] as const).map(mode => {
                  const active = viewMode === mode;
                  return <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setViewMode(mode)} style={[s.viewToggleOption, { backgroundColor: active ? t.primaryGlow : 'transparent' }]}><Text style={[s.viewToggleText, { color: active ? t.primaryLight : t.textSecondary }]}>{mode === 'simple' ? 'Simple' : 'Advanced'}</Text></Pressable>;
                })}
              </View>
              <View style={s.summaryGrid}><SummaryCard value={selectedReport.summary.allowed} label="Granted" tone="success" /><SummaryCard value={selectedReport.summary.denied + selectedReport.summary.restricted} label="Not granted" tone="danger" /><SummaryCard value={selectedReport.summary.attention} label="Review" tone="warning" /></View>
              {detailError && <View style={[s.explanationBox, { backgroundColor: t.warningSoft, borderColor: `${t.warning}40` }]}><CircleAlert size={17} color={t.warning} /><LocalizedText style={[s.explanationText, { color: t.textSecondary }]}>{detailError}</LocalizedText></View>}
              <View style={s.detailsSectionHeader}><Text style={[s.sectionLabel, { color: t.textMuted }]}>PERMISSION CATEGORIES</Text><Text style={[s.resultCount, { color: t.textSecondary }]}>{selectedReport.summary.total} permissions</Text></View>
              {selectedReport.summary.total === 0 ? <Card style={s.emptyState}><CircleCheck size={30} color={t.success} /><LocalizedText style={[s.emptyTitle, { color: t.textPrimary }]}>No requested permissions</LocalizedText><LocalizedText style={[s.emptyText, { color: t.textSecondary }]}>Android did not report any permissions requested by this visible app package.</LocalizedText></Card> : selectedReport.categories.map(category => <Card key={category.id} style={{ borderColor: `${t.accentCyan}30` }}>
                <View style={s.categoryHeader}><IconContainer tone={category.risk === 'high' ? 'warning' : 'cyan'} size={40}><CategoryIcon category={category.id} /></IconContainer><View style={s.categoryCopy}><LocalizedText style={[s.categoryTitle, { color: t.textPrimary }]}>{category.title}</LocalizedText><LocalizedText style={[s.categoryDescription, { color: t.textSecondary }]}>{category.description}</LocalizedText></View></View>
                <View style={[s.permissionsList, { borderTopColor: t.borderSubtle }]}>{category.permissions.map((permission, index) => <View key={permission.id} style={[s.permissionRow, index > 0 && { borderTopWidth: 1, borderTopColor: t.borderSubtle }]}><PermissionRow permission={permission} mode={viewMode} onManage={() => void handleManagePermissions()} lastUsed={describeLastUsed(usage, usageByPermission[permission.name])} onEnableShizuku={() => void handleEnableShizuku()} /></View>)}</View>
              </Card>)}
              {appDetails && <AppDetailsSections details={appDetails} mode={viewMode} />}
              {viewMode === 'advanced' && <Card style={{ borderColor: `${t.accentCyan}30`, gap: space.sm }}>
                <Text style={[s.sectionLabel, { color: t.textMuted }]}>DECLARED vs GRANTED vs USED</Text>
                <Text style={[s.detailBlockText, { color: t.textSecondary }]}>{'Declared: the app lists the permission in its manifest (every permission shown here).\nGranted: Android currently allows the app to use it (read from the package manager).\nActual usage: the last access time Android recorded in AppOps, read through Shizuku when it is allowed. It shows when the permission was accessed, not what the app did with it or whether any data was sent. Without Shizuku it is shown as unknown.'}</Text>
              </Card>}
              <View style={[s.explanationBox, { backgroundColor: t.accentCyanGlow, borderColor: `${t.accentCyan}40` }]}><CircleAlert size={17} color={t.accentCyan} /><LocalizedText style={[s.explanationText, { color: t.textSecondary }]}>A requested or granted permission describes possible access only. It does not show that the app has used it or collected any data. Behavior can differ by Android version, app target SDK, device vendor, and user settings.</LocalizedText></View>
            </> : null}
            {!detailLoading && <Button label="Manage Permissions" icon={<Settings2 size={17} color="#FFFFFF" />} onPress={() => void handleManagePermissions()} />}
          </ScrollView>
        </View>}
      </Modal>
    </View>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 80 }, headerContent: { gap: space.md, paddingBottom: space.md }, pageHeader: { gap: 4 },
  pageTitle: { fontFamily: fonts.heading, fontSize: 26, letterSpacing: -0.5 }, pageSubtitle: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderWidth: 1, borderRadius: radius.md }, infoCopy: { flex: 1, gap: 2 }, infoLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.7 }, infoText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', gap: space.sm }, summaryCard: { flex: 1, minHeight: 68, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderRadius: radius.md }, summaryValue: { fontFamily: fonts.monoBold, fontSize: 20 }, summaryLabel: { fontFamily: fonts.body, fontSize: 11.5, marginTop: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.md, paddingVertical: Platform.OS === 'ios' ? 11 : 9, borderWidth: 1, borderRadius: radius.md }, searchInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 13.5 },
  filters: { gap: space.sm, paddingRight: space.lg }, filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderRadius: radius.full }, filterText: { fontFamily: fonts.headingMedium, fontSize: 12 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, sectionLabel: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 1.1 }, resultCount: { fontFamily: fonts.mono, fontSize: 10.5 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: space.md }, appIcon: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, appCopy: { flex: 1, minWidth: 0, gap: 2 }, appTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, appName: { flexShrink: 1, fontFamily: fonts.heading, fontSize: 14.5 }, packageName: { fontFamily: fonts.mono, fontSize: 10.5 }, accessSummary: { fontFamily: fonts.body, fontSize: 11.5 }, rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 7 }, attentionCount: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.full }, attentionText: { fontFamily: fonts.monoBold, fontSize: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderRadius: radius.full }, statusDot: { width: 5, height: 5, borderRadius: 2.5 }, statusBadgeText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.25 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 42, paddingHorizontal: space.lg }, detailState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 54 }, emptyTitle: { fontFamily: fonts.heading, fontSize: 16 }, emptyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  modalRoot: { flex: 1, paddingTop: Platform.OS === 'android' ? 34 : 48 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1 }, modalTitle: { fontFamily: fonts.heading, fontSize: 18 }, modalSubtitle: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.6, marginTop: 2 }, closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  detailsContent: { padding: space.lg, paddingBottom: 48, gap: space.md }, detailsAppHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md }, detailsAppCopy: { flex: 1, minWidth: 0, gap: 3 }, detailsAppName: { fontFamily: fonts.heading, fontSize: 18 }, detailsPackage: { fontFamily: fonts.mono, fontSize: 10.5 }, detailsBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  detailsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, categoryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md }, categoryCopy: { flex: 1, gap: 2 }, categoryTitle: { fontFamily: fonts.heading, fontSize: 15 }, categoryDescription: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }, dualIcon: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  permissionsList: { marginTop: space.md, borderTopWidth: 1 }, permissionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 11 }, permissionCopy: { flex: 1, gap: 4 }, permissionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, permissionName: { flex: 1, fontFamily: fonts.headingMedium, fontSize: 13.5 }, permissionExplanation: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 }, permissionTechnical: { fontFamily: fonts.mono, fontSize: 9.5 }, permissionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  explanationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderWidth: 1, borderRadius: radius.md }, explanationText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  viewToggle: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: radius.full, gap: 3 }, viewToggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.full }, viewToggleText: { fontFamily: fonts.headingMedium, fontSize: 12.5 },
  permissionIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, detailsToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3, paddingVertical: 4 }, detailsToggleText: { fontFamily: fonts.headingMedium, fontSize: 11.5 },
  detailBlock: { gap: 3, padding: 10, borderRadius: radius.md }, detailBlockLabel: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.6 }, detailBlockText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  techRow: { flexDirection: 'row', gap: 8 }, techKey: { width: 104, fontFamily: fonts.mono, fontSize: 10.5 }, techValue: { flex: 1, fontFamily: fonts.mono, fontSize: 10.5 }, techRawName: { fontFamily: fonts.monoBold, fontSize: 11 },
  compactHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 10 }, compactHeaderCopy: { flex: 1, minWidth: 0 },
  lastUsedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }, lastUsedText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 11 },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md }, collapsibleBody: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, gap: space.md },
});
