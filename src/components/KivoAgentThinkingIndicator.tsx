import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export type KivoAgentThinkingStatus =
  | 'idle'
  | 'thinking'
  | 'checking_memory'
  | 'checking_calendar'
  | 'checking_library'
  | 'planning'
  | 'using_tools'
  | 'writing'
  | 'responding'
  | 'done'
  | 'error';

export type KivoAgentStepStatus = 'pending' | 'active' | 'done' | 'error';

export type KivoAgentThinkingStep = {
  id: string;
  label: string;
  detail?: string;
  status: KivoAgentStepStatus;
  durationLabel?: string;
};

type Props = {
  status?: KivoAgentThinkingStatus;
  visible?: boolean;
  label?: string;
  detail?: string;
  steps?: KivoAgentThinkingStep[];
  variant?: 'line' | 'card';
  showSteps?: boolean;
  style?: StyleProp<ViewStyle>;
};

const statusCopy: Record<KivoAgentThinkingStatus, { label: string; detail?: string }> = {
  idle: { label: 'Ready' },
  thinking: { label: 'Thinking', detail: 'Preparing the response' },
  checking_memory: { label: 'Checking memory', detail: 'Reviewing saved context' },
  checking_calendar: { label: 'Checking calendar', detail: 'Looking for relevant events' },
  checking_library: { label: 'Searching library', detail: 'Looking through saved items' },
  planning: { label: 'Planning', detail: 'Choosing the next best step' },
  using_tools: { label: 'Using tools', detail: 'Running the selected action' },
  writing: { label: 'Writing', detail: 'Composing the answer' },
  responding: { label: 'Writing', detail: 'Composing the answer' },
  done: { label: 'Ready' },
  error: { label: 'Something went wrong', detail: 'Try again in a moment' },
};

const kivoThinkingOrbAnimation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 120,
  w: 64,
  h: 64,
  nm: 'Kivo Thinking Orb',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'soft halo',
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [20] }, { t: 58, s: [44] }, { t: 120, s: [20] }] },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 120, s: [360] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [92, 92, 100] }, { t: 58, s: [126, 126, 100] }, { t: 120, s: [92, 92, 100] }] },
      },
      shapes: [
        { ty: 'gr', it: [
          { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [34, 34] } },
          { ty: 'fl', c: { a: 0, k: [0.08, 0.34, 1, 1] }, o: { a: 0, k: 22 }, r: 1 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ] },
      ],
      ip: 0,
      op: 120,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'morphing orb',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [-18] }, { t: 120, s: [342] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100, 100] }, { t: 38, s: [114, 94, 100] }, { t: 78, s: [94, 112, 100] }, { t: 120, s: [100, 100, 100] }] },
      },
      shapes: [
        { ty: 'gr', it: [
          { ind: 0, ty: 'sh', ks: { a: 1, k: [
            { t: 0, s: [{ i: [[7, -7], [7, 7], [-7, 7], [-7, -7]], o: [[7, 7], [-7, 7], [-7, -7], [7, -7]], v: [[0, -13], [13, 0], [0, 13], [-13, 0]], c: true }] },
            { t: 40, s: [{ i: [[9, -5], [4, 9], [-9, 4], [-4, -9]], o: [[5, 9], [-9, 4], [-4, -9], [9, -5]], v: [[1, -14], [14, 1], [-1, 12], [-13, -1]], c: true }] },
            { t: 80, s: [{ i: [[5, -9], [9, 4], [-5, 9], [-9, -4]], o: [[9, 4], [-5, 9], [-9, -4], [5, -9]], v: [[-1, -12], [13, -1], [1, 14], [-14, 1]], c: true }] },
            { t: 120, s: [{ i: [[7, -7], [7, 7], [-7, 7], [-7, -7]], o: [[7, 7], [-7, 7], [-7, -7], [7, -7]], v: [[0, -13], [13, 0], [0, 13], [-13, 0]], c: true }] },
          ] }, nm: 'shape' },
          { ty: 'fl', c: { a: 0, k: [0.08, 0.34, 1, 1] }, o: { a: 0, k: 96 }, r: 1 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ] },
      ],
      ip: 0,
      op: 120,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'deep center',
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [40] }, { t: 60, s: [68] }, { t: 120, s: [40] }] },
        r: { a: 1, k: [{ t: 0, s: [22] }, { t: 120, s: [382] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [70, 70, 100] }, { t: 60, s: [86, 82, 100] }, { t: 120, s: [70, 70, 100] }] },
      },
      shapes: [
        { ty: 'gr', it: [
          { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [17, 17] } },
          { ty: 'fl', c: { a: 0, k: [0.03, 0.22, 0.96, 1] }, o: { a: 0, k: 72 }, r: 1 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ] },
      ],
      ip: 0,
      op: 120,
      st: 0,
      bm: 0,
    },
  ],
};

function getStepIconName(status: KivoAgentStepStatus): keyof typeof Feather.glyphMap {
  if (status === 'done') return 'check';
  if (status === 'error') return 'x';
  if (status === 'active') return 'loader';
  return 'circle';
}

function KivoThinkingOrb({ status }: { status: KivoAgentThinkingStatus }) {
  if (status === 'error') {
    return (
      <View style={[styles.fallbackOrb, styles.errorOrb]}>
        <Feather name="x" size={14} color="#fff" strokeWidth={2.6} />
      </View>
    );
  }

  return (
    <View style={styles.orbWrap} accessibilityElementsHidden>
      <LottieView
        autoPlay
        loop
        speed={0.88}
        source={kivoThinkingOrbAnimation as object}
        style={styles.lottieOrb}
      />
    </View>
  );
}

function KivoStatusText({ title, isCard }: { title: string; isCard: boolean }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const previousTitleRef = useRef(title);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    if (previousTitleRef.current === title) return;
    previousTitleRef.current = title;
    fade.setValue(0.25);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade, title]);

  const shimmerTranslateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-70, 170] });

  return (
    <Animated.View style={[styles.statusTextWrap, { opacity: fade }]}>
      <Text numberOfLines={1} style={isCard ? styles.cardTitle : styles.lineTitle}>{title}</Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.textLightSweep,
          {
            transform: [{ translateX: shimmerTranslateX }, { rotate: '16deg' }],
          },
        ]}
      />
    </Animated.View>
  );
}

function KivoAgentStepRow({ step }: { step: KivoAgentThinkingStep }) {
  const spin = useRef(new Animated.Value(0)).current;
  const isActive = step.status === 'active';

  useEffect(() => {
    if (!isActive) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 980,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [isActive, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const iconColor = step.status === 'error' ? '#ef4444' : step.status === 'done' ? '#8f9098' : '#111216';

  return (
    <View style={styles.stepRow}>
      <Animated.View style={[styles.stepIcon, isActive && { transform: [{ rotate }] }, step.status === 'done' && styles.stepDone, step.status === 'error' && styles.stepError]}>
        <Feather name={getStepIconName(step.status)} size={12} color={iconColor} strokeWidth={2.2} />
      </Animated.View>
      <View style={styles.stepCopy}>
        <Text numberOfLines={1} style={styles.stepLabel}>{step.label}</Text>
        {step.detail ? <Text numberOfLines={1} style={styles.stepDetail}>{step.detail}</Text> : null}
      </View>
      {step.durationLabel ? <Text style={styles.stepDuration}>{step.durationLabel}</Text> : null}
    </View>
  );
}

function KivoAgentThinkingIndicatorBase({
  status = 'thinking',
  visible = true,
  label,
  detail,
  steps = [],
  variant = 'line',
  showSteps,
  style,
}: Props) {
  const copy = statusCopy[status] ?? statusCopy.thinking;
  const title = label ?? copy.label;
  const subtitle = detail ?? copy.detail;
  const shouldShowSteps = showSteps ?? steps.length > 0;
  const isCard = variant === 'card' || shouldShowSteps;

  const accessibilityLabel = useMemo(() => {
    if (subtitle) return `Kivo status: ${title}. ${subtitle}`;
    return `Kivo status: ${title}`;
  }, [subtitle, title]);

  if (!visible || status === 'idle' || status === 'done') return null;

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={[isCard ? styles.card : styles.line, style]}>
      <View style={styles.headerRow}>
        <KivoThinkingOrb status={status} />
        <View style={styles.copyBlock}>
          <KivoStatusText title={title} isCard={isCard} />
          {isCard && subtitle ? <Text numberOfLines={1} style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {shouldShowSteps ? (
        <View style={styles.stepsBlock}>
          {steps.map((step) => <KivoAgentStepRow key={step.id} step={step} />)}
        </View>
      ) : null}
    </View>
  );
}

export const KivoAgentThinkingIndicator = memo(KivoAgentThinkingIndicatorBase);

const styles = StyleSheet.create({
  line: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    minHeight: 50,
    paddingHorizontal: 1,
    marginTop: 0,
    marginBottom: 10,
  },
  card: {
    alignSelf: 'flex-start',
    width: '92%',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 2,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#0f172a',
    shadowOpacity: 0.035,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  orbWrap: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -1,
  },
  lottieOrb: {
    width: 54,
    height: 54,
  },
  fallbackOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOrb: {
    backgroundColor: '#ef4444',
  },
  copyBlock: {
    flex: 1,
    minWidth: 0,
  },
  statusTextWrap: {
    alignSelf: 'flex-start',
    minWidth: 158,
    overflow: 'hidden',
  },
  textLightSweep: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 34,
    backgroundColor: 'rgba(255,255,255,0.5)',
    opacity: 0.5,
  },
  lineTitle: {
    color: '#6d6f76',
    fontSize: 25.5,
    fontWeight: '400',
    letterSpacing: 1.55,
    lineHeight: 33,
  },
  cardTitle: {
    color: '#111216',
    fontSize: 15.2,
    fontWeight: '700',
    letterSpacing: -0.24,
    lineHeight: 19,
  },
  cardSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12.9,
    fontWeight: '400',
    letterSpacing: -0.18,
    lineHeight: 16,
  },
  stepsBlock: {
    marginTop: 12,
    gap: 8,
  },
  stepRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  stepDone: {
    backgroundColor: 'rgba(0,0,0,0.025)',
  },
  stepError: {
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
  },
  stepLabel: {
    color: colors.text,
    fontSize: 13.8,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  stepDetail: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 12.1,
    fontWeight: '400',
    letterSpacing: -0.14,
    lineHeight: 15,
  },
  stepDuration: {
    color: colors.textMuted,
    fontSize: 12.2,
    fontWeight: '500',
    letterSpacing: -0.14,
  },
});
