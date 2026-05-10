import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { onBack: () => void };
type Row = { icon: keyof typeof Feather.glyphMap; label: string; value?: string };

const costs: Row[] = [
  { icon: 'message-circle', label: 'Chat message', value: '1 credit' },
  { icon: 'zap', label: 'Quick tool action', value: '5 credits' },
  { icon: 'search', label: 'Deep research task', value: '10 credits' },
  { icon: 'image', label: 'Image generation', value: '15 credits' },
];

const upgrade: Row[] = [
  { icon: 'award', label: '500 daily credits' },
  { icon: 'grid', label: 'All connected tools' },
  { icon: 'cpu', label: 'Smarter memory' },
];

function CostCard() {
  return (
    <View style={s.card}>
      <Text style={s.section}>CREDIT COSTS</Text>
      <View style={s.inner}>
        {costs.map((r, i) => (
          <View key={r.label} style={[s.costRow, i < costs.length - 1 && s.line]}>
            <View style={s.iconSlot}><Feather name={r.icon} size={19} color="#111216" strokeWidth={1.75} /></View>
            <Text style={s.costLabel} numberOfLines={1}>{r.label}</Text>
            <Text style={s.costValue} numberOfLines={1}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WhyCard() {
  return (
    <View style={s.card}>
      <Text style={s.section}>WHY UPGRADE</Text>
      {upgrade.map((r, i) => (
        <View key={r.label} style={[s.whyRow, i < upgrade.length - 1 && s.line]}>
          <View style={s.whyIcon}>{r.label.startsWith('500') ? <Text style={s.whyNumber}>500</Text> : <Feather name={r.icon} size={17} color="#111216" strokeWidth={1.75} />}</View>
          <Text style={s.whyText} numberOfLines={1}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function KivoCreditsPlanScreen({ onBack }: Props) {
  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [s.backButton, pressed && s.pressed]}>
            <Feather name="chevron-left" size={28} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.title} numberOfLines={1}>Credits & plan</Text>
            <Text style={s.subtitle} numberOfLines={1}>Manage your daily credits and your Kivo plan.</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <View style={s.summaryCard}>
          <View style={s.summaryIcon}><Feather name="database" size={50} color="#111216" strokeWidth={1.7} /></View>
          <View style={s.summaryBody}>
            <View style={s.summaryTop}>
              <Text style={s.summaryTitle} numberOfLines={1}>50 daily credits</Text>
              <View style={s.planPill}><Text style={s.planText}>Free plan</Text></View>
            </View>
            <Text style={s.muted} numberOfLines={1}>Credits reset every day.</Text>
            <View style={s.progress}><View style={s.progressFill} /></View>
            <View style={s.usage}><Text style={s.leftToday}>18 left today</Text><Text style={s.total}>50 total</Text></View>
            <View style={s.reset}><Feather name="clock" size={16} color="#8d9098" strokeWidth={1.75} /><Text style={s.resetText}>Resets in 5h 12m</Text></View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.section}>PLANS</Text>
          <View style={s.planRow}>
            <View style={s.planIcon}><Feather name="user" size={20} color="#111216" strokeWidth={1.75} /></View>
            <View style={s.planCopy}><Text style={s.planName}>Free</Text><Text style={s.planSub}>50 daily credits</Text></View>
            <Text style={s.planDetail}>Basic access</Text><Feather name="chevron-right" size={21} color="#8f9097" />
          </View>
          <View style={s.planRow}>
            <View style={[s.planIcon, s.darkIcon]}><Feather name="star" size={20} color="#ffffff" strokeWidth={1.75} /></View>
            <View style={s.planCopy}><Text style={s.planName}>Plus</Text><Text style={s.planSub}>500 daily credits</Text></View>
            <Text style={s.planDetail}>More power every day</Text><Feather name="chevron-right" size={21} color="#8f9097" />
          </View>
        </View>

        <CostCard />
        <WhyCard />

        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Upgrade to Plus" style={({ pressed }) => [s.primaryButton, pressed && s.primaryPressed]}><Text style={s.primaryText}>Upgrade to Plus</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Restore purchase" style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}><Text style={s.secondaryText}>Restore purchase</Text></Pressable>
        </View>

        <View style={s.privacy}><Feather name="shield" size={13} color="#8d9098" /><Text style={s.privacyText} numberOfLines={1}>Private by design. You control your data.</Text></View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { ...StyleSheet.absoluteFillObject, zIndex: 188, backgroundColor: '#f5f5f6' },
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 8, transform: [{ translateY: -8 }] },
  header: { height: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 48, height: 48 },
  title: { color: '#111216', fontSize: 24, fontWeight: '700', letterSpacing: -0.78, lineHeight: 29 },
  subtitle: { marginTop: 4, color: '#737680', fontSize: 14, letterSpacing: -0.3, lineHeight: 17 },
  summaryCard: { minHeight: 132, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.035)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 17 },
  summaryIcon: { width: 66, alignItems: 'center' },
  summaryBody: { flex: 1, minWidth: 0 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryTitle: { flex: 1, color: '#111216', fontSize: 22.5, fontWeight: '700', letterSpacing: -0.72, lineHeight: 28 },
  planPill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ececef' },
  planText: { color: '#6c7078', fontSize: 13.6, fontWeight: '700' },
  muted: { marginTop: 2, color: '#737680', fontSize: 15, lineHeight: 19 },
  progress: { height: 10, borderRadius: 999, backgroundColor: '#e4e4e8', marginTop: 14, overflow: 'hidden' },
  progressFill: { width: '52%', height: '100%', borderRadius: 999, backgroundColor: '#050507' },
  usage: { marginTop: 9, flexDirection: 'row', justifyContent: 'space-between' },
  leftToday: { color: '#111216', fontSize: 14.5, fontWeight: '600' },
  total: { color: '#737680', fontSize: 14.5, fontWeight: '500' },
  reset: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetText: { color: '#737680', fontSize: 13.6, fontWeight: '500' },
  card: { overflow: 'hidden', borderRadius: 23, marginTop: 9, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.035)' },
  section: { marginLeft: 18, marginTop: 9, marginBottom: 5, color: '#737680', fontSize: 11.5, fontWeight: '700', letterSpacing: 1.25 },
  planRow: { minHeight: 48, marginHorizontal: 12, marginBottom: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 12 },
  planIcon: { width: 39, height: 39, borderRadius: 19.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f2' },
  darkIcon: { backgroundColor: '#1b1c20' },
  planCopy: { flex: 1, minWidth: 0 },
  planName: { color: '#111216', fontSize: 16.6, fontWeight: '700', lineHeight: 20 },
  planSub: { color: '#737680', fontSize: 12.6, fontWeight: '500', lineHeight: 15 },
  planDetail: { maxWidth: 150, color: '#737680', fontSize: 12.8, fontWeight: '500', textAlign: 'right' },
  inner: { marginHorizontal: 13, marginBottom: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', overflow: 'hidden' },
  costRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 15, gap: 13 },
  iconSlot: { width: 24, alignItems: 'center' },
  costLabel: { flex: 1, color: '#111216', fontSize: 14.4, fontWeight: '500' },
  costValue: { color: '#737680', fontSize: 14, fontWeight: '500' },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  whyRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, gap: 13 },
  whyIcon: { width: 31, height: 31, borderRadius: 15.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f2' },
  whyNumber: { color: '#111216', fontSize: 11.5, fontWeight: '700' },
  whyText: { flex: 1, color: '#111216', fontSize: 14.2, fontWeight: '500' },
  actions: { gap: 8, marginTop: 10 },
  primaryButton: { height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050507' },
  secondaryButton: { height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.64)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)' },
  primaryText: { color: '#ffffff', fontSize: 15.2, fontWeight: '700' },
  secondaryText: { color: '#111216', fontSize: 14.5, fontWeight: '700' },
  privacy: { minHeight: 19, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacyText: { color: '#747780', fontSize: 11.3 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  primaryPressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
});
