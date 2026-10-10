import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SunMedium,
  Hand,
  Crosshair,
  ArrowLeft,
  Sliders,
  Layers,
} from 'lucide-react-native';
import DevToggle, {
  type ExtraSettingName,
  type SettingState,
} from '@/modules/dev-toggle-native';
import { Button, Card, FeatureRow, IconContainer, Overline, Pill } from '@/components/ui';
import { fonts, space, useTheme } from '@/theme';

const EXTRA_SETTINGS: {
  key: ExtraSettingName;
  title: string;
  desc: string;
  icon: 'stayAwake' | 'showTouches' | 'pointerLocation';
}[] = [
  {
    key: 'stayAwake',
    title: 'Stay Awake While Charging',
    desc: 'Screen will never sleep while connected to AC or USB power.',
    icon: 'stayAwake',
  },
  {
    key: 'showTouches',
    title: 'Show Visual Touch Taps',
    desc: 'Shows visual touch circles on the screen wherever you tap.',
    icon: 'showTouches',
  },
  {
    key: 'pointerLocation',
    title: 'Pointer Location Tracker',
    desc: 'Displays screen touch overlay coordinates and crosshair data.',
    icon: 'pointerLocation',
  },
];

export default function DevSettings() {
  const t = useTheme();
  const [permission, setPermission] = useState<boolean>(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<ExtraSettingName, SettingState>>({
    stayAwake: 'unknown',
    showTouches: 'unknown',
    pointerLocation: 'unknown',
  });

  const loadData = useCallback(async () => {
    try {
      const [perm, data] = await Promise.all([
        DevToggle.getPermissionStatus(),
        DevToggle.getExtraSettings(),
      ]);
      setPermission(perm === 'granted');
      setSettings(data);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      DevToggle.getPermissionStatus(),
      DevToggle.getExtraSettings(),
    ]).then(([perm, data]) => {
      if (active) {
        setPermission(perm === 'granted');
        setSettings(data);
      }
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadData();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [loadData]);

  const toggleSetting = async (key: ExtraSettingName) => {
    setBusy(key);
    const willEnable = settings[key] !== 'enabled';
    try {
      const res = await DevToggle.setExtraSetting(key, willEnable);
      await loadData();
      if (!res.changed) Alert.alert('Action Denied', res.message);
    } finally {
      setBusy(null);
    }
  };

  const renderIcon = (type: string, isEnabled: boolean) => {
    switch (type) {
      case 'stayAwake':
        return <SunMedium size={22} color={isEnabled ? t.success : t.accentCyan} />;
      case 'showTouches':
        return <Hand size={22} color={isEnabled ? t.success : t.accentCyan} />;
      case 'pointerLocation':
        return <Crosshair size={22} color={isEnabled ? t.success : t.warning} />;
      default:
        return <Sliders size={22} color={t.accentCyan} />;
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <SafeAreaView style={s.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Overline>ADVANCED CONFIGURATION</Overline>
            <Text style={[s.title, { color: t.textPrimary }]}>Developer Settings</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              Additional Android developer options for device testing, touch inspection, and power management.
            </Text>
          </View>

          {/* Settings List */}
          <View style={s.list}>
            {EXTRA_SETTINGS.map(item => {
              const state = settings[item.key];
              const isEnabled = state === 'enabled';

              return (
                <Card key={item.key}>
                  <View style={s.row}>
                    <IconContainer tone={isEnabled ? 'success' : 'cyan'} size={44}>
                      {renderIcon(item.icon, isEnabled)}
                    </IconContainer>

                    <View style={s.rowCopy}>
                      <Text style={[s.rowTitle, { color: t.textPrimary }]}>{item.title}</Text>
                      <Text style={[s.rowDesc, { color: t.textSecondary }]}>{item.desc}</Text>
                    </View>

                    {permission ? (
                      busy === item.key ? (
                        <ActivityIndicator color={t.accentCyan} />
                      ) : (
                        <Switch
                          accessibilityLabel={`${item.title} switch`}
                          value={isEnabled}
                          onValueChange={() => toggleSetting(item.key)}
                          trackColor={{ false: t.borderSubtle, true: t.success }}
                          thumbColor="#FFFFFF"
                        />
                      )
                    ) : (
                      <Pill label={isEnabled ? 'ON' : 'OFF'} tone={isEnabled ? 'success' : 'neutral'} />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Quick System Settings Intent */}
          <Card style={{ backgroundColor: t.canvasElevated }}>
            <FeatureRow
              tone="cyan"
              icon={<Layers size={20} color={t.accentCyan} />}
              title="Full System Developer Options"
              body="Open Android's native Developer Options screen to configure Bluetooth codecs, mock locations, and GPU rendering."
            />
            <Button
              variant="secondary"
              label="Open System Developer Menu"
              icon={<Sliders size={15} color="#FFFFFF" />}
              onPress={() => DevToggle.openSettings('developerOptions')}
            />
          </Card>

          <Button
            variant="ghost"
            label="Back to Dashboard"
            icon={<ArrowLeft size={16} color={t.textSecondary} />}
            onPress={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 28,
    gap: space.lg,
    width: '100%',
  },
  header: { gap: space.xs, width: '100%' },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  list: { gap: space.md, width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  rowDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
});

