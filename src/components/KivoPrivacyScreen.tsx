import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { onBack: () => void };

type PrivacyRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
};

const dataRows: PrivacyRow[] = [
  { icon: 'file-text', label: 'Data permissions', value: 'Custom' },
  { icon: 'link', label: 'Connected apps access', value: 'Limited' },
  { icon: 'download', label: 'Export my data' },
  { icon: 'trash-2', label: 'Delete account data' },
];

const controlRows: PrivacyRow[] = [
  { icon: 'eye-off', label: 'Private mode', value: 'On' },
  { icon: 'message-circle', label: 'Save chat history', value: 'On' },
  { icon: 'user', label: 'Personalization', value: 'On' },
];

const securityRows: PrivacyRow[] = [
  { icon: 'shield', label: 'Sign-in security' },
  { icon: 'lock', label: 'Password / authentication' },
  { icon: 'lock', label: 'App lock' },
];

function PrivacySection({ title, rows, dense = false }: { title: string; rows: PrivacyRow[]; dense?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={() => Alert.alert(row.label, 'This privacy setting will become editable when data controls are connected.')}
          style={({ pressed }) => [styles.row, dense && styles.rowDense, index < rows.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.iconSlot}>
            <Feather name={row.icon} size={21} color="#111216" strokeWidth={1.72} />
          </View>
          <Text numberOfLines={1} style={styles.rowLabel}>{row.label}</Text>
          {row.value ? <Text numberOfLines={1} style={styles.rowValue}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={21} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoPrivacyScreen({ onBack }: Props) {
  function handleSave() {
    Alert.alert('Privacy saved', 'Your privacy preferences have been saved.');
  }

  function handleManageData() {
    Alert.alert('Manage data', 'Data management controls will appear here when storage is connected.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={28} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.title}>Privacy</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.subtitle}>
              Manage your data, permissions, and privacy controls.
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.shieldBox}>
            <Feather name="shield" size={48} color="#111216" strokeWidth={1.35} />
            <Feather name="check" size={18} color="#111216" strokeWidth={2.2} style={styles.checkIcon} />
          </View>
          <View style={styles.statusCopy}>
            <Text numberOfLines={1} style={styles.statusTitle}>Privacy is protected</Text>
            <Text numberOfLines={1} style={styles.statusText}>Your data stays under your control.</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <PrivacySection title="DATA & PERMISSIONS" rows={dataRows} dense />
        <PrivacySection title="PRIVACY CONTROLS" rows={controlRows} />
        <PrivacySection title="SECURITY" rows={securityRows} />

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" onPress={handleSave} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage data" onPress={handleManageData} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Manage data</Text>
          </Pressable>
        </View>

        <View style={styles.privacyLine}>
          <Feather name="shield" size={14} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.privacyText}>
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
    zIndex: 191,
    backgroundColor: '#f5f5f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 5,
    transform: [{ translateY: -12 }],
  },
  header: {
    height: 76,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  title: {
    color: '#111216',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 33,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: '#737680',
    fontSize: 14.2,
    fontWeight: '400',
    letterSpacing: -0.28,
    lineHeight: 17,
    textAlign: 'center',
  },
  statusCard: {
    minHeight: 88,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.022,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
  },
  shieldBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 18,
    left: 20,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: '#111216',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 25,
  },
  statusText: {
    marginTop: 4,
    color: '#737680',
    fontSize: 14.2,
    fontWeight: '400',
    letterSpacing: -0.22,
    lineHeight: 17,
  },
  activePill: {
    minHeight: 31,
    borderRadius: 15.5,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ececef',
  },
  activeText: {
    color: '#6c7078',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 22,
    marginTop: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 9 },
  },
  sectionTitle: {
    marginLeft: 18,
    marginTop: 9,
    marginBottom: 0,
    color: '#737680',
    fontSize: 11.8,
    fontWeight: '700',
    letterSpacing: 1.45,
  },
  row: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 19,
    gap: 14,
  },
  rowDense: {
    minHeight: 41,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.068)',
  },
  iconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#111216',
    fontSize: 15.2,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  rowValue: {
    color: '#737680',
    fontSize: 14.2,
    fontWeight: '500',
    letterSpacing: -0.24,
    maxWidth: 82,
    textAlign: 'right',
  },
  actions: {
    gap: 6,
    marginTop: 9,
  },
  primaryButton: {
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15.4,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  secondaryButton: {
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  privacyLine: {
    minHeight: 18,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyText: {
    color: '#747780',
    fontSize: 11.2,
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
