import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notifyKivoSignedOut } from '../lib/kivo-auth-events';
import { supabase } from '../lib/supabase';
import { KivoConnectedAppsScreen } from './KivoConnectedAppsScreen';
import { KivoCreditsPlanScreen } from './KivoCreditsPlanScreen';
import { KivoMemoryScreen } from './KivoMemoryScreen';
import { KivoPrivacyScreen } from './KivoPrivacyScreen';

type Props = {
  onBack: () => void;
};

type SettingsIdentity = {
  name: string;
  email: string;
  initial: string;
};

type SettingsRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
};

const generalRows: SettingsRow[] = [
  { icon: 'globe', label: 'Language', value: 'English' },
  { icon: 'bell', label: 'Notifications', value: 'On' },
  { icon: 'moon', label: 'Appearance', value: 'System' },
  { icon: 'home', label: 'Start screen', value: 'Today' },
];

const privacyRows: SettingsRow[] = [
  { icon: 'lock', label: 'Privacy' },
  { icon: 'shield', label: 'Security' },
  { icon: 'cpu', label: 'Memory' },
  { icon: 'link', label: 'Connected apps' },
];

const usageRows: SettingsRow[] = [
  { icon: 'database', label: 'Credits & plan' },
  { icon: 'bar-chart-2', label: 'Usage' },
  { icon: 'help-circle', label: 'Help' },
  { icon: 'info', label: 'About Kivo' },
];

const DEFAULT_IDENTITY: SettingsIdentity = {
  name: 'Kivo User',
  email: 'No email added',
  initial: 'K',
};

function cleanText(value?: unknown) {
  if (typeof value !== 'string') return null;

  const cleanValue = value.trim();
  return cleanValue.length > 0 ? cleanValue : null;
}

function getNameFromEmail(email?: string | null) {
  if (!email) return null;

  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return null;

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitial(name: string) {
  const firstCharacter = name.trim().match(/[A-Za-zÅÄÖåäö0-9]/)?.[0];
  return firstCharacter ? firstCharacter.toUpperCase() : 'K';
}

function getIdentityFromUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']): SettingsIdentity {
  if (!user) return DEFAULT_IDENTITY;

  const metadata = user.user_metadata ?? {};
  const email = user.email ?? DEFAULT_IDENTITY.email;
  const name =
    cleanText(metadata.full_name) ??
    cleanText(metadata.name) ??
    cleanText(metadata.display_name) ??
    cleanText(metadata.user_name) ??
    getNameFromEmail(email) ??
    DEFAULT_IDENTITY.name;

  return {
    name,
    email,
    initial: getInitial(name),
  };
}

function SettingsCard({ title, rows, onRowPress }: { title: string; rows: SettingsRow[]; onRowPress?: (label: string) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={() => onRowPress?.(row.label)}
          style={({ pressed }) => [styles.row, index < rows.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.iconSlot}>
            <Feather name={row.icon} size={21} color="#111216" strokeWidth={1.75} />
          </View>
          <Text numberOfLines={1} style={styles.rowLabel}>{row.label}</Text>
          {row.value ? <Text numberOfLines={1} style={styles.rowValue}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={21} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoSettingsScreen({ onBack }: Props) {
  const [identity, setIdentity] = useState<SettingsIdentity>(DEFAULT_IDENTITY);
  const [creditsPlanOpen, setCreditsPlanOpen] = useState(false);
  const [connectedAppsOpen, setConnectedAppsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadIdentity() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.warn('Failed to load Kivo settings identity', error);
          return;
        }

        if (mounted) {
          setIdentity(getIdentityFromUser(data.user));
        }
      } catch (error) {
        console.warn('Failed to load Kivo settings identity', error);
      }
    }

    loadIdentity();

    return () => {
      mounted = false;
    };
  }, []);

  async function completeSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Failed to sign out from settings', error);
    } finally {
      onBack();
      notifyKivoSignedOut();
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Do you want to sign out of Kivo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: completeSignOut },
    ]);
  }

  function handleSettingsRowPress(label: string) {
    if (label === 'Credits & plan') {
      setCreditsPlanOpen(true);
      return;
    }

    if (label === 'Connected apps') {
      setConnectedAppsOpen(true);
      return;
    }

    if (label === 'Memory') {
      setMemoryOpen(true);
      return;
    }

    if (label === 'Privacy') {
      setPrivacyOpen(true);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={28} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={styles.title}>Settings</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.subtitle}>
              Manage your app, privacy, and preferences.
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{identity.initial}</Text>
          </View>
          <View style={styles.identityBlock}>
            <Text numberOfLines={1} style={styles.name}>{identity.name}</Text>
            <Text numberOfLines={1} style={styles.email}>{identity.email}</Text>
          </View>
          <View style={styles.planPill}>
            <Text style={styles.planText}>Free plan</Text>
          </View>
        </View>

        <SettingsCard title="GENERAL" rows={generalRows} />
        <SettingsCard title="PRIVACY & DATA" rows={privacyRows} onRowPress={handleSettingsRowPress} />
        <SettingsCard title="APP & USAGE" rows={usageRows} onRowPress={handleSettingsRowPress} />

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={handleSignOut} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.privacyLine}>
          <Feather name="shield" size={14} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.privacyText}>
            Private by design. You control your data.
          </Text>
        </View>
      </View>
      {creditsPlanOpen ? <KivoCreditsPlanScreen onBack={() => setCreditsPlanOpen(false)} /> : null}
      {connectedAppsOpen ? <KivoConnectedAppsScreen onBack={() => setConnectedAppsOpen(false)} /> : null}
      {memoryOpen ? <KivoMemoryScreen onBack={() => setMemoryOpen(false)} /> : null}
      {privacyOpen ? <KivoPrivacyScreen onBack={() => setPrivacyOpen(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 186,
    backgroundColor: '#f5f5f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 12,
    transform: [{ translateY: -8 }],
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#111216',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.78,
    lineHeight: 29,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 3,
    color: '#737680',
    fontSize: 14.2,
    fontWeight: '400',
    letterSpacing: -0.3,
    lineHeight: 17,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  accountCard: {
    minHeight: 66,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.026,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '500',
  },
  identityBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#111216',
    fontSize: 17.2,
    fontWeight: '700',
    letterSpacing: -0.48,
    lineHeight: 21,
  },
  email: {
    marginTop: 2,
    color: '#777982',
    fontSize: 14.2,
    fontWeight: '400',
    letterSpacing: -0.26,
    lineHeight: 17,
  },
  planPill: {
    minHeight: 31,
    borderRadius: 15.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ececef',
  },
  planText: {
    color: '#6c7078',
    fontSize: 13.8,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 19,
    marginTop: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.022,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  sectionTitle: {
    marginLeft: 14,
    marginTop: 7,
    marginBottom: 0,
    color: '#737680',
    fontSize: 11.7,
    fontWeight: '700',
    letterSpacing: 0.48,
  },
  row: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  iconSlot: {
    width: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#111216',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.32,
  },
  rowValue: {
    color: '#777982',
    fontSize: 13.8,
    fontWeight: '500',
    letterSpacing: -0.24,
    maxWidth: 82,
    textAlign: 'right',
  },
  actions: {
    gap: 8,
    marginTop: 9,
  },
  primaryButton: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
  },
  secondaryButton: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15.4,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 15.4,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  privacyLine: {
    minHeight: 20,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyText: {
    color: '#747780',
    fontSize: 11.8,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
  primaryPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.992 }],
  },
});
