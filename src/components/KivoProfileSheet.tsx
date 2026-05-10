import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  drawerWidth: number;
  bottomInset: number;
  onClose: () => void;
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

export function KivoProfileSheet({ drawerWidth, bottomInset, onClose }: Props) {
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { width: Math.max(292, drawerWidth - 48), bottom: Math.max(16, bottomInset + 12) }]}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
          <View style={styles.identity}>
            <Text style={styles.name}>Miro</Text>
            <Text style={styles.plan}>Free plan</Text>
          </View>
          <View style={styles.upgrade}><Text style={styles.upgradeText}>Upgrade to Plus</Text></View>
        </View>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index === 3 || index === 6 ? <View style={styles.divider} /> : null}
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Feather name={row.icon} size={20} color="#15161a" strokeWidth={1.75} />
              <Text style={styles.rowText}>{row.label}</Text>
              <Feather name="chevron-right" size={19} color="#8f9097" strokeWidth={1.85} />
            </Pressable>
          </View>
        ))}
      </View>
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
