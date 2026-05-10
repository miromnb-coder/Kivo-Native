import { Feather } from '@expo/vector-icons';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notifyKivoSignedOut } from '../lib/kivo-auth-events';
import { supabase } from '../lib/supabase';

type AccountRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function AccountRow({ icon, label, onPress }: AccountRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
    >
      <View style={styles.rowIconWrap}>
        <Feather name={icon} size={26} color="#17181b" strokeWidth={1.75} />
      </View>
      <Text numberOfLines={1} style={styles.rowText}>{label}</Text>
      <Feather name="chevron-right" size={25} color="#9a9ba1" strokeWidth={2} />
    </Pressable>
  );
}

export function KivoAccountSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out of Kivo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.warn('Failed to sign out from Supabase', error);
          } finally {
            onClose();
            notifyKivoSignedOut();
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={10}
      pointerEvents="box-none"
      style={styles.layer}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Close account menu" onPress={onClose} style={styles.backdrop} />

      <View style={[styles.sheet, { paddingBottom: Math.max(22, insets.bottom + 18) }]}>
        <View style={styles.handle} />

        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" style={({ pressed }) => [styles.profileHeader, pressed && styles.pressedRow]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={styles.profileTextBlock}>
            <Text numberOfLines={1} style={styles.nameText}>Miro</Text>
            <Text numberOfLines={1} style={styles.planText}>Free plan</Text>
          </View>
          <View style={styles.upgradePill}>
            <Text numberOfLines={1} style={styles.upgradeText}>Upgrade to Plus</Text>
          </View>
        </Pressable>

        <View style={styles.group}>
          <AccountRow icon="user" label="Profile" />
          <AccountRow icon="cpu" label="Memory" />
          <AccountRow icon="grid" label="Connected apps" />
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
          <AccountRow icon="settings" label="Settings" />
          <AccountRow icon="sliders" label="Appearance" />
          <AccountRow icon="shield" label="Privacy" />
        </View>

        <View style={styles.divider} />

        <AccountRow icon="log-out" label="Sign out" onPress={handleSignOut} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 130,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 22 },
  },
  handle: {
    position: 'absolute',
    top: 13,
    alignSelf: 'center',
    width: 46,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d8d8dd',
  },
  profileHeader: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingTop: 18,
    paddingBottom: 15,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  profileTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    color: '#141519',
    fontSize: 20.5,
    fontWeight: '700',
    letterSpacing: -0.62,
    lineHeight: 25,
  },
  planText: {
    marginTop: 1,
    color: '#7b7d86',
    fontSize: 15.5,
    fontWeight: '500',
    letterSpacing: -0.35,
    lineHeight: 20,
  },
  upgradePill: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf3e8',
  },
  upgradeText: {
    color: '#a56813',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  group: {
    gap: 0,
  },
  row: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    color: '#17181b',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.64,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.065)',
  },
  pressedRow: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
});
