import { router } from 'expo-router';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sliders from 'lucide-react-native/icons/sliders-vertical';
import Shield from 'lucide-react-native/icons/shield';
import Terminal from 'lucide-react-native/icons/terminal';
import Coffee from 'lucide-react-native/icons/coffee';
import LocalizedText from '@/components/LocalizedText';
import { fonts, radius, space, useTheme } from '@/theme';

export type TabKey = 'dashboard' | 'app-shield' | 'setup' | 'support' | 'dev-settings';

interface TabItem {
  key: TabKey;
  label: string;
  route: '/' | '/app-shield' | '/setup' | '/support';
  icon: typeof Sliders;
}

const TABS: TabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    route: '/',
    icon: Sliders,
  },
  {
    key: 'app-shield',
    label: 'App Shield',
    route: '/app-shield',
    icon: Shield,
  },
  {
    key: 'setup',
    label: 'npm',
    route: '/setup',
    icon: Terminal,
  },
  {
    key: 'support',
    label: 'Support',
    route: '/support',
    icon: Coffee,
  },
];

export interface CyberBottomNavProps {
  currentTab: TabKey;
  devModeActive?: boolean;
  permissionPending?: boolean;
  onTabPress?: (key: TabKey) => void;
}

export function CyberBottomNav({
  currentTab,
  devModeActive = false,
  permissionPending = false,
  onTabPress,
}: CyberBottomNavProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12);

  const handleTabPress = (route: TabItem['route'], key: TabKey) => {
    if (onTabPress) {
      onTabPress(key);
      return;
    }
    if (key === currentTab) return;
    router.replace(route);
  };

  return (
    <View
      style={[
        s.container,
        {
          paddingBottom: bottomInset,
          backgroundColor: '#060F0C',
          borderTopColor: '#163324',
        },
      ]}>
      <View style={s.tabRow}>
        {TABS.map(tab => {
          const isActive = tab.key === currentTab;
          const Icon = tab.icon;
          const activeColor = t.primary;
          const inactiveColor = '#64748B';

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => handleTabPress(tab.route, tab.key)}
              style={({ pressed }) => [
                s.tabItem,
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}>
              {/* Active neon indicator bar */}
              {isActive && (
                <View
                  style={[
                    s.activeIndicator,
                    {
                      backgroundColor: activeColor,
                      shadowColor: activeColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 4,
                    },
                  ]}
                />
              )}

              {/* Icon Container with glowing background when active */}
              <View
                style={[
                  s.iconWrap,
                  isActive && {
                    backgroundColor: `${activeColor}1A`,
                    borderColor: `${activeColor}40`,
                    borderWidth: 1,
                  },
                ]}>
                <Icon size={20} color={isActive ? activeColor : inactiveColor} />

                {/* Status Dot */}
                {tab.key === 'dashboard' && devModeActive && (
                  <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
                )}
                {tab.key === 'setup' && permissionPending && (
                  <View style={[s.statusDot, { backgroundColor: '#F59E0B' }]} />
                )}
              </View>

              {/* Tab Title */}
              <LocalizedText
                style={[
                  s.tabLabel,
                  {
                    color: isActive ? t.textPrimary : inactiveColor,
                    fontFamily: isActive ? fonts.heading : fonts.body,
                  },
                ]}>
                {tab.label}
              </LocalizedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 16,
    zIndex: 999,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: space.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
    borderColor: '#060F0C',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

