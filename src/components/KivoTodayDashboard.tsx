import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const priorities = [
  ['Finalize Q2 investor deck', 'High impact'],
  ['Review product feedback', 'Customer insights'],
  ['Prepare marketing sync', 'Team alignment'],
];

const phrases = ['Here’s your day', 'Your next step is clear', 'Kivo is ready'];

function Circle({ small = false }: { small?: boolean }) {
  return <View style={[styles.circle, small && styles.circleSmall]} />;
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Header({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View style={styles.cardHeader}>
      <Feather name={icon} size={15} color={colors.text} strokeWidth={1.85} />
      <Text numberOfLines={1} style={styles.cardTitle}>{title}</Text>
      <Feather name="chevron-right" size={15} color="#585960" strokeWidth={1.9} />
    </View>
  );
}

function LivingHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [thinking, setThinking] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const dotOne = useRef(new Animated.Value(0.35)).current;
  const dotTwo = useRef(new Animated.Value(0.35)).current;
  const dotThree = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.35, duration: 430, useNativeDriver: true }),
        ]),
      ).start();
    };

    animateDot(dotOne, 0);
    animateDot(dotTwo, 140);
    animateDot(dotThree, 280);

    const timer = setTimeout(() => {
      setThinking(false);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 760, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 760, useNativeDriver: true }),
      ]).start();
    }, 760);

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -5, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        setPhraseIndex((current) => (current + 1) % phrases.length);
        translateY.setValue(7);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 680, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 680, useNativeDriver: true }),
        ]).start();
      });
    }, 8200);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [dotOne, dotTwo, dotThree, opacity, translateY]);

  if (thinking) {
    return (
      <View style={styles.thinkingWrap}>
        <Animated.View style={[styles.dot, { opacity: dotOne }]} />
        <Animated.View style={[styles.dot, { opacity: dotTwo }]} />
        <Animated.View style={[styles.dot, { opacity: dotThree }]} />
      </View>
    );
  }

  return (
    <Animated.Text style={[styles.title, { opacity, transform: [{ translateY }] }]} numberOfLines={1} adjustsFontSizeToFit>
      {phrases[phraseIndex]}
    </Animated.Text>
  );
}

export function KivoTodayDashboard() {
  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <LivingHeadline />
        <Text style={styles.subtitle}>Your day at a glance</Text>
      </View>

      <Card style={styles.priorityCard}>
        <Header icon="target" title="Top priorities" />
        <View style={styles.priorityList}>
          {priorities.map(([title, sub], index) => (
            <View key={title}>
              <View style={styles.priorityRow}>
                <Circle />
                <View style={styles.priorityTextCol}>
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
            <View style={styles.row}>
              <Circle small />
              <Text numberOfLines={1} style={styles.panelTitle}>Research analysis</Text>
            </View>
            <View style={styles.meta}>
              <Feather name="clock" size={11} color="#a3a4ab" />
              <Text style={styles.metaText}>45 min</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.smallCard}>
          <Header icon="calendar" title="Calendar" />
          <View style={styles.timeline}>
            <View style={styles.rail}>
              <View style={styles.railLine} />
              <View style={styles.railDot} />
              <View style={[styles.railDot, styles.railDotSecond]} />
            </View>
            <View style={styles.timelineContent}>
              <Text numberOfLines={1} style={styles.timelineText}><Text style={styles.time}>10:00  </Text>Stand-up</Text>
              <Text numberOfLines={1} style={styles.timelineText}><Text style={styles.time}>13:00  </Text>Review</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Header icon="star" title="AI suggestion" />
          <Pressable style={({ pressed }) => [styles.panel, styles.suggestionPanel, pressed && styles.pressedPanel]}>
            <Text numberOfLines={1} style={styles.panelTitle}>Start redesign</Text>
            <Text numberOfLines={1} style={styles.panelSub}>25 min focus window</Text>
          </Pressable>
        </Card>

        <Card style={styles.smallCard}>
          <Header icon="refresh-cw" title="Open loops" />
          <View style={styles.loopList}>
            <View style={styles.loopRow}>
              <Feather name="mail" size={12} color={colors.text} />
              <Text numberOfLines={1} style={styles.loopText}>2 replies</Text>
              <Text style={styles.badge}>2</Text>
            </View>
            <View style={styles.loopRow}>
              <Feather name="credit-card" size={12} color={colors.text} />
              <Text numberOfLines={1} style={styles.loopText}>1 bill due</Text>
              <Text style={styles.badge}>1</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressedPanel]}><Feather name="calendar" size={14} color={colors.text} /><Text numberOfLines={1} style={styles.actionText}>Plan my day</Text></Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressedPanel]}><Feather name="mail" size={14} color={colors.text} /><Text numberOfLines={1} style={styles.actionText}>Check inbox</Text></Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressedPanel]}><Feather name="tag" size={14} color={colors.text} /><Text numberOfLines={1} style={styles.actionText}>Find savings</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingTop: 58,
  },
  heading: {
    alignItems: 'center',
  },
  thinkingWrap: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 9,
    backgroundColor: colors.text,
  },
  title: {
    width: '100%',
    color: colors.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -1.85,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#9fA0a7',
    fontSize: 15.5,
    letterSpacing: -0.55,
  },
  card: {
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.042)',
    backgroundColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.038,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
  },
  priorityCard: {
    marginTop: 24,
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 12,
  },
  priorityList: {
    marginTop: 11,
  },
  cardHeader: {
    height: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.48,
  },
  priorityRow: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 4,
  },
  priorityTextCol: {
    flex: 1,
    minWidth: 0,
  },
  circle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#bfc0c5',
  },
  circleSmall: {
    width: 16,
    height: 16,
  },
  priorityTitle: {
    color: colors.text,
    fontSize: 14.5,
    letterSpacing: -0.45,
  },
  prioritySub: {
    marginTop: 3,
    color: '#94959c',
    fontSize: 11.5,
    letterSpacing: -0.2,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 30,
    backgroundColor: 'rgba(0,0,0,0.043)',
  },
  grid: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  smallCard: {
    flex: 1,
    height: 101,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  panel: {
    marginTop: 10,
    height: 47,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    backgroundColor: 'rgba(247,247,248,0.78)',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  suggestionPanel: {
    alignItems: 'flex-start',
  },
  pressedPanel: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 12.6,
    letterSpacing: -0.4,
  },
  panelSub: {
    marginTop: 7,
    color: '#96979f',
    fontSize: 11.5,
  },
  meta: {
    marginLeft: 26,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#a3a4ab',
    fontSize: 11.5,
  },
  timeline: {
    marginTop: 13,
    flexDirection: 'row',
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  rail: {
    width: 18,
    alignItems: 'center',
  },
  railLine: {
    position: 'absolute',
    top: 5,
    bottom: 7,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#dadbe0',
  },
  railDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 9,
    backgroundColor: '#c9cad0',
    marginTop: 2,
  },
  railDotSecond: {
    marginTop: 21,
  },
  timelineText: {
    height: 27,
    color: colors.text,
    fontSize: 12.2,
    letterSpacing: -0.25,
  },
  time: {
    color: '#92939a',
  },
  loopList: {
    marginTop: 10,
    gap: 5,
  },
  loopRow: {
    height: 25,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    backgroundColor: 'rgba(247,247,248,0.78)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  loopText: {
    flex: 1,
    color: colors.text,
    fontSize: 11.5,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: '#eeeeef',
    color: colors.text,
    fontSize: 10.5,
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionText: {
    color: colors.text,
    fontSize: 12.5,
    letterSpacing: -0.42,
  },
});
