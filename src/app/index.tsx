import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsIcon from 'lucide-react-native/icons/settings';
import { router, useLocalSearchParams } from 'expo-router';
import LocalizedText from '@/components/LocalizedText';
import { ScreenBackground } from '@/components/ScreenBackground';
import { CyberBottomNav, type TabKey } from '@/components/CyberBottomNav';
import { GithubHeaderButton } from '@/components/GithubHeaderButton';
import DevToggle, { type DeviceStatus } from '@/modules/dev-toggle-native';
import { fonts, radius, space, useTheme } from '@/theme';

import { DashboardView, SCALE_OPTIONS } from '@/views/DashboardView';
import { AppShieldView } from '@/views/AppShieldView';
import { NpmCommandsView } from '@/views/NpmCommandsView';
import { SupportView } from '@/views/SupportView';

export { SCALE_OPTIONS };

const TABS: TabKey[] = ['dashboard', 'app-shield', 'setup', 'support'];

const TAB_SUBTITLES: Record<string, string> = {
  dashboard: 'HARDWARE CONTROLS',
  'app-shield': 'APP SHIELD & AUTO-OFF',
  setup: 'NPM CLI COMMANDS',
  support: 'SUPPORT & DONATE',
};

export default function MainPager() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = params.tab && TABS.includes(params.tab as TabKey) ? (params.tab as TabKey) : 'dashboard';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [devModeActive, setDevModeActive] = useState(false);

  const switchToTab = useCallback((key: TabKey, animated = true) => {
    const index = TABS.indexOf(key);
    if (index >= 0) {
      setActiveTab(key);
      pagerRef.current?.scrollTo({ x: index * width, animated });
    }
  }, [width]);

  // Handle URL param changes (e.g. ?tab=support or ?tab=dev-settings)
  useEffect(() => {
    if (params.tab === 'dev-settings') {
      router.push('/dev-settings');
      return;
    }
    if (params.tab && TABS.includes(params.tab as TabKey)) {
      const index = TABS.indexOf(params.tab as TabKey);
      pagerRef.current?.scrollTo({ x: index * width, animated: false });
    }
  }, [params.tab, width]);

  const handleStatusChange = useCallback((status: DeviceStatus) => {
    setDevModeActive(status.developerOptions === 'enabled');
  }, []);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.max(0, Math.min(TABS.length - 1, Math.round(offsetX / width)));
    const targetTab = TABS[pageIndex];
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.screen} edges={['top']}>
        {/* Top Header Bar */}
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Developer Options in Settings"
            onPress={() => {
              void DevToggle.openSettings('developerOptions');
            }}
            style={({ pressed }) => [s.brandGroup, { opacity: pressed ? 0.75 : 1 }]}>
            <View style={s.headerLogoContainer}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={s.headerLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={s.brandCopy}>
              <LocalizedText style={[s.title, { color: t.textPrimary }]}>Dev Mode</LocalizedText>
              <LocalizedText style={[s.activeTabBadge, { color: t.primary }]}>
                {TAB_SUBTITLES[activeTab]}
              </LocalizedText>
            </View>
          </Pressable>

          <View style={s.headerActions}>
            <GithubHeaderButton size={40} borderRadius={radius.md} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Developer Settings"
              onPress={() => router.push('/dev-settings')}
              style={({ pressed }) => [
                s.settingsBtn,
                {
                  backgroundColor: t.canvasElevated,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <SettingsIcon size={19} color={t.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Horizontal Swipable Pager */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          style={s.pager}>
          {/* Tab 0: Dashboard */}
          <View style={{ width, flex: 1 }}>
            <DashboardView
              onStatusChange={handleStatusChange}
              onOpenSettings={() => router.push('/dev-settings')}
            />
          </View>

          {/* Tab 1: App Shield */}
          <View style={{ width, flex: 1 }}>
            <AppShieldView isActive={activeTab === 'app-shield'} />
          </View>

          {/* Tab 2: npm CLI Commands */}
          <View style={{ width, flex: 1 }}>
            <NpmCommandsView />
          </View>

          {/* Tab 3: Support */}
          <View style={{ width, flex: 1 }}>
            <SupportView />
          </View>
        </ScrollView>

        {/* Global Bottom Navigation Bar */}
        <CyberBottomNav
          currentTab={activeTab}
          devModeActive={devModeActive}
          onTabPress={switchToTab}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: '#050D0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImage: {
    width: 38,
    height: 38,
  },
  brandCopy: {
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 25,
  },
  activeTabBadge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pager: {
    flex: 1,
  },
});
