import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

function SettingsCard({ title, rows, compact }: { title: string; rows: SettingsRow[]; compact: boolean }) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          style={({ pressed }) => [
            styles.row,
            compact && styles.rowCompact,
            index < rows.length - 1 && styles.rowBorder,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconSlot}>
            <Feather name={row.icon} size={compact ? 21 : 23} color="#111216" strokeWidth={1.75} />
          </View>
          <Text numberOfLines={1} style={[styles.rowLabel, compact && styles.rowLabelCompact]}>{row.label}</Text>
          {row.value ? <Text numberOfLines={1} style={[styles.rowValue, compact && styles.rowValueCompact]}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={compact ? 21 : 23} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoSettingsScreen({ onBack }: Props) {
  const { height } = useWindowDimensions();
  const compact = height < 880;
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
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, compact && styles.backButtonCompact, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={compact ? 28 : 30} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>Settings</Text>
            <Text numberOfLines={1} style={[styles.subtitle, compact && styles.subtitleCompact]}>Manage your app, privacy, and preferences.</Text>
          </View>
          <View style={[styles.headerSpacer, compact && styles.headerSpacerCompact]} />
        </View>

        <View style={[styles.accountCard, compact && styles.accountCardCompact]}>
          <View style={[styles.avatar, compact && styles.avatarCompact]}>
            <Text style={[styles.avatarText, compact && styles.avatarTextCompact]}>{identity.initial}</Text>
          </View>
          <View style={styles.identityBlock}>
            <Text numberOfLines={1} style={[styles.name, compact && styles.nameCompact]}>{identity.name}</Text>
            <Text numberOfLines={1} style={[styles.email, compact && styles.emailCompact]}>{identity.email}</Text>
          </View>
          <View style={[styles.planPill, compact && styles.planPillCompact]}>
            <Text style={[styles.planText, compact && styles.planTextCompact]}>Free plan</Text>
          </View>
        </View>

        <SettingsCard title="GENERAL" rows={generalRows} compact={compact} />
        <SettingsCard title="PRIVACY & DATA" rows={privacyRows} compact={compact} />
        <SettingsCard title="APP & USAGE" rows={usageRows} compact={compact} />

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={({ pressed }) => [styles.primaryButton, compact && styles.actionButtonCompact, pressed && styles.primaryPressed]}>
            <Text style={[styles.primaryButtonText, compact && styles.buttonTextCompact]}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={handleSignOut} style={({ pressed }) => [styles.secondaryButton, compact && styles.actionButtonCompact, pressed && styles.pressed]}>
            <Text style={[styles.secondaryButtonText, compact && styles.buttonTextCompact]}>Sign out</Text>
          </Pressable>
        </View>

        <View style={[styles.privacyLine, compact && styles.privacyLineCompact]}>
          <Feather name="shield" size={compact ? 15 : 17} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.privacyText, compact && styles.privacyTextCompact]}>Private by design. You control your data.</Text>
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
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 10,
  },
  contentCompact: {
    paddingHorizontal: 22,
    paddingTop: 0,
    paddingBottom: 6,
  },
  header: {
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCompact: {
    height: 70,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  backButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    color: '#111216',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.82,
    lineHeight: 32,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 29,
  },
  subtitle: {
    marginTop: 7,
    color: '#737680',
    fontSize: 16.5,
    fontWeight: '400',
    letterSpacing: -0.34,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitleCompact: {
    marginTop: 4,
    fontSize: 14.4,
    lineHeight: 18,
  },
  headerSpacer: {
    width: 56,
    height: 56,
  },
  headerSpacerCompact: {
    width: 48,
    height: 48,
  },
  accountCard: {
    minHeight: 92,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.026,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 20,
  },
  accountCardCompact: {
    minHeight: 76,
    borderRadius: 20,
    gap: 14,
    paddingHorizontal: 17,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '500',
  },
  avatarTextCompact: {
    fontSize: 23,
  },
  identityBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#111216',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.58,
    lineHeight: 25,
  },
  nameCompact: {
    fontSize: 17.4,
    lineHeight: 21,
  },
  email: {
    marginTop: 5,
    color: '#777982',
    fontSize: 16.2,
    fontWeight: '400',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  emailCompact: {
    marginTop: 3,
    fontSize: 14.2,
    lineHeight: 17,
  },
  planPill: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf3e8',
  },
  planPillCompact: {
    minHeight: 31,
    borderRadius: 15.5,
    paddingHorizontal: 14,
  },
  planText: {
    color: '#a56813',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  planTextCompact: {
    fontSize: 13.8,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 22,
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.024,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  cardCompact: {
    borderRadius: 20,
    marginTop: 11,
  },
  sectionTitle: {
    marginLeft: 17,
    marginTop: 13,
    marginBottom: 4,
    color: '#737680',
    fontSize: 13.4,
    fontWeight: '700',
    letterSpacing: 0.58,
  },
  sectionTitleCompact: {
    marginLeft: 15,
    marginTop: 9,
    marginBottom: 1,
    fontSize: 11.8,
    letterSpacing: 0.48,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 18,
    gap: 18,
  },
  rowCompact: {
    minHeight: 43,
    paddingLeft: 17,
    paddingRight: 16,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.064)',
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#111216',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
  rowLabelCompact: {
    fontSize: 15,
  },
  rowValue: {
    color: '#777982',
    fontSize: 15.6,
    fontWeight: '500',
    letterSpacing: -0.28,
    maxWidth: 92,
    textAlign: 'right',
  },
  rowValueCompact: {
    fontSize: 13.8,
    maxWidth: 82,
  },
  actions: {
    gap: 13,
    marginTop: 16,
  },
  actionsCompact: {
    gap: 9,
    marginTop: 11,
  },
  primaryButton: {
    height: 56,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  secondaryButton: {
    height: 56,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  actionButtonCompact: {
    height: 43,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  buttonTextCompact: {
    fontSize: 15.5,
  },
  privacyLine: {
    minHeight: 30,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  privacyLineCompact: {
    minHeight: 21,
    marginTop: 8,
    gap: 7,
  },
  privacyText: {
    color: '#747780',
    fontSize: 13.5,
    fontWeight: '400',
    letterSpacing: -0.22,
  },
  privacyTextCompact: {
    fontSize: 12,
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
