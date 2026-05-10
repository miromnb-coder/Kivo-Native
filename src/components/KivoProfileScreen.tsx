import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type Props = {
  onBack: () => void;
};

type ProfileRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
};

type KivoProfileData = {
  name: string;
  email: string;
  username: string;
  initial: string;
  signInMethod: string;
  connectedAccounts: string;
  plan: string;
};

const DEFAULT_PROFILE: KivoProfileData = {
  name: 'Kivo User',
  email: 'No email added',
  username: 'Not set',
  initial: 'K',
  signInMethod: 'Email',
  connectedAccounts: 'None',
  plan: 'Free plan',
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

function getUsernameFromEmail(email?: string | null) {
  if (!email) return 'Not set';

  const localPart = email.split('@')[0]?.trim();
  return localPart || 'Not set';
}

function getInitial(name: string) {
  const firstCharacter = name.trim().match(/[A-Za-zÅÄÖåäö0-9]/)?.[0];
  return firstCharacter ? firstCharacter.toUpperCase() : 'K';
}

function formatProvider(provider?: string | null) {
  if (!provider) return null;

  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  if (provider === 'email') return 'Email';

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function getProfileDataFromUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']): KivoProfileData {
  if (!user) return DEFAULT_PROFILE;

  const metadata = user.user_metadata ?? {};
  const email = user.email ?? DEFAULT_PROFILE.email;
  const name =
    cleanText(metadata.full_name) ??
    cleanText(metadata.name) ??
    cleanText(metadata.display_name) ??
    cleanText(metadata.user_name) ??
    getNameFromEmail(email) ??
    DEFAULT_PROFILE.name;
  const username =
    cleanText(metadata.preferred_username) ??
    cleanText(metadata.user_name) ??
    cleanText(metadata.username) ??
    getUsernameFromEmail(email);

  const providers = new Set<string>();
  const primaryProvider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null;
  const identities = Array.isArray(user.identities) ? user.identities : [];

  if (primaryProvider) providers.add(primaryProvider);
  identities.forEach((identity) => {
    if (typeof identity.provider === 'string') providers.add(identity.provider);
  });

  const formattedProviders = Array.from(providers)
    .map(formatProvider)
    .filter(Boolean) as string[];

  return {
    name,
    email,
    username,
    initial: getInitial(name),
    signInMethod: formattedProviders[0] ?? DEFAULT_PROFILE.signInMethod,
    connectedAccounts: formattedProviders.length > 0 ? formattedProviders.join(', ') : DEFAULT_PROFILE.connectedAccounts,
    plan: DEFAULT_PROFILE.plan,
  };
}

function ProfileCard({ rows }: { rows: ProfileRow[] }) {
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          style={({ pressed }) => [styles.row, index < rows.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.rowIconSlot}>
            <Feather name={row.icon} size={24} color="#111216" strokeWidth={1.75} />
          </View>
          <Text numberOfLines={1} style={styles.rowLabel}>{row.label}</Text>
          {row.value ? <Text numberOfLines={1} style={styles.rowValue}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={23} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoProfileScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<KivoProfileData>(DEFAULT_PROFILE);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.warn('Failed to load Kivo profile screen data', error);
          return;
        }

        if (mounted) {
          setProfile(getProfileDataFromUser(data.user));
        }
      } catch (error) {
        console.warn('Failed to load Kivo profile screen data', error);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const mainRows: ProfileRow[] = [
    { icon: 'user', label: 'Full name', value: profile.name },
    { icon: 'mail', label: 'Email', value: profile.email },
    { icon: 'at-sign', label: 'Username', value: profile.username },
    { icon: 'lock', label: 'Password / Sign-in method', value: profile.signInMethod },
    { icon: 'link', label: 'Connected accounts', value: profile.connectedAccounts },
  ];

  const secondaryRows: ProfileRow[] = [
    { icon: 'bell', label: 'Notifications' },
    { icon: 'shield', label: 'Privacy' },
    { icon: 'credit-card', label: 'Billing / Plan' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(34, insets.bottom + 24) }]}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={30} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.identityBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initial}</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.name}>{profile.name}</Text>
          <Text numberOfLines={1} style={styles.email}>{profile.email}</Text>
          <View style={styles.planPill}>
            <Text style={styles.planText}>{profile.plan}</Text>
          </View>
        </View>

        <ProfileCard rows={mainRows} />
        <ProfileCard rows={secondaryRows} />

        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Edit profile</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage account" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Manage account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 180,
    backgroundColor: '#f5f5f6',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  header: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  title: {
    color: '#111216',
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  headerSpacer: {
    width: 58,
    height: 58,
  },
  identityBlock: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '500',
    letterSpacing: -1.8,
  },
  name: {
    marginTop: 24,
    maxWidth: '88%',
    color: '#111216',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1.12,
    lineHeight: 36,
    textAlign: 'center',
  },
  email: {
    marginTop: 8,
    maxWidth: '88%',
    color: '#878991',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.45,
    lineHeight: 25,
    textAlign: 'center',
  },
  planPill: {
    minHeight: 40,
    marginTop: 20,
    paddingHorizontal: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf3e8',
  },
  planText: {
    color: '#a56813',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 26,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.032,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  row: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 20,
    gap: 15,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.072)',
  },
  rowIconSlot: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#111216',
    fontSize: 18.5,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  rowValue: {
    maxWidth: 178,
    color: '#858790',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.35,
    textAlign: 'right',
  },
  buttons: {
    gap: 12,
    marginTop: 22,
  },
  primaryButton: {
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  secondaryButton: {
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235,235,238,0.86)',
  },
  secondaryButtonText: {
    color: '#474a52',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.25,
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
