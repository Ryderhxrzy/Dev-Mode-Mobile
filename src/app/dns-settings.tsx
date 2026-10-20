import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Server from 'lucide-react-native/icons/server';
import Check from 'lucide-react-native/icons/check';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Zap from 'lucide-react-native/icons/zap';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, Card, IconContainer, Overline } from '@/components/ui';
import LocalizedText from '@/components/LocalizedText';
import { fonts, radius, space, useTheme } from '@/theme';
import type { DnsConfig, DnsProtocol, DnsProviderId } from '@/features/privacy-shield/types';
import {
  DNS_PRESETS,
  type ConnectionTestResult,
  testDnsConnection,
  validateDnsConfig,
} from '@/features/privacy-shield/dnsPresets';
import {
  DEFAULT_DNS_CONFIG,
  getPrivacyShieldStatus,
  setPrivacyShieldDnsConfig,
} from '@/features/privacy-shield/shieldStorage';

export default function DnsSettingsScreen() {
  const t = useTheme();
  const [selectedProvider, setSelectedProvider] = useState<DnsProviderId>('cloudflare');
  const [selectedProtocol, setSelectedProtocol] = useState<DnsProtocol>('doh');

  // Active saved DNS config
  const [activeConfig, setActiveConfig] = useState<DnsConfig>(DEFAULT_DNS_CONFIG);

  // Form edit state
  const [formConfig, setFormConfig] = useState<DnsConfig>(DEFAULT_DNS_CONFIG);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Connection testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getPrivacyShieldStatus().then(status => {
      if (active && status?.activeDns) {
        setActiveConfig(status.activeDns);
        setSelectedProvider(status.activeDns.provider);
        setSelectedProtocol(status.activeDns.protocol);
        setFormConfig(status.activeDns);
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // When changing provider preset
  const handleSelectPreset = (providerId: DnsProviderId) => {
    setSelectedProvider(providerId);
    setTestResult(null);
    setValidationErrors({});

    const preset = DNS_PRESETS.find(p => p.id === providerId);
    if (preset) {
      const protocolConfig = preset.protocols[selectedProtocol] || preset.protocols.doh;
      setFormConfig({ ...protocolConfig });
    }
  };

  // When changing protocol (DoH, DoT, Plain)
  const handleSelectProtocol = (protocol: DnsProtocol) => {
    setSelectedProtocol(protocol);
    setTestResult(null);
    setValidationErrors({});

    const preset = DNS_PRESETS.find(p => p.id === selectedProvider);
    if (preset && preset.id !== 'custom') {
      const protocolConfig = preset.protocols[protocol];
      setFormConfig({ ...protocolConfig });
    } else {
      setFormConfig(prev => ({
        ...prev,
        protocol,
        port: protocol === 'doh' ? 443 : protocol === 'dot' ? 853 : 53,
      }));
    }
  };

  // Run real connection probe
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testDnsConnection(formConfig);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        latencyMs: 0,
        statusMessage: 'Connection test failed to run.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Save selected configuration
  const handleSave = async () => {
    const validation = validateDnsConfig(formConfig);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Please fix the configuration errors before saving.', ToastAndroid.SHORT);
      }
      return;
    }

    setSaving(true);
    try {
      await setPrivacyShieldDnsConfig(formConfig);
      setActiveConfig(formConfig);
      setValidationErrors({});

      if (Platform.OS === 'android') {
        ToastAndroid.show(`Active DNS set to ${formConfig.serverName}`, ToastAndroid.SHORT);
      }
      router.back();
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to save DNS settings.', ToastAndroid.SHORT);
      }
    } finally {
      setSaving(false);
    }
  };

  const isCustom = selectedProvider === 'custom';

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Overline>DNS UPSTREAM RESOLVER</Overline>
          <LocalizedText style={[styles.title, { color: t.textPrimary }]}>
            DNS Settings
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: t.textSecondary }]}>
            Choose your upstream DNS resolver. Traffic queries that are not blocked by filter lists will be forwarded securely through this provider.
          </LocalizedText>
        </View>

        {/* Active DNS Banner Card */}
        <Card style={[styles.activeCard, { borderColor: `${t.success}60`, backgroundColor: `${t.success}10` }]}>
          <View style={styles.activeRow}>
            <IconContainer tone="success" size={40}>
              <Server size={20} color={t.success} />
            </IconContainer>
            <View style={styles.activeCopy}>
              <Overline>CURRENT ACTIVE RESOLVER</Overline>
              <Text style={[styles.activeTitle, { color: t.textPrimary }]}>
                {activeConfig.serverName}
              </Text>
              <Text style={[styles.activeProtocol, { color: t.success }]}>
                {activeConfig.protocol.toUpperCase()} • {activeConfig.provider.toUpperCase()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Section: Select Provider Preset */}
        <View style={styles.sectionHeader}>
          <LocalizedText style={[styles.sectionTitle, { color: t.textPrimary }]}>
            DNS Providers
          </LocalizedText>
        </View>

        <View style={styles.presetsList}>
          {DNS_PRESETS.map(preset => {
            const isSelected = selectedProvider === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityLabel={`Select ${preset.name}`}
                onPress={() => handleSelectPreset(preset.id)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Card
                  style={[
                    styles.presetCard,
                    {
                      borderColor: isSelected ? t.primaryLight : `${t.accentCyan}25`,
                      backgroundColor: isSelected ? `${t.primaryGlow}` : t.canvas,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}>
                  <View style={styles.presetTopRow}>
                    <View style={styles.presetCopy}>
                      <View style={styles.presetNameRow}>
                        <Text style={[styles.presetName, { color: t.textPrimary }]}>
                          {preset.name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedCheck, { backgroundColor: t.primary }]}>
                            <Check size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.presetTagline, { color: t.accentCyan }]}>
                        {preset.tagline}
                      </Text>
                      <LocalizedText style={[styles.presetDesc, { color: t.textSecondary }]}>
                        {preset.description}
                      </LocalizedText>
                    </View>
                  </View>

                  <View style={styles.tagsRow}>
                    {preset.features.map(feat => (
                      <View
                        key={feat}
                        style={[
                          styles.featureTag,
                          { backgroundColor: t.canvasElevated, borderColor: t.cardBorder },
                        ]}>
                        <Text style={[styles.featureTagText, { color: t.textMuted }]}>
                          {feat}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Section: Select Protocol */}
        <View style={styles.sectionHeader}>
          <LocalizedText style={[styles.sectionTitle, { color: t.textPrimary }]}>
            Supported Protocol
          </LocalizedText>
        </View>

        <View style={styles.protocolRow}>
          {(['doh', 'dot', 'plain'] as DnsProtocol[]).map(proto => {
            const isSelected = selectedProtocol === proto;
            const label =
              proto === 'doh'
                ? 'DNS-over-HTTPS (DoH)'
                : proto === 'dot'
                  ? 'DNS-over-TLS (DoT)'
                  : 'Standard (IPv4/IPv6)';
            return (
              <Pressable
                key={proto}
                accessibilityRole="button"
                accessibilityLabel={`Select protocol ${label}`}
                onPress={() => handleSelectProtocol(proto)}
                style={[
                  styles.protocolPill,
                  {
                    backgroundColor: isSelected ? t.primary : t.canvasElevated,
                    borderColor: isSelected ? t.primary : t.cardBorder,
                  },
                ]}>
                <LocalizedText
                  style={[
                    styles.protocolPillText,
                    {
                      color: isSelected ? '#FFFFFF' : t.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}>
                  {label}
                </LocalizedText>
              </Pressable>
            );
          })}
        </View>

        {/* Custom DNS Fields (or detailed info of current preset) */}
        <Card style={[styles.configCard, { borderColor: `${t.accentCyan}30` }]}>
          <View style={styles.configHeader}>
            <Overline>CONFIGURATION DETAILS</Overline>
          </View>

          {/* Server Name Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Server Name / Label</Text>
            <TextInput
              placeholder="e.g. My NextDNS Profile"
              placeholderTextColor={t.textMuted}
              value={formConfig.serverName}
              editable={isCustom}
              onChangeText={val => setFormConfig(prev => ({ ...prev, serverName: val }))}
              style={[
                styles.textInput,
                {
                  backgroundColor: isCustom ? t.canvasElevated : `${t.canvasElevated}80`,
                  borderColor: validationErrors.serverName ? t.danger : t.cardBorder,
                  color: t.textPrimary,
                },
              ]}
            />
            {validationErrors.serverName && (
              <Text style={[styles.errorText, { color: t.danger }]}>{validationErrors.serverName}</Text>
            )}
          </View>

          {/* DoH Endpoint URL */}
          {selectedProtocol === 'doh' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>DNS-over-HTTPS Endpoint URL</Text>
              <TextInput
                placeholder="https://dns.example.com/dns-query"
                placeholderTextColor={t.textMuted}
                value={formConfig.dohUrl || ''}
                editable={isCustom}
                autoCapitalize="none"
                keyboardType="url"
                onChangeText={val => setFormConfig(prev => ({ ...prev, dohUrl: val }))}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isCustom ? t.canvasElevated : `${t.canvasElevated}80`,
                    borderColor: validationErrors.dohUrl ? t.danger : t.cardBorder,
                    color: t.textPrimary,
                  },
                ]}
              />
              {validationErrors.dohUrl && (
                <Text style={[styles.errorText, { color: t.danger }]}>{validationErrors.dohUrl}</Text>
              )}
            </View>
          )}

          {/* Server Hostname or IP */}
          {selectedProtocol !== 'doh' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>
                {selectedProtocol === 'dot' ? 'TLS Server Hostname / IP' : 'Primary DNS Server (IPv4 / IPv6)'}
              </Text>
              <TextInput
                placeholder={selectedProtocol === 'dot' ? 'dns.example.com' : '94.140.14.14'}
                placeholderTextColor={t.textMuted}
                value={formConfig.serverIp || ''}
                editable={isCustom}
                autoCapitalize="none"
                onChangeText={val => setFormConfig(prev => ({ ...prev, serverIp: val }))}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isCustom ? t.canvasElevated : `${t.canvasElevated}80`,
                    borderColor: validationErrors.serverIp ? t.danger : t.cardBorder,
                    color: t.textPrimary,
                  },
                ]}
              />
              {validationErrors.serverIp && (
                <Text style={[styles.errorText, { color: t.danger }]}>{validationErrors.serverIp}</Text>
              )}
            </View>
          )}

          {/* Optional Secondary Server IP for Standard DNS */}
          {selectedProtocol === 'plain' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>
                Optional Secondary DNS Server (IPv4 / IPv6)
              </Text>
              <TextInput
                placeholder="94.140.15.15 (Optional)"
                placeholderTextColor={t.textMuted}
                value={formConfig.secondaryServerIp || ''}
                editable={isCustom}
                autoCapitalize="none"
                onChangeText={val => setFormConfig(prev => ({ ...prev, secondaryServerIp: val }))}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isCustom ? t.canvasElevated : `${t.canvasElevated}80`,
                    borderColor: validationErrors.secondaryServerIp ? t.danger : t.cardBorder,
                    color: t.textPrimary,
                  },
                ]}
              />
              {validationErrors.secondaryServerIp && (
                <Text style={[styles.errorText, { color: t.danger }]}>
                  {validationErrors.secondaryServerIp}
                </Text>
              )}
            </View>
          )}

          {/* Connection Test Section */}
          <View style={styles.testSection}>
            <View style={styles.testActionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Test DNS connection reachability"
                disabled={testing}
                onPress={handleTestConnection}
                style={({ pressed }) => [
                  styles.testBtn,
                  {
                    backgroundColor: `${t.accentCyan}18`,
                    borderColor: `${t.accentCyan}70`,
                    opacity: pressed || testing ? 0.7 : 1,
                  },
                ]}>
                {testing ? (
                  <ActivityIndicator size="small" color={t.accentCyan} />
                ) : (
                  <Zap size={14} color={t.accentCyan} />
                )}
                <LocalizedText style={[styles.testBtnText, { color: t.accentCyan }]}>
                  {testing ? 'Testing Endpoint...' : 'Test Connection'}
                </LocalizedText>
              </Pressable>

              {testResult && (
                <View
                  style={[
                    styles.testResultPill,
                    {
                      backgroundColor: testResult.success ? `${t.success}18` : `${t.danger}18`,
                      borderColor: testResult.success ? `${t.success}60` : `${t.danger}60`,
                    },
                  ]}>
                  {testResult.success ? (
                    <CircleCheck size={13} color={t.success} />
                  ) : (
                    <CircleAlert size={13} color={t.danger} />
                  )}
                  <Text
                    style={[
                      styles.testResultText,
                      { color: testResult.success ? t.success : t.danger },
                    ]}>
                    {testResult.statusMessage}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Save Configuration Button */}
        <View style={styles.actionsFooter}>
          <Button
            label={saving ? 'Saving...' : 'Apply & Save DNS Resolver'}
            variant="primary"
            disabled={saving}
            onPress={handleSave}
          />
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
  activeCard: {
    borderWidth: 1.2,
    padding: space.sm,
    marginBottom: space.md,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  activeCopy: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 14,
    fontFamily: fonts.heading,
    marginTop: 2,
  },
  activeProtocol: {
    fontSize: 11,
    fontFamily: fonts.monoBold,
    marginTop: 1,
  },
  sectionHeader: {
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
  presetsList: {
    gap: space.sm,
    marginBottom: space.md,
  },
  presetCard: {
    padding: space.sm,
  },
  presetTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  presetCopy: {
    flex: 1,
  },
  presetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetName: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTagline: {
    fontSize: 11,
    fontFamily: fonts.monoBold,
    marginTop: 1,
  },
  presetDesc: {
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 16,
    marginTop: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: space.sm,
  },
  featureTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  featureTagText: {
    fontSize: 9,
    fontFamily: fonts.mono,
  },
  protocolRow: {
    flexDirection: 'column',
    gap: space.xs,
    marginBottom: space.md,
  },
  protocolPill: {
    paddingVertical: 9,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protocolPillText: {
    fontSize: 12,
    fontFamily: fonts.headingMedium,
  },
  configCard: {
    borderWidth: 1,
    padding: space.sm,
    marginBottom: space.lg,
  },
  configHeader: {
    marginBottom: space.xs,
  },
  fieldGroup: {
    marginTop: space.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.headingMedium,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: fonts.mono,
  },
  errorText: {
    fontSize: 10,
    fontFamily: fonts.body,
    marginTop: 3,
  },
  testSection: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  testActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  testBtnText: {
    fontSize: 12,
    fontFamily: fonts.headingMedium,
  },
  testResultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  testResultText: {
    fontSize: 11,
    fontFamily: fonts.monoBold,
  },
  actionsFooter: {
    marginBottom: space.xl,
  },
});
