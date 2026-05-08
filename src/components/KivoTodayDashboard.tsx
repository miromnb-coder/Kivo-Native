import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const priorities = [
  ['Finalize Q2 investor deck', 'High impact'],
  ['Review product feedback', 'Customer insights'],
  ['Prepare marketing sync', 'Team alignment'],
];

function Circle() {
  return <View style={styles.circle} />;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Header({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View style={styles.cardHeader}>
      <Feather name={icon} size={15} color={colors.text} />
      <Text numberOfLines={1} style={styles.cardTitle}>{title}</Text>
      <Feather name="chevron-right" size={14} color="#585960" />
    </View>
  );
}

export function KivoTodayDashboard() {
  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <View style={styles.dots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
        <Text style={styles.title}>Here’s your day</Text>
        <Text style={styles.subtitle}>Your day at a glance</Text>
      </View>

      <Card style={styles.priorityCard}>
        <Header icon="target" title="Top priorities" />
        <View style={{ marginTop: 12 }}>
          {priorities.map(([title, sub], index) => (
            <View key={title}>
              <View style={styles.priorityRow}>
                <Circle />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.priorityTitle}>{title}</Text>
                  <Text numberOfLines={1} style={styles.prioritySub}>{sub}</Text>
                </View>
              </View>
              {index < priorities.length - 1 ? <View style={styles.line} /> : null}
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Header icon="zap" title="Next task" />
          <View style={styles.panel}>
            <View style={styles.row}><Circle /><Text numberOfLines={1} style={styles.panelTitle}>Research analysis</Text></View>
            <View style={styles.meta}><Feather name="clock" size={11} color="#a3a4ab" /><Text style={styles.metaText}>45 min</Text></View>
          </View>
        </Card>

        <Card style={styles.smallCard}>
          <Header icon="calendar" title="Calendar" />
          <View style={styles.timeline}>
            <View style={styles.rail}><View style={styles.railLine} /><View style={styles.railDot} /><View style={[styles.railDot, { marginTop: 21 }]} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineText}><Text style={styles.time}>10:00  </Text>Stand-up</Text>
              <Text style={styles.timelineText}><Text style={styles.time}>13:00  </Text>Review</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Header icon="star" title="AI suggestion" />
          <Pressable style={styles.panel}>
            <Text numberOfLines={1} style={styles.panelTitle}>Start redesign</Text>
            <Text numberOfLines={1} style={styles.panelSub}>25 min focus window</Text>
          </Pressable>
        </Card>

        <Card style={styles.smallCard}>
          <Header icon="refresh-cw" title="Open loops" />
          <View style={styles.loopList}>
            <View style={styles.loopRow}><Feather name="mail" size={12} color={colors.text} /><Text style={styles.loopText}>2 replies</Text><Text style={styles.badge}>2</Text></View>
            <View style={styles.loopRow}><Feather name="credit-card" size={12} color={colors.text} /><Text style={styles.loopText}>1 bill due</Text><Text style={styles.badge}>1</Text></View>
          </View>
        </Card>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action}><Feather name="calendar" size={14} color={colors.text} /><Text style={styles.actionText}>Plan my day</Text></Pressable>
        <Pressable style={styles.action}><Feather name="mail" size={14} color={colors.text} /><Text style={styles.actionText}>Check inbox</Text></Pressable>
        <Pressable style={styles.action}><Feather name="tag" size={14} color={colors.text} /><Text style={styles.actionText}>Find savings</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 22, paddingTop: 18 },
  heading: { alignItems: 'center' },
  dots: { height: 14, flexDirection: 'row', gap: 7, marginBottom: 4 },
  dot: { width: 5.5, height: 5.5, borderRadius: 9, backgroundColor: colors.text, opacity: 0.35 },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -1.9, lineHeight: 34 },
  subtitle: { marginTop: 10, color: '#a4a5ab', fontSize: 15.5, letterSpacing: -0.55 },
  card: { borderRadius: 25, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)', backgroundColor: 'rgba(255,255,255,0.58)', shadowColor: '#0f172a', shadowOpacity: 0.033, shadowRadius: 30, shadowOffset: { width: 0, height: 14 } },
  priorityCard: { marginTop: 21, paddingHorizontal: 17, paddingTop: 14, paddingBottom: 12 },
  cardHeader: { height: 23, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600', letterSpacing: -0.45 },
  priorityRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 4 },
  circle: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: '#bfc0c5' },
  priorityTitle: { color: colors.text, fontSize: 14, letterSpacing: -0.45 },
  prioritySub: { marginTop: 3, color: '#94959c', fontSize: 11.5, letterSpacing: -0.2 },
  line: { height: StyleSheet.hairlineWidth, marginLeft: 30, backgroundColor: 'rgba(0,0,0,0.045)' },
  grid: { marginTop: 10, flexDirection: 'row', gap: 10 },
  smallCard: { flex: 1, height: 105, paddingHorizontal: 12, paddingVertical: 13 },
  panel: { marginTop: 11, height: 50, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.035)', backgroundColor: 'rgba(247,247,248,0.72)', justifyContent: 'center', paddingHorizontal: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  panelTitle: { color: colors.text, fontSize: 12.5, letterSpacing: -0.4 },
  panelSub: { marginTop: 7, color: '#96979f', fontSize: 11.5 },
  meta: { marginLeft: 26, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#a3a4ab', fontSize: 11.5 },
  timeline: { marginTop: 14, flexDirection: 'row' },
  rail: { width: 17, alignItems: 'center' },
  railLine: { position: 'absolute', top: 6, bottom: 6, width: StyleSheet.hairlineWidth, backgroundColor: '#dadbe0' },
  railDot: { width: 5.5, height: 5.5, borderRadius: 9, backgroundColor: '#c9cad0', marginTop: 2 },
  timelineText: { height: 27, color: colors.text, fontSize: 12, letterSpacing: -0.25 },
  time: { color: '#92939a' },
  loopList: { marginTop: 11, gap: 5 },
  loopRow: { height: 26, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.035)', backgroundColor: 'rgba(247,247,248,0.72)', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  loopText: { flex: 1, color: colors.text, fontSize: 11.5 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, overflow: 'hidden', textAlign: 'center', lineHeight: 18, backgroundColor: '#eeeeef', color: colors.text, fontSize: 10.5 },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 34, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.68)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { color: colors.text, fontSize: 12.5, letterSpacing: -0.42 },
});
