import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Overline } from '@/components/ui';
import LocalizedText from '@/components/LocalizedText';
import { fonts, space, useTheme } from '@/theme';
import { ShieldStatsDashboard } from '@/features/privacy-shield/ShieldStatsDashboard';
import {
  getCachedPrivacyShieldStats,
  getPrivacyShieldStats,
} from '@/features/privacy-shield/shieldStorage';
import type { ShieldStats, ShieldTimeFilter } from '@/features/privacy-shield/types';

export default function ShieldTopDomainsScreen() {
  const t = useTheme();
  const [timeFilter, setTimeFilter] = useState<ShieldTimeFilter>('today');
  const [stats, setStats] = useState<ShieldStats>(() =>
    getCachedPrivacyShieldStats('today'),
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleFilterChange = useCallback((nextFilter: ShieldTimeFilter) => {
    setTimeFilter(nextFilter);
    setStats(getCachedPrivacyShieldStats(nextFilter));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await getPrivacyShieldStats(timeFilter);
      setStats(data);
    } catch {
      // Graceful fallback
    }
  }, [timeFilter]);

  useEffect(() => {
    let active = true;
    getPrivacyShieldStats(timeFilter).then(data => {
      if (active) setStats(data);
    }).catch(() => {});

    const interval = setInterval(() => {
      getPrivacyShieldStats(timeFilter).then(data => {
        if (active) setStats(data);
      }).catch(() => {});
    }, 3500);

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
        }>
        <View style={styles.header}>
          <Overline>ANALYTICS & INSIGHTS</Overline>
          <LocalizedText style={[styles.title, { color: t.textPrimary }]}>
            Top Blocked Domains & Apps
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: t.textSecondary }]}>
            Rankings of blocked ad servers, telemetry endpoints, and originating applications filtered on your device.
          </LocalizedText>
        </View>

        <ShieldStatsDashboard
          stats={stats}
          timeFilter={timeFilter}
          onFilterChange={handleFilterChange}
        />
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
});

