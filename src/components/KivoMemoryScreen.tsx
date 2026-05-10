import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { onBack: () => void };

type MemoryRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  detail?: string;
};

const remembersRows: MemoryRow[] = [
  { icon: 'sliders', label: 'Preferences' },
  { icon: 'target', label: 'Goals' },
  { icon: 'file-text', label: 'Important context' },
];

const controlRows: MemoryRow[] = [
  { icon: 'power', label: 'Memory enabled', value: 'On' },
  { icon: 'message-circle', label: 'Save chat insights', value: 'On' },
  { icon: 'trash-2', label: 'Clear memory' },
];

const recentRows: MemoryRow[] = [
  { icon: 'globe', label: 'Prefers English UI', detail: 'Preference  •  2h ago' },
  { icon: 'briefcase', label: 'Building Kivo Operator', detail: 'Project  •  1d ago' },
  { icon: 'star', label: 'Wants daily credits system', detail: 'Goal  •  2d ago' },
];

function MemorySection({ title, rows, compact = false }: { title: string; rows: MemoryRow[]; compact?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={() => Alert.alert(row.label, 'This memory setting will become editable when memory storage is connected.')}
          style={({ pressed }) => [styles.row, compact && styles.rowCompact, index < rows.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.iconSlot}>
            <Feather name={row.icon} size={compact ? 19 : 20} color="#111216" strokeWidth={1.72} />
          </View>
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={[styles.rowLabel, compact && styles.recentLabel]}>{row.label}</Text>
            {row.detail ? <Text numberOfLines={1} style={styles.rowDetail}>{row.detail}</Text> : null}
          </View>
          {row.value ? <Text numberOfLines={1} style={styles.rowValue}>{row.value}</Text> : null}
          <Feather name="chevron-right" size={20} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoMemoryScreen({ onBack }: Props) {
  const [memoryOn, setMemoryOn] = useState(true);

  function handleSave() {
    Alert.alert('Memory saved', 'Your memory preferences have been saved.');
  }

  function handleToggleMemory() {
    setMemoryOn((current) => !current);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={28} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.title}>Memory</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} style={styles.subtitle}>
              Manage what Kivo remembers and how it helps you.
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.memoryIconBox}>
            <Feather name="cpu" size={40} color="#111216" strokeWidth={1.42} />
          </View>
          <View style={styles.statusCopy}>
            <Text numberOfLines={1} style={styles.statusTitle}>Memory is on</Text>
            <Text numberOfLines={2} style={styles.statusText}>Kivo uses memory to personalize answers, tasks, and suggestions.</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <MemorySection title="WHAT KIVO REMEMBERS" rows={remembersRows} />
        <MemorySection title="MEMORY CONTROLS" rows={controlRows} />
        <MemorySection title="RECENT MEMORY" rows={recentRows} compact />

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" onPress={handleSave} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Turn memory off" onPress={handleToggleMemory} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>{memoryOn ? 'Turn memory off' : 'Turn memory on'}</Text>
          </Pressable>
        </View>

        <View style={styles.privacyLine}>
          <Feather name="shield" size={13} color="#8d9098" strokeWidth={1.75} />
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
    zIndex: 190,
    backgroundColor: '#f5f5f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 4,
    transform: [{ translateY: -18 }],
  },
  header: {
    height: 70,
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
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 3,
    color: '#737680',
    fontSize: 13.8,
    fontWeight: '400',
    letterSpacing: -0.28,
    lineHeight: 16,
    textAlign: 'center',
  },
  statusCard: {
    minHeight: 84,
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
    paddingHorizontal: 17,
    gap: 13,
  },
  memoryIconBox: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: '#111216',
    fontSize: 18.8,
    fontWeight: '700',
    letterSpacing: -0.58,
    lineHeight: 23,
  },
  statusText: {
    marginTop: 3,
    color: '#737680',
    fontSize: 13.2,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  activePill: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ececef',
  },
  activeText: {
    color: '#6c7078',
    fontSize: 13.8,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 22,
    marginTop: 7,
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
    marginTop: 7,
    marginBottom: 0,
    color: '#737680',
    fontSize: 11.6,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  row: {
    minHeight: 41,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 19,
    gap: 14,
  },
  rowCompact: {
    minHeight: 35,
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
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    color: '#111216',
    fontSize: 15.3,
    fontWeight: '500',
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  recentLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 15,
  },
  rowDetail: {
    marginTop: 1,
    color: '#747780',
    fontSize: 10.8,
    fontWeight: '400',
    letterSpacing: -0.16,
    lineHeight: 12,
  },
  rowValue: {
    color: '#737680',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.24,
    maxWidth: 54,
    textAlign: 'right',
  },
  actions: {
    gap: 6,
    marginTop: 7,
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
    minHeight: 17,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyText: {
    color: '#747780',
    fontSize: 11,
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
