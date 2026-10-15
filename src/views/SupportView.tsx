import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Coffee from 'lucide-react-native/icons/coffee';
import Heart from 'lucide-react-native/icons/heart';
import Sparkles from 'lucide-react-native/icons/sparkles';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Terminal from 'lucide-react-native/icons/terminal';
import Star from 'lucide-react-native/icons/star';
import ExternalLink from 'lucide-react-native/icons/external-link';
import LocalizedText from '@/components/LocalizedText';
import { Button, Card, IconContainer, Overline, Pill } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';
import { GithubIcon, GITHUB_REPO_URL, GITHUB_ISSUES_URL } from '@/components/GithubHeaderButton';

export const KOFI_URL = 'https://ko-fi.com/devmodeapp';

const PERKS = [
  {
    icon: ShieldCheck,
    title: '100% Rootless & Offline',
    desc: 'Zero telemetry, zero ads, zero trackers, and no root needed on your Android device.',
  },
  {
    icon: Sparkles,
    title: 'Instant Hardware Controls',
    desc: '1-tap toggles for Developer Options, USB & Wireless ADB, animation scales, and App Shield.',
  },
  {
    icon: Terminal,
    title: 'Open Source CLI Ecosystem',
    desc: 'Full desktop integration via dev-mode-cli npm package with wireless network bridge pairing.',
  },
];

export function SupportView() {
  const t = useTheme();

  const handleOpenKofi = () => {
    Linking.openURL(KOFI_URL).catch(() => {});
  };

  const handleOpenGitHub = () => {
    Linking.openURL(GITHUB_REPO_URL).catch(() => {});
  };

  const handleOpenIssues = () => {
    Linking.openURL(GITHUB_ISSUES_URL).catch(() => {});
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Overline>COMMUNITY & DONATIONS</Overline>
          <LocalizedText style={[s.title, { color: t.textPrimary }]}>Support Dev Mode</LocalizedText>
          <LocalizedText style={[s.subtitle, { color: t.textSecondary }]}>
            Dev Mode is free, open-source software built for developers, modders, and power users. Your support fuels continuous maintenance, new features, and Android updates!
          </LocalizedText>
        </View>

        {/* Master Ko-fi Support Card */}
        <Card
          style={{
            borderColor: 'rgba(92, 184, 92, 0.55)',
            backgroundColor: t.canvasElevated,
            borderWidth: 1.5,
          }}>
          <View style={s.kofiHero}>
            <View style={s.kofiBadgeContainer}>
              <Coffee size={28} color="#FFFFFF" />
            </View>
            <View style={s.kofiHeroCopy}>
              <View style={s.badgeRow}>
                <LocalizedText style={[s.kofiHeroTitle, { color: t.textPrimary }]}>
                  Buy me a Coffee
                </LocalizedText>
                <Pill label="KO-FI" tone="success" />
              </View>
              <LocalizedText style={[s.kofiHeroSub, { color: '#5cb85c' }]}>
                ko-fi.com/devmodeapp
              </LocalizedText>
            </View>
          </View>

          <LocalizedText style={[s.kofiHeroDesc, { color: t.textSecondary }]}>
            If you enjoy the fast hardware quick-toggles, desktop widgets, App Shield auto-off, or npm CLI bridge, consider buying a coffee to keep this project thriving!
          </LocalizedText>

          <Button
            label="Support me on Ko-fi"
            variant="primary"
            icon={<Coffee size={18} color="#FFFFFF" />}
            onPress={handleOpenKofi}
            style={{
              backgroundColor: '#5cb85c',
              borderColor: '#5cb85c',
              marginTop: space.sm,
            }}
          />
        </Card>

        {/* Why Support Section */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            WHAT YOUR SUPPORT POWERS
          </LocalizedText>
        </View>

        <View style={s.perksList}>
          {PERKS.map((perk, idx) => {
            const Icon = perk.icon;
            return (
              <Card key={idx} style={{ borderColor: `${t.accentCyan}25` }}>
                <View style={s.perkRow}>
                  <IconContainer tone="cyan" size={40}>
                    <Icon size={20} color={t.accentCyan} />
                  </IconContainer>
                  <View style={s.perkCopy}>
                    <LocalizedText style={[s.perkTitle, { color: t.textPrimary }]}>
                      {perk.title}
                    </LocalizedText>
                    <LocalizedText style={[s.perkDesc, { color: t.textSecondary }]}>
                      {perk.desc}
                    </LocalizedText>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* GitHub & Other Ways to Support */}
        <View style={s.sectionHeader}>
          <LocalizedText style={[s.sectionTitle, { color: t.textMuted }]}>
            OTHER WAYS TO HELP
          </LocalizedText>
        </View>

        <Card style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <View style={s.githubHeader}>
            <View style={s.githubIconWrap}>
              <GithubIcon size={22} color="#FFFFFF" />
            </View>
            <View style={s.githubCopy}>
              <LocalizedText style={[s.githubTitle, { color: t.textPrimary }]}>
                Star on GitHub & Report Issues
              </LocalizedText>
              <LocalizedText style={[s.githubDesc, { color: t.textSecondary }]}>
                Starring the repository helps more developers discover the tool. Feedback and pull requests are always welcome!
              </LocalizedText>
            </View>
          </View>

          <View style={s.githubActions}>
            <Button
              label="Star Repository"
              variant="secondary"
              icon={<Star size={16} color={t.accentCyan} />}
              onPress={handleOpenGitHub}
              style={{ flex: 1 }}
            />
            <Button
              label="Submit Issue"
              variant="ghost"
              icon={<ExternalLink size={16} color={t.textSecondary} />}
              onPress={handleOpenIssues}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Footer note */}
        <View style={s.footerNote}>
          <Heart size={14} color="#EF4444" />
          <LocalizedText style={[s.footerNoteText, { color: t.textMuted }]}>
            Crafted with care by Jhayr Cervantes (@Ryderhxrzy)
          </LocalizedText>
        </View>
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
  kofiHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.xs,
  },
  kofiBadgeContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: '#5cb85c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5cb85c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  kofiHeroCopy: {
    flex: 1,
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kofiHeroTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  kofiHeroSub: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  kofiHeroDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginVertical: space.xs,
  },
  sectionHeader: {
    marginTop: space.xs,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
  },
  perksList: {
    gap: space.sm,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  perkCopy: {
    flex: 1,
    gap: 2,
  },
  perkTitle: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
  },
  perkDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  githubHeader: {
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
    gap: 3,
  },
  githubTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  githubDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  githubActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: space.sm,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: space.md,
  },
  footerNoteText: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
});

