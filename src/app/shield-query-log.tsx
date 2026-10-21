import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Overline } from '@/components/ui';
import LocalizedText from '@/components/LocalizedText';
import { fonts, space, useTheme } from '@/theme';
import { LiveQueryInspectorCard } from '@/features/privacy-shield/LiveQueryInspectorCard';
import {
  getCachedPrivacyShieldStatus,
  getPrivacyShieldStatus,
} from '@/features/privacy-shield/shieldStorage';
import type { LiveQueryFilter } from '@/features/privacy-shield/types';

export default function ShieldQueryLogScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const initialFilter = (params.filter as LiveQueryFilter) || 'all';
  const [vpnActive, setVpnActive] = useState(
    () => getCachedPrivacyShieldStatus().state === 'connected',
  );
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await getPrivacyShieldStatus();
      setVpnActive(res.state === 'connected');
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    let isMounted = true;
    getPrivacyShieldStatus()
      .then(res => {
        if (isMounted) {
          setVpnActive(res.state === 'connected');
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
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
          <Overline>REAL-TIME DNS FEED</Overline>
          <LocalizedText style={[styles.title, { color: t.textPrimary }]}>
            Network Activity Log
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: t.textSecondary }]}>
            Inspect all incoming DNS queries from apps across your device. Slipped-through ads can be blocked instantly with one tap.
          </LocalizedText>
        </View>

        <LiveQueryInspectorCard vpnActive={vpnActive} initialFilter={initialFilter} />
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
