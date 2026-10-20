import LocalizedText from "@/components/LocalizedText";
import { ScreenBackground } from "@/components/ScreenBackground";
import { Button, Card, IconContainer, Overline } from "@/components/ui";
import { EstimatedSavingsCard } from "@/features/privacy-shield/EstimatedSavingsCard";
import { ProtectionCoverageSection } from "@/features/privacy-shield/ProtectionCoverageSection";
import { ProtectionStatusCard } from "@/features/privacy-shield/ProtectionStatusCard";
import {
  addCustomBlockedDomain,
  fixNetworkIssues,
  getCachedLiveDnsQueries,
  getCachedPrivacyShieldStats,
  getCachedPrivacyShieldStatus,
  getLiveDnsQueries,
  getNetworkDiagnostics,
  getPrivacyShieldStats,
  getPrivacyShieldStatus,
  setPrivacyShieldEnabled,
} from "@/features/privacy-shield/shieldStorage";
import type {
  LiveDnsQueryEvent,
  NetworkDiagnosticsResult,
  PrivacyShieldStatusResult,
  ShieldStats,
  ShieldTimeFilter,
} from "@/features/privacy-shield/types";
import { fonts, radius, space, useTheme } from "@/theme";
import { router } from "expo-router";
import Check from "lucide-react-native/icons/check";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Globe from "lucide-react-native/icons/globe";
import Plus from "lucide-react-native/icons/plus";
import Radio from "lucide-react-native/icons/radio";
import ScanSearch from "lucide-react-native/icons/scan-search";
import ShieldBan from "lucide-react-native/icons/shield-ban";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";

export default function PrivacyShieldScreen() {
  const t = useTheme();
  const [status, setStatus] = useState<PrivacyShieldStatusResult>(() =>
    getCachedPrivacyShieldStatus(),
  );

  const [timeFilter] = useState<ShieldTimeFilter>("today");
  const [stats, setStats] = useState<ShieldStats>(() =>
    getCachedPrivacyShieldStats("today"),
  );

  const [recentQueries, setRecentQueries] = useState<LiveDnsQueryEvent[]>(() =>
    getCachedLiveDnsQueries("all").slice(0, 5),
  );
  const [diagnostics, setDiagnostics] =
    useState<NetworkDiagnosticsResult | null>(null);
  const [isRepairingNet, setIsRepairingNet] = useState(false);
  const [manualDomain, setManualDomain] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [currStatus, currStats, currQueries, currDiag] = await Promise.all([
        getPrivacyShieldStatus(),
        getPrivacyShieldStats(timeFilter),
        getLiveDnsQueries("all"),
        getNetworkDiagnostics(),
      ]);
      setStatus(currStatus);
      setStats(currStats);
      setRecentQueries(currQueries.slice(0, 5));
      if (currDiag) setDiagnostics(currDiag);
    } catch {
      // Graceful fallback
    }
  }, [timeFilter]);

  useEffect(() => {
    let active = true;
    const fetchLatest = () => {
      Promise.all([
        getPrivacyShieldStatus(),
        getPrivacyShieldStats(timeFilter),
        getLiveDnsQueries("all"),
        getNetworkDiagnostics(),
      ])
        .then(([currStatus, currStats, currQueries, currDiag]) => {
          if (active) {
            setStatus(currStatus);
            setStats(currStats);
            setRecentQueries(currQueries.slice(0, 5));
            if (currDiag) setDiagnostics(currDiag);
          }
        })
        .catch(() => {});
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [timeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRepairNetwork = async () => {
    setIsRepairingNet(true);
    try {
      const res = await fixNetworkIssues();
      if (res) {
        setDiagnostics(res);
      }
      await loadData();
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Wi-Fi & DNS repaired: Opportunistic Private DNS disabled & fast DNS applied!",
          ToastAndroid.SHORT,
        );
      }
    } finally {
      setIsRepairingNet(false);
    }
  };

  const handleToggle = async (nextEnabled: boolean) => {
    setIsToggling(true);
    try {
      const updated = await setPrivacyShieldEnabled(nextEnabled);
      setStatus(updated);
      const updatedStats = await getPrivacyShieldStats(timeFilter);
      setStats(updatedStats);

      if (Platform.OS === "android") {
        const msg = !nextEnabled
          ? "Privacy Shield paused."
          : updated.state === "connected"
            ? "Privacy Shield active: blocking ads and tracking domains."
            : "Authorizing Privacy Shield VPN...";
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      }
    } catch {
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Could not toggle Privacy Shield VPN.",
          ToastAndroid.SHORT,
        );
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddManualDomain = async () => {
    const clean = manualDomain.trim().toLowerCase();
    if (!clean || !clean.includes(".")) {
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Please enter a valid DNS domain (e.g. ads.example.com)",
          ToastAndroid.SHORT,
        );
      }
      return;
    }

    setActionInProgress(clean);
    setRecentQueries((prev) =>
      prev.map((q) =>
        q.domain === clean || q.domain.endsWith(`.${clean}`)
          ? { ...q, blocked: true }
          : q,
      ),
    );
    try {
      await addCustomBlockedDomain(clean);
      setManualDomain("");
      if (Platform.OS === "android") {
        ToastAndroid.show(`Added to blocklist: ${clean}`, ToastAndroid.SHORT);
      }
      await loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBlockQueryDomain = async (domain: string) => {
    const clean = domain.trim().toLowerCase();
    setActionInProgress(domain);
    setRecentQueries((prev) =>
      prev.map((q) =>
        q.domain === clean || q.domain.endsWith(`.${clean}`)
          ? { ...q, blocked: true }
          : q,
      ),
    );
    try {
      await addCustomBlockedDomain(domain);
      if (Platform.OS === "android") {
        ToastAndroid.show(`Blocked: ${domain}`, ToastAndroid.SHORT);
      }
      await loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.accentCyan}
            colors={[t.accentCyan]}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Overline>ON-DEVICE AD & TRACKER SHIELD</Overline>
          <LocalizedText style={[styles.title, { color: t.textPrimary }]}>
            Privacy Shield
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: t.textSecondary }]}>
            Block intrusive advertising networks, tracking beacons, and
            analytics endpoints locally using lightweight DNS sinkholing without
            cloud telemetry.
          </LocalizedText>
        </View>

        {/* Protection Status Card */}
        <ProtectionStatusCard
          status={status}
          onToggle={handleToggle}
          onOpenDnsSettings={() => router.push("/dns-settings" as never)}
          onRetry={() => handleToggle(true)}
          isToggling={isToggling}
        />

        {/* Live Wi-Fi & DNS Connection Debugger Card */}
        {diagnostics && (
          <Card
            style={[
              styles.adBlockCard,
              {
                borderColor:
                  diagnostics.issues.length > 0
                    ? `${t.warning}60`
                    : `${t.success}40`,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.xs,
                }}
              >
                <Radio
                  size={16}
                  color={diagnostics.issues.length > 0 ? t.warning : t.success}
                />
                <LocalizedText
                  style={[styles.sectionHeading, { color: t.textPrimary }]}
                >
                  Live Wi-Fi & DNS Connection Debugger
                </LocalizedText>
              </View>
              <View
                style={[
                  styles.liveTag,
                  {
                    backgroundColor:
                      diagnostics.issues.length > 0
                        ? `${t.warning}18`
                        : `${t.success}18`,
                    borderColor:
                      diagnostics.issues.length > 0
                        ? `${t.warning}40`
                        : `${t.success}40`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.liveTagText,
                    {
                      color:
                        diagnostics.issues.length > 0 ? t.warning : t.success,
                    },
                  ]}
                >
                  {diagnostics.wifiValidated ? "VALIDATED" : "CHECK WI-FI"}
                </Text>
              </View>
            </View>

            <View style={{ gap: 4, marginVertical: space.xs }}>
              <Text
                style={[styles.queryStatusText, { color: t.textSecondary }]}
              >
                • Wi-Fi IP:{" "}
                <Text style={{ color: t.textPrimary, fontFamily: fonts.mono }}>
                  {diagnostics.localIp}
                </Text>
                {diagnostics.isWindowsHotspot
                  ? " (Windows Mobile Hotspot)"
                  : ""}
              </Text>
              <Text
                style={[styles.queryStatusText, { color: t.textSecondary }]}
              >
                • System DNS:{" "}
                <Text style={{ color: t.textPrimary, fontFamily: fonts.mono }}>
                  {diagnostics.dnsServers.join(", ") || "Default"}
                </Text>
              </Text>
              <Text
                style={[styles.queryStatusText, { color: t.textSecondary }]}
              >
                • Android Private DNS:{" "}
                <Text
                  style={{
                    color:
                      diagnostics.privateDnsMode === "off"
                        ? t.success
                        : t.warning,
                    fontFamily: fonts.mono,
                  }}
                >
                  {diagnostics.privateDnsMode}
                </Text>
                {"  "}• DNS Ping:{" "}
                <Text
                  style={{
                    color: diagnostics.dnsLatencyMs >= 0 ? t.success : t.danger,
                    fontFamily: fonts.mono,
                  }}
                >
                  {diagnostics.dnsLatencyMs >= 0
                    ? `${diagnostics.dnsLatencyMs}ms`
                    : "Timeout"}
                </Text>
              </Text>
            </View>

            {diagnostics.issues.map((issue, idx) => (
              <View
                key={`issue_${idx}`}
                style={{
                  backgroundColor: `${t.warning}15`,
                  borderColor: `${t.warning}40`,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: space.xs,
                  marginTop: 4,
                }}
              >
                <Text style={[styles.queryStatusText, { color: t.warning }]}>
                  ⚠️ {issue}
                </Text>
              </View>
            ))}

            {diagnostics.logs.length > 0 && (
              <View
                style={{
                  backgroundColor: t.bg,
                  borderColor: t.cardBorder,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: space.xs,
                  marginTop: space.xs,
                }}
              >
                {diagnostics.logs.slice(0, 3).map((logLine, idx) => (
                  <Text
                    key={`diag_log_${idx}`}
                    style={{
                      fontSize: 10,
                      fontFamily: fonts.mono,
                      color: t.textSecondary,
                      lineHeight: 14,
                    }}
                    numberOfLines={2}
                  >
                    {logLine}
                  </Text>
                ))}
              </View>
            )}

            <View style={{ marginTop: space.xs }}>
              <Button
                label={
                  isRepairingNet
                    ? "Repairing Wi-Fi & DNS..."
                    : "Fix Wi-Fi (!) & Optimize DNS Now"
                }
                variant="primary"
                onPress={handleRepairNetwork}
                disabled={isRepairingNet}
              />
            </View>
          </Card>
        )}

        {/* Estimated Savings Card */}
        <EstimatedSavingsCard totalBlocked={stats.totalBlocked} />

        {/* Clickable Metric Badges Grid (Like Dev Mode Badges) */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionHeaderRow}>
            <Overline>PROTECTION METRICS & ANALYTICS</Overline>
            <LocalizedText style={[styles.badgeHint, { color: t.textMuted }]}>
              Tap badge to open details
            </LocalizedText>
          </View>

          <View style={styles.metricGrid}>
            {/* 1. Total Blocked Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.accentCyan}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() =>
                router.push("/shield-query-log?filter=all" as never)
              }
            >
              <View style={styles.badgeTopRow}>
                <Overline>TOTAL BLOCKED</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <Text style={[styles.badgeNumber, { color: t.accentCyan }]}>
                {stats.totalBlocked}
              </Text>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                All Filtered Requests
              </Text>
            </Pressable>

            {/* 2. Ads Blocked Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.danger}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() =>
                router.push("/shield-query-log?filter=blocked" as never)
              }
            >
              <View style={styles.badgeTopRow}>
                <Overline>ADS BLOCKED</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <Text style={[styles.badgeNumber, { color: t.danger }]}>
                {stats.adsBlocked}
              </Text>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                Ad Networks
              </Text>
            </Pressable>

            {/* 3. Trackers Blocked Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.warning}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() =>
                router.push("/shield-query-log?filter=blocked" as never)
              }
            >
              <View style={styles.badgeTopRow}>
                <Overline>TRACKERS</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <Text style={[styles.badgeNumber, { color: t.warning }]}>
                {stats.trackersBlocked}
              </Text>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                Telemetry Endpoints
              </Text>
            </Pressable>

            {/* 4. Top Blocked Domains Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.primaryLight}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => router.push("/shield-top-domains" as never)}
            >
              <View style={styles.badgeTopRow}>
                <Overline>TOP DOMAINS</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <Text style={[styles.badgeNumber, { color: t.primaryLight }]}>
                {stats.topDomains.length}
              </Text>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                Ranked Domains →
              </Text>
            </Pressable>

            {/* 5. Most Blocked Apps Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.success}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => router.push("/shield-top-domains" as never)}
            >
              <View style={styles.badgeTopRow}>
                <Overline>APPS FILTERED</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <Text style={[styles.badgeNumber, { color: t.success }]}>
                {stats.appsWithBlockedCount}
              </Text>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                Active Apps →
              </Text>
            </Pressable>

            {/* 6. Live Feed Shortcut Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.badgeCard,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: `${t.warning}40`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => router.push("/shield-query-log" as never)}
            >
              <View style={styles.badgeTopRow}>
                <Overline>LIVE FEED</Overline>
                <ChevronRight size={14} color={t.textMuted} />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginVertical: 2,
                }}
              >
                <Radio size={16} color={t.warning} />
                <Text
                  style={[
                    styles.badgeSubtext,
                    { color: t.warning, fontWeight: "700" },
                  ]}
                >
                  STREAMING
                </Text>
              </View>
              <Text style={[styles.badgeSubtext, { color: t.textSecondary }]}>
                View Real-Time Logs →
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Ad DNS Blocker & Detected Ads Section */}
        <Card style={[styles.adBlockCard, { borderColor: `${t.danger}40` }]}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.xs,
              }}
            >
              <ShieldBan size={18} color={t.danger} />
              <LocalizedText
                style={[styles.sectionHeading, { color: t.textPrimary }]}
              >
                Detected Ads & Quick DNS Blocker
              </LocalizedText>
            </View>
            <View
              style={[
                styles.liveTag,
                {
                  backgroundColor: `${t.danger}18`,
                  borderColor: `${t.danger}40`,
                },
              ]}
            >
              <View style={[styles.liveDot, { backgroundColor: t.danger }]} />
              <Text style={[styles.liveTagText, { color: t.danger }]}>
                LIVE
              </Text>
            </View>
          </View>

          <LocalizedText style={[styles.cardHelp, { color: t.textSecondary }]}>
            Detected ad and tracking requests show here in real-time. If an ad
            slips through, tap &apos;+ Block&apos; to sinkhole its DNS domain
            immediately.
          </LocalizedText>

          {/* Direct Manual DNS Add Input */}
          <View
            style={[
              styles.inputRow,
              { borderColor: t.cardBorder, backgroundColor: t.bg },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: t.textPrimary }]}
              placeholder="e.g. adservice.google.com"
              placeholderTextColor={t.textMuted}
              value={manualDomain}
              onChangeText={setManualDomain}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Button
              label={
                actionInProgress === manualDomain.trim().toLowerCase()
                  ? "Adding..."
                  : "+ Block DNS"
              }
              variant="primary"
              onPress={handleAddManualDomain}
              disabled={actionInProgress != null || !manualDomain.trim()}
            />
          </View>

          {/* Recent Live Intercepted Ads / Queries Feed */}
          <View style={styles.queriesList}>
            <Overline>RECENT NETWORK QUERIES & DETECTED ADS</Overline>

            {recentQueries.length === 0 ? (
              <View
                style={[
                  styles.emptyQueryBox,
                  { backgroundColor: `${t.textMuted}10` },
                ]}
              >
                <Radio size={20} color={t.textMuted} />
                <Text
                  style={[styles.emptyQueryText, { color: t.textSecondary }]}
                >
                  {status.state === "connected"
                    ? "Waiting for network traffic... Open any app or browser with ads to see incoming queries."
                    : "Turn on Privacy Shield to start intercepting on-device ad requests."}
                </Text>
              </View>
            ) : (
              recentQueries.map((q) => {
                const isBlocked = q.blocked;
                const isBusy = actionInProgress === q.domain;

                return (
                  <View
                    key={q.id}
                    style={[
                      styles.queryItem,
                      {
                        backgroundColor: t.bg,
                        borderColor: isBlocked
                          ? `${t.danger}30`
                          : `${t.cardBorder}`,
                      },
                    ]}
                  >
                    <View style={styles.queryCopy}>
                      <Text
                        style={[styles.queryDomain, { color: t.textPrimary }]}
                        numberOfLines={1}
                      >
                        {q.domain}
                      </Text>
                      <View style={styles.queryMetaRow}>
                        {q.appName ? (
                          <Text
                            style={[styles.queryApp, { color: t.accentCyan }]}
                          >
                            {q.appName}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.queryStatusText,
                            { color: isBlocked ? t.danger : t.textMuted },
                          ]}
                        >
                          {isBlocked ? "Blocked (0.0.0.0)" : "Allowed"}
                        </Text>
                      </View>
                    </View>

                    {isBlocked ? (
                      <View
                        style={[
                          styles.blockedBadge,
                          {
                            backgroundColor: `${t.danger}15`,
                            borderColor: `${t.danger}40`,
                          },
                        ]}
                      >
                        <Check size={12} color={t.danger} />
                        <Text
                          style={[styles.blockedBadgeText, { color: t.danger }]}
                        >
                          BLOCKED
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.quickBlockBtn,
                          {
                            backgroundColor: `${t.danger}22`,
                            borderColor: t.danger,
                            opacity: pressed || isBusy ? 0.7 : 1,
                          },
                        ]}
                        disabled={isBusy}
                        onPress={() => handleBlockQueryDomain(q.domain)}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color={t.danger} />
                        ) : (
                          <>
                            <Plus size={12} color={t.danger} />
                            <Text
                              style={[
                                styles.quickBlockText,
                                { color: t.danger },
                              ]}
                            >
                              + Block
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}

            <Pressable
              style={({ pressed }) => [
                styles.viewAllLogsBtn,
                {
                  borderColor: `${t.accentCyan}40`,
                  backgroundColor: `${t.accentCyan}10`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => router.push("/shield-query-log" as never)}
            >
              <Text style={[styles.viewAllLogsText, { color: t.accentCyan }]}>
                View All Live Network Activity Logs & Manage Blocklist →
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Quick Shortcut to Top Blocked Domains Screen */}
        <Card
          style={[
            styles.navCard,
            { borderColor: `${t.primaryLight}30`, marginTop: space.sm },
          ]}
        >
          <View style={styles.navRow}>
            <IconContainer tone="cyan" size={40}>
              <Globe size={20} color={t.primaryLight} />
            </IconContainer>
            <View style={styles.navCopy}>
              <LocalizedText
                style={[styles.navTitle, { color: t.textPrimary }]}
              >
                Top Blocked Domains & Applications
              </LocalizedText>
              <LocalizedText
                style={[styles.navDesc, { color: t.textSecondary }]}
              >
                Inspect detailed domain rankings, category telemetry breakdown,
                and app attribution.
              </LocalizedText>
            </View>
            <Button
              label="View Stats"
              variant="secondary"
              onPress={() => router.push("/shield-top-domains" as never)}
            />
          </View>
        </Card>

        {/* Quick Shortcut to DNS Settings */}
        <Card
          style={[
            styles.navCard,
            { borderColor: `${t.accentCyan}30`, marginTop: space.sm },
          ]}
        >
          <View style={styles.navRow}>
            <IconContainer tone="cyan" size={40}>
              <SlidersHorizontal size={20} color={t.accentCyan} />
            </IconContainer>
            <View style={styles.navCopy}>
              <LocalizedText
                style={[styles.navTitle, { color: t.textPrimary }]}
              >
                Custom DNS Settings
              </LocalizedText>
              <LocalizedText
                style={[styles.navDesc, { color: t.textSecondary }]}
              >
                Configure DoH, DoT, or custom DNS upstream resolvers (AdGuard,
                Cloudflare, Google).
              </LocalizedText>
            </View>
            <Button
              label="Configure"
              variant="secondary"
              onPress={() => router.push("/dns-settings" as never)}
            />
          </View>
        </Card>

        {/* Integration with Privacy Inspector */}
        <Card
          style={[
            styles.navCard,
            { borderColor: `${t.success}30`, marginTop: space.sm },
          ]}
        >
          <View style={styles.navRow}>
            <IconContainer tone="success" size={40}>
              <ScanSearch size={20} color={t.success} />
            </IconContainer>
            <View style={styles.navCopy}>
              <LocalizedText
                style={[styles.navTitle, { color: t.textPrimary }]}
              >
                Privacy Inspector Integration
              </LocalizedText>
              <LocalizedText
                style={[styles.navDesc, { color: t.textSecondary }]}
              >
                Inspect app permissions, camera/mic activity, and special system
                access for installed apps.
              </LocalizedText>
            </View>
            <Button
              label="Inspect Apps"
              variant="secondary"
              onPress={() => router.push("/privacy-inspector" as never)}
            />
          </View>
        </Card>

        {/* Protection Coverage & Limitations Section */}
        <View style={{ marginTop: space.lg }}>
          <ProtectionCoverageSection />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xxl,
  },
  header: {
    marginBottom: space.md,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    lineHeight: 18,
    marginTop: 4,
  },
  badgesSection: {
    marginTop: space.sm,
    marginBottom: space.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.xs,
  },
  badgeHint: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
    marginTop: 4,
  },
  badgeCard: {
    flexBasis: "48.5%",
    flexGrow: 1,
    borderWidth: 1.2,
    borderRadius: radius.md,
    padding: space.sm,
  },
  badgeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeNumber: {
    fontSize: 20,
    fontFamily: fonts.heading,
    fontWeight: "700",
    marginTop: 2,
  },
  badgeSubtext: {
    fontSize: 10,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  adBlockCard: {
    borderWidth: 1.2,
    padding: space.md,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  cardHelp: {
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 16,
    marginVertical: space.xs,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveTagText: {
    fontSize: 9,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginVertical: space.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.mono,
    paddingVertical: 4,
  },
  queriesList: {
    marginTop: space.sm,
  },
  emptyQueryBox: {
    padding: space.md,
    borderRadius: radius.sm,
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
  },
  emptyQueryText: {
    fontSize: 11,
    fontFamily: fonts.body,
    textAlign: "center",
    lineHeight: 16,
  },
  queryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: space.xs,
  },
  queryCopy: {
    flex: 1,
    marginRight: space.xs,
  },
  queryDomain: {
    fontSize: 12,
    fontFamily: fonts.mono,
    fontWeight: "600",
  },
  queryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: 2,
  },
  queryApp: {
    fontSize: 10,
    fontFamily: fonts.body,
    fontWeight: "600",
  },
  queryStatusText: {
    fontSize: 10,
    fontFamily: fonts.body,
  },
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  blockedBadgeText: {
    fontSize: 9,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  quickBlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  quickBlockText: {
    fontSize: 10,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  viewAllLogsBtn: {
    padding: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    marginTop: space.sm,
  },
  viewAllLogsText: {
    fontSize: 11,
    fontFamily: fonts.heading,
    fontWeight: "600",
  },
  navCard: {
    borderWidth: 1.2,
    padding: space.sm,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  navCopy: {
    flex: 1,
  },
  navTitle: {
    fontSize: 13,
    fontFamily: fonts.heading,
  },
  navDesc: {
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 15,
    marginTop: 2,
  },
});
