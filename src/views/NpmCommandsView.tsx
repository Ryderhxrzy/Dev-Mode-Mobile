import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Sliders from 'lucide-react-native/icons/sliders-vertical';
import Wifi from 'lucide-react-native/icons/wifi';
import Laptop from 'lucide-react-native/icons/laptop';
// Web Remote Dashboard disabled: import Monitor from 'lucide-react-native/icons/monitor';
import Gauge from 'lucide-react-native/icons/gauge';
// Web Remote Dashboard disabled: import Network from 'lucide-react-native/icons/network';
import Bug from 'lucide-react-native/icons/bug';
import LocalizedText from '@/components/LocalizedText';
import { Button, Card, CodeBlock, IconContainer, Overline, Pill } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';
import { GithubIcon, GITHUB_REPO_URL, GITHUB_ISSUES_URL } from '@/components/GithubHeaderButton';

const CLI_COMMAND_GROUPS = [
  // Web Remote Dashboard and its local network bridge are disabled.
  // {
  //   category: 'LOCAL NETWORK BRIDGE (REQUIRED FOR WI-FI)',
  //   icon: Network,
  //   badge: 'SAME WI-FI',
  //   badgeTone: 'warning' as const,
  //   items: [
  //     {
  //       title: 'Network Bridge to Mobile App',
  //       installedCmd: 'devmode bridge',
  //       npxCmd: 'npx dev-mode-cli bridge',
  //     },
  //   ],
  // },
  {
    category: 'CORE POWER & DEV MODE',
    icon: Sliders,
    badge: 'ESSENTIAL',
    badgeTone: 'success' as const,
    items: [
      {
        title: 'Turn Dev Mode ON',
        desc: 'Turns ON Developer Options with official green ASCII art in terminal.',
        installedCmd: 'devmode on',
        npxCmd: 'npx dev-mode-cli on',
      },
      {
        title: 'Turn Dev Mode OFF',
        desc: 'Disables Developer Options instantly from your PC.',
        installedCmd: 'devmode off',
        npxCmd: 'npx dev-mode-cli off',
      },
      {
        title: 'Check Device Status',
        desc: 'Shows live Dev Mode state, battery, IP address, and active port.',
        installedCmd: 'devmode status',
        npxCmd: 'npx dev-mode-cli status',
      },
      {
        title: 'List Connected Devices',
        desc: 'Lists all detected Android phones, models, IP, and connection modes.',
        installedCmd: 'devmode devices',
        npxCmd: 'npx dev-mode-cli devices',
      },
    ],
  },
  {
    category: 'WIRELESS ADB (AUTO-CONNECT)',
    icon: Wifi,
    badge: 'NO CABLE',
    badgeTone: 'cyan' as const,
    items: [
      {
        title: 'Enable Wireless ADB & Auto-Connect',
        desc: 'Auto-resolves your phone IP & Port, then connects Wireless ADB automatically!',
        installedCmd: 'devmode wifi on',
        npxCmd: 'npx dev-mode-cli wifi on',
      },
      {
        title: 'Disable Wireless ADB',
        desc: 'Disconnects and turns off Wireless Debugging.',
        installedCmd: 'devmode wifi off',
        npxCmd: 'npx dev-mode-cli wifi off',
      },
      {
        title: 'Connect over Wi-Fi',
        desc: 'Connects to a specific IP or auto-detects device if omitted.',
        installedCmd: 'devmode wifi connect',
        npxCmd: 'npx dev-mode-cli wifi connect',
      },
    ],
  },
  {
    category: 'USB & SYSTEM TUNING',
    icon: Gauge,
    badge: 'PERFORMANCE',
    badgeTone: 'warning' as const,
    items: [
      {
        title: 'USB Debugging ON',
        desc: 'Enables physical USB cable ADB debugging.',
        installedCmd: 'devmode usb on',
        npxCmd: 'npx dev-mode-cli usb on',
      },
      {
        title: 'USB Debugging OFF',
        desc: 'Disables physical USB cable ADB debugging.',
        installedCmd: 'devmode usb off',
        npxCmd: 'npx dev-mode-cli usb off',
      },
      {
        title: 'Apply 0.5x Speed Booster',
        desc: 'Sets all window, transition, and animator scales to 0.5x snappy preset.',
        installedCmd: 'devmode scale 0.5',
        npxCmd: 'npx dev-mode-cli scale 0.5',
      },
      {
        title: 'Reset Default Scales (1.0x)',
        desc: 'Restores default animation durations.',
        installedCmd: 'devmode scale 1.0',
        npxCmd: 'npx dev-mode-cli scale 1.0',
      },
    ],
  },
  // Web Remote Dashboard disabled.
  // {
  //   category: 'PC DESKTOP WEB REMOTE',
  //   icon: Monitor,
  //   badge: 'BROWSER',
  //   badgeTone: 'primary' as const,
  //   items: [
  //     {
  //       title: 'Launch Web Dashboard in Browser',
  //       desc: 'Opens an interactive browser GUI on your PC to toggle your phone settings.',
  //       installedCmd: 'devmode web',
  //       npxCmd: 'npx dev-mode-cli web',
  //     },
  //   ],
  // },
];

export function NpmCommandsView() {
  const t = useTheme();
  const [useGlobalSyntax, setUseGlobalSyntax] = useState(true);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Overline>NPM COMMAND CENTER</Overline>
          <LocalizedText style={[s.title, { color: t.textPrimary }]}>Dev Mode CLI</LocalizedText>
          <LocalizedText style={[s.subtitle, { color: t.textSecondary }]}>
            Control your device directly from your PC terminal via network or USB. No manual screen tapping needed!
          </LocalizedText>
        </View>

        {/* Global vs NPX syntax switcher */}
        <Card style={{ borderColor: `${t.accentCyan}40`, backgroundColor: t.canvasElevated }}>
          <View style={s.switcherHeader}>
            <View style={s.switcherCopy}>
              <LocalizedText style={[s.switcherTitle, { color: t.textPrimary }]}>
                Command Syntax Switcher
              </LocalizedText>
              <LocalizedText style={[s.switcherDesc, { color: t.textSecondary }]}>
                {useGlobalSyntax
                  ? 'Showing global commands (`devmode ...`)'
                  : 'Showing zero-install commands (`npx dev-mode-cli ...`)'}
              </LocalizedText>
            </View>
            <View style={s.syntaxPillRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch to global devmode command syntax"
                onPress={() => setUseGlobalSyntax(true)}
                style={[
                  s.syntaxPill,
                  useGlobalSyntax && {
                    backgroundColor: t.accentCyan,
                    borderColor: t.accentCyan,
                  },
                ]}>
                <LocalizedText
                  style={[
                    s.syntaxPillText,
                    { color: useGlobalSyntax ? '#000000' : t.textSecondary },
                  ]}>
                  devmode
                </LocalizedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch to npx dev-mode-cli command syntax"
                onPress={() => setUseGlobalSyntax(false)}
                style={[
                  s.syntaxPill,
                  !useGlobalSyntax && {
                    backgroundColor: t.accentCyan,
                    borderColor: t.accentCyan,
                  },
                ]}>
                <LocalizedText
                  style={[
                    s.syntaxPillText,
                    { color: !useGlobalSyntax ? '#000000' : t.textSecondary },
                  ]}>
                  npx
                </LocalizedText>
              </Pressable>
            </View>
          </View>

          {/* Quick Install Guide */}
          <View style={s.installBox}>
            <LocalizedText style={[s.installLabel, { color: t.textMuted }]}>
              ONE-TIME GLOBAL INSTALL (RECOMMENDED):
            </LocalizedText>
            <CodeBlock command="npm install -g dev-mode-cli" />
          </View>
        </Card>

        {/* Interactive Keyboard Menu Banner */}
        <Card
          style={{
            borderColor: `${t.primary}50`,
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
          }}>
          <View style={s.interactiveHeader}>
            <View style={s.interactiveHeaderLeft}>
              <IconContainer tone="success" size={38}>
                <Laptop size={20} color={t.primary} />
              </IconContainer>
              <View style={s.interactiveTextContainer}>
                <LocalizedText style={[s.interactiveTitle, { color: t.textPrimary }]}>
                  Interactive Arrow-Key Menu
                </LocalizedText>
                <LocalizedText style={[s.interactiveSubtitle, { color: t.textSecondary }]}>
                  Run with no arguments for an interactive cyber CLI menu
                </LocalizedText>
              </View>
            </View>
            <View style={s.badgeContainer}>
              <Pill label="RECOMMENDED" tone="success" />
            </View>
          </View>
          <CodeBlock command={useGlobalSyntax ? 'devmode' : 'npx dev-mode-cli'} />
        </Card>

        {/* Command Groups List */}
        {CLI_COMMAND_GROUPS.map((group, groupIdx) => {
          const GroupIcon = group.icon;
          return (
            <View key={groupIdx} style={s.groupContainer}>
              <View style={s.groupHeader}>
                <IconContainer tone="cyan" size={32}>
                  <GroupIcon size={16} color={t.accentCyan} />
                </IconContainer>
                <LocalizedText style={[s.groupCategoryTitle, { color: t.textPrimary }]}>
                  {group.category}
                </LocalizedText>
                <Pill label={group.badge} tone={group.badgeTone} />
              </View>

              {group.note && (
                <View style={[s.groupNoteBox, { backgroundColor: `${t.warning}15`, borderColor: `${t.warning}40` }]}>
                  <LocalizedText style={[s.groupNoteText, { color: t.textPrimary }]}>
                    {group.note}
                  </LocalizedText>
                </View>
              )}

              <View style={s.commandsList}>
                {group.items.map((item, itemIdx) => {
                  const activeCmd = useGlobalSyntax ? item.installedCmd : item.npxCmd;
                  return (
                    <Card key={itemIdx} style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <View style={s.commandRow}>
                        <View style={s.commandCopy}>
                          <LocalizedText style={[s.commandTitle, { color: t.textPrimary }]}>
                            {item.title}
                          </LocalizedText>
                          <LocalizedText style={[s.commandDesc, { color: t.textSecondary }]}>
                            {item.desc}
                          </LocalizedText>
                        </View>
                      </View>
                      <CodeBlock command={activeCmd} />
                    </Card>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Troubleshooting & Same Wi-Fi Reminder */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            CONNECTIVITY TIPS
          </LocalizedText>
        </View>

        <Card style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <View style={s.tipRow}>
            <IconContainer tone="cyan" size={36}>
              <Wifi size={18} color={t.accentCyan} />
            </IconContainer>
            <View style={s.tipCopy}>
              <LocalizedText style={[s.tipTitle, { color: t.textPrimary }]}>
                Same Local Network Requirement
              </LocalizedText>
              <LocalizedText style={[s.tipDesc, { color: t.textSecondary }]}>
                Wireless ADB commands require your computer and phone to be reachable on the same local network.
              </LocalizedText>
            </View>
          </View>
        </Card>

        {/* Community & GitHub Links */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            COMMUNITY & ISSUES
          </LocalizedText>
        </View>

        <Card style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <View style={s.githubRow}>
            <View style={s.githubIconWrap}>
              <GithubIcon size={24} color="#FFFFFF" />
            </View>
            <View style={s.githubCopy}>
              <LocalizedText style={[s.githubTitle, { color: t.textPrimary }]}>
                Dev Mode Mobile on GitHub
              </LocalizedText>
              <LocalizedText style={[s.githubDesc, { color: t.textSecondary }]}>
                Open-source repository, release APKs, issue reporting, and contribution guides.
              </LocalizedText>
            </View>
          </View>
          <View style={s.githubActionRow}>
            <Button
              label="View Repository"
              variant="secondary"
              icon={<GithubIcon size={16} color={t.accentCyan} />}
              onPress={() => Linking.openURL(GITHUB_REPO_URL).catch(() => {})}
              style={{ flex: 1 }}
            />
            <Button
              label="Submit Issue"
              variant="ghost"
              icon={<Bug size={16} color={t.textSecondary} />}
              onPress={() => Linking.openURL(GITHUB_ISSUES_URL).catch(() => {})}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 110,
    gap: space.md,
  },
  header: {
    gap: 4,
    paddingBottom: space.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.sm,
  },
  switcherCopy: {
    flex: 1,
  },
  switcherTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  switcherDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  syntaxPillRow: {
    flexDirection: 'row',
    backgroundColor: '#0F2318',
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  syntaxPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  syntaxPillText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    fontWeight: '700',
  },
  installBox: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.sm,
  },
  installLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  interactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    gap: space.sm,
  },
  interactiveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flex: 1,
  },
  interactiveTextContainer: {
    flex: 1,
    gap: 2,
  },
  interactiveTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  interactiveSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  badgeContainer: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  groupContainer: {
    gap: space.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  groupCategoryTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    letterSpacing: 0.5,
    flex: 1,
  },
  groupNoteBox: {
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  groupNoteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  commandsList: {
    gap: space.sm,
  },
  commandRow: {
    marginBottom: space.xs,
  },
  commandCopy: {
    gap: 2,
  },
  commandTitle: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
  },
  commandDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 16,
  },
  sectionHeader: {
    marginTop: space.xs,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  tipCopy: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  tipDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 16,
  },
  githubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    marginBottom: space.sm,
  },
  githubIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubCopy: {
    flex: 1,
    gap: 2,
  },
  githubTitle: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
  },
  githubDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  githubActionRow: {
    flexDirection: 'row',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.sm,
  },
});
