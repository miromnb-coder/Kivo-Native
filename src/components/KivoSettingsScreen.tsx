import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notifyKivoSignedOut } from '../lib/kivo-auth-events';
import { supabase } from '../lib/supabase';

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

function SettingsCard({ title, rows }: { title: string; rows: SettingsRow[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          style={({ pressed }) => [styles.row, index < rows.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.iconSlot}>
            <Feather name={row.icon} size={18} color="#111216" strokeWidth={1.75} />
          </View>
          <Text numberOfLines={1} style={styles.rowLabel}>{row.label}</Text>
          {row.value ? <Text numberOfLines={1} style={styles.rowValue}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={18} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoSettingsScreen({ onBack }: Props) {
  const [identity, setIdentity] = useState<SettingsIdentity>(DEFAULT_IDENTITY);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={25} color="#111216" strokeWidth={1.85} />
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
        <SettingsCard title="PRIVACY & DATA" rows={privacyRows} />
        <SettingsCard title="APP & USAGE" rows={usageRows} />

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={handleSignOut} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.privacyLine}>
          <Feather name="shield" size={12} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.privacyText}>
            Private by design. You control your data.
          </Text>
        </View>
      </View>
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
    paddingBottom: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.72,
    lineHeight: 25,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 1,
    color: '#737680',
    fontSize: 12.2,
    fontWeight: '400',
    letterSpacing: -0.25,
    lineHeight: 14,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  accountCard: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.026,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '500',
  },
  identityBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#111216',
    fontSize: 15.4,
    fontWeight: '700',
    letterSpacing: -0.42,
    lineHeight: 18,
  },
  email: {
    marginTop: 1,
    color: '#777982',
    fontSize: 12.2,
    fontWeight: '400',
    letterSpacing: -0.24,
    lineHeight: 14,
  },
  planPill: {
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf3e8',
  },
  planText: {
    color: '#a56813',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 16,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionTitle: {
    marginLeft: 12,
    marginTop: 5,
    marginBottom: 0,
    color: '#737680',
    fontSize: 10.4,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  row: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  iconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#111216',
    fontSize: 13.4,
    fontWeight: '500',
    letterSpacing: -0.28,
  },
  rowValue: {
    color: '#777982',
    fontSize: 12.3,
    fontWeight: '500',
    letterSpacing: -0.22,
    maxWidth: 72,
    textAlign: 'right',
  },
  actions: {
    gap: 6,
    marginTop: 7,
  },
  primaryButton: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  secondaryButton: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13.6,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 13.6,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  privacyLine: {
    minHeight: 15,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  privacyText: {
    color: '#747780',
    fontSize: 10.4,
    fontWeight: '400',
    letterSpacing: -0.18,
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
