import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { notifyKivoSignedOut } from '../lib/kivo-auth-events';
import { supabase } from '../lib/supabase';
import { KivoUpgradeScreen } from './KivoUpgradeScreen';

type Props = {
  drawerWidth: number;
  bottomInset: number;
  onClose: () => void;
  onOpenProfile?: () => void;
  onOpenUpgrade?: () => void;
};

type KivoProfileIdentity = {
  name: string;
  initial: string;
};

const rows: Array<{ icon: keyof typeof Feather.glyphMap; label: string }> = [
  { icon: 'user', label: 'Profile' },
  { icon: 'cpu', label: 'Memory' },
  { icon: 'grid', label: 'Connected apps' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'sliders', label: 'Appearance' },
  { icon: 'shield', label: 'Privacy' },
  { icon: 'log-out', label: 'Sign out' },
];

function cleanDisplayName(value?: unknown) {
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

function getIdentityFromUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']): KivoProfileIdentity {
  const metadata = user?.user_metadata ?? {};
  const name =
    cleanDisplayName(metadata.full_name) ??
    cleanDisplayName(metadata.name) ??
    cleanDisplayName(metadata.display_name) ??
    cleanDisplayName(metadata.user_name) ??
    getNameFromEmail(user?.email) ??
    'Kivo User';

  return {
    name,
    initial: getInitial(name),
  };
}

export function KivoProfileSheet({ drawerWidth, bottomInset, onClose, onOpenProfile, onOpenUpgrade }: Props) {
  const [identity, setIdentity] = useState<KivoProfileIdentity>({ name: 'Kivo User', initial: 'K' });
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadIdentity() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.warn('Failed to load Kivo profile identity', error);
          return;
        }

        if (mounted) {
          setIdentity(getIdentityFromUser(data.user));
        }
      } catch (error) {
        console.warn('Failed to load Kivo profile identity', error);
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
      console.warn('Failed to sign out from Supabase', error);
    } finally {
      onClose();
      notifyKivoSignedOut();
    }
  }

  function handleSignOutPress() {
    Alert.alert('Sign out', 'Do you want to sign out of Kivo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: completeSignOut },
    ]);
  }

  function handleUpgradePress() {
    if (onOpenUpgrade) {
      onOpenUpgrade();
      return;
    }

    setUpgradeOpen(true);
  }

  function handleRowPress(label: string) {
    if (label === 'Sign out') {
      handleSignOutPress();
      return;
    }

    if (label === 'Profile') {
      onOpenProfile?.();
    }
  }

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { width: Math.max(292, drawerWidth - 48), bottom: Math.max(16, bottomInset + 12) }]}>
        <View style={styles.handle} />
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onOpenProfile} style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{identity.initial}</Text></View>
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>{identity.name}</Text>
            <Text style={styles.plan}>Free plan</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Upgrade to Plus" onPress={handleUpgradePress} style={({ pressed }) => [styles.upgrade, pressed && styles.pressed]}>
            <Text style={styles.upgradeText}>Upgrade to Plus</Text>
          </Pressable>
        </Pressable>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index === 3 || index === 6 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={() => handleRowPress(row.label)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Feather name={row.icon} size={20} color="#15161a" strokeWidth={1.75} />
              <Text style={styles.rowText}>{row.label}</Text>
              <Feather name="chevron-right" size={19} color="#8f9097" strokeWidth={1.85} />
            </Pressable>
          </View>
        ))}
      </View>

      {upgradeOpen ? <KivoUpgradeScreen onBack={() => setUpgradeOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 104 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)' },
  sheet: { position: 'absolute', left: 18, borderRadius: 30, backgroundColor: '#ffffff', paddingTop: 13, paddingHorizontal: 18, paddingBottom: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)', shadowColor: '#0f172a', shadowOpacity: 0.11, shadowRadius: 34, shadowOffset: { width: 0, height: 16 } },
  handle: { alignSelf: 'center', width: 48, height: 4, borderRadius: 999, backgroundColor: '#d8d9de', marginBottom: 16 },
  headerRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9771b' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '500' },
  identity: { flex: 1 },
  name: { color: '#111113', fontSize: 20, fontWeight: '600', letterSpacing: -0.8 },
  plan: { marginTop: 2, color: '#8a8b92', fontSize: 13.5, fontWeight: '500' },
  upgrade: { minHeight: 32, borderRadius: 999, backgroundColor: 'rgba(201,119,27,0.11)', justifyContent: 'center', paddingHorizontal: 12 },
  upgradeText: { color: '#bd731a', fontSize: 12.6, fontWeight: '700' },
  row: { height: 45, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 3 },
  rowText: { flex: 1, color: '#17181b', fontSize: 16.2, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.075)', marginVertical: 9 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
});
