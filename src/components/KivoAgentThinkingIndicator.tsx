import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
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
  writing: { label: 'Thinking', detail: 'Composing the answer' },
  responding: { label: 'Thinking', detail: 'Composing the answer' },
  done: { label: 'Ready' },
  error: { label: 'Something went wrong', detail: 'Try again in a moment' },
};

const KIVO_REFERENCE_THINKING_ORB_ANIMATION = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 150,
  w: 64,
  h: 64,
  nm: 'Kivo reference thinking orb',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'very soft blue haze',
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [14] }, { t: 75, s: [27] }, { t: 150, s: [14] }] },
        r: { a: 1, k: [{ t: 0, s: [-8] }, { t: 150, s: [352] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [92, 92, 100] }, { t: 75, s: [132, 124, 100] }, { t: 150, s: [92, 92, 100] }] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ks: {
                a: 1,
                k: [
                  { t: 0, s: [{ i: [[12, -12], [12, 12], [-12, 12], [-12, -12]], o: [[12, 12], [-12, 12], [-12, -12], [12, -12]], v: [[0, -18], [18, 0], [0, 18], [-18, 0]], c: true }] },
                  { t: 75, s: [{ i: [[14, -8], [8, 14], [-14, 8], [-8, -14]], o: [[8, 14], [-14, 8], [-8, -14], [14, -8]], v: [[1, -19], [19, 1], [-1, 18], [-18, -1]], c: true }] },
                  { t: 150, s: [{ i: [[12, -12], [12, 12], [-12, 12], [-12, -12]], o: [[12, 12], [-12, 12], [-12, -12], [12, -12]], v: [[0, -18], [18, 0], [0, 18], [-18, 0]], c: true }] },
                ],
              },
            },
            { ty: 'fl', c: { a: 0, k: [0.08, 0.3, 1, 1] }, o: { a: 0, k: 24 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'misty diamond trail',
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [22] }, { t: 58, s: [34] }, { t: 150, s: [22] }] },
        r: { a: 1, k: [{ t: 0, s: [22] }, { t: 150, s: [-338] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [98, 92, 100] }, { t: 58, s: [116, 108, 100] }, { t: 150, s: [98, 92, 100] }] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ks: {
                a: 1,
                k: [
                  { t: 0, s: [{ i: [[8, -9], [9, 8], [-8, 9], [-9, -8]], o: [[9, 8], [-8, 9], [-9, -8], [8, -9]], v: [[0, -15], [15, 0], [0, 15], [-15, 0]], c: true }] },
                  { t: 58, s: [{ i: [[6, -11], [11, 6], [-6, 11], [-11, -6]], o: [[11, 6], [-6, 11], [-11, -6], [6, -11]], v: [[-1, -15], [16, -1], [1, 16], [-16, 1]], c: true }] },
                  { t: 150, s: [{ i: [[8, -9], [9, 8], [-8, 9], [-9, -8]], o: [[9, 8], [-8, 9], [-9, -8], [8, -9]], v: [[0, -15], [15, 0], [0, 15], [-15, 0]], c: true }] },
                ],
              },
            },
            { ty: 'fl', c: { a: 0, k: [0.12, 0.39, 1, 1] }, o: { a: 0, k: 28 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'small blue thinking core',
      sr: 1,
      ks: {
        o: { a: 0, k: 96 },
        r: { a: 1, k: [{ t: 0, s: [-16] }, { t: 150, s: [344] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [94, 94, 100] }, { t: 50, s: [106, 92, 100] }, { t: 100, s: [92, 106, 100] }, { t: 150, s: [94, 94, 100] }] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ks: {
                a: 1,
                k: [
                  { t: 0, s: [{ i: [[8, -8], [8, 8], [-8, 8], [-8, -8]], o: [[8, 8], [-8, 8], [-8, -8], [8, -8]], v: [[0, -13], [13, 0], [0, 13], [-13, 0]], c: true }] },
                  { t: 50, s: [{ i: [[10, -5], [5, 10], [-10, 5], [-5, -10]], o: [[5, 10], [-10, 5], [-5, -10], [10, -5]], v: [[1, -14], [14, 1], [-1, 12], [-13, -1]], c: true }] },
                  { t: 100, s: [{ i: [[5, -10], [10, 5], [-5, 10], [-10, -5]], o: [[10, 5], [-5, 10], [-10, -5], [5, -10]], v: [[-1, -12], [13, -1], [1, 14], [-14, 1]], c: true }] },
                  { t: 150, s: [{ i: [[8, -8], [8, 8], [-8, 8], [-8, -8]], o: [[8, 8], [-8, 8], [-8, -8], [8, -8]], v: [[0, -13], [13, 0], [0, 13], [-13, 0]], c: true }] },
                ],
              },
            },
            { ty: 'fl', c: { a: 0, k: [0.07, 0.29, 1, 1] }, o: { a: 0, k: 98 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: 'deep center glow',
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [44] }, { t: 75, s: [70] }, { t: 150, s: [44] }] },
        r: { a: 1, k: [{ t: 0, s: [16] }, { t: 150, s: [376] }] },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [68, 68, 100] }, { t: 75, s: [84, 80, 100] }, { t: 150, s: [68, 68, 100] }] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [17, 17] } },
            { ty: 'fl', c: { a: 0, k: [0.02, 0.16, 0.92, 1] }, o: { a: 0, k: 78 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
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
        <Feather name="x" size={12} color="#fff" strokeWidth={2.5} />
      </View>
    );
  }

  return (
    <View style={styles.orbWrap} accessibilityElementsHidden>
      <LottieView
        autoPlay
        loop
        speed={0.74}
        source={KIVO_REFERENCE_THINKING_ORB_ANIMATION as any}
        style={styles.lottieOrb}
      />
    </View>
  );
}

function KivoStatusText({ title, isCard }: { title: string; isCard: boolean }) {
  const fade = useRef(new Animated.Value(1)).current;
  const previousTitleRef = useRef(title);

  useEffect(() => {
    if (previousTitleRef.current === title) return;

    previousTitleRef.current = title;
    fade.setValue(0.42);

    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade, title]);

  return (
    <Animated.View style={[styles.statusTextWrap, { opacity: fade }]}>
      <Text numberOfLines={1} style={isCard ? styles.cardTitle : styles.lineTitle}>
        {title}
      </Text>
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

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconColor =
    step.status === 'error' ? '#ef4444' : step.status === 'done' ? '#8f9098' : '#111216';

  return (
    <View style={styles.stepRow}>
      <Animated.View
        style={[
          styles.stepIcon,
          isActive && { transform: [{ rotate }] },
          step.status === 'done' && styles.stepDone,
          step.status === 'error' && styles.stepError,
        ]}
      >
        <Feather
          name={getStepIconName(step.status)}
          size={12}
          color={iconColor}
          strokeWidth={2.2}
        />
      </Animated.View>

      <View style={styles.stepCopy}>
        <Text numberOfLines={1} style={styles.stepLabel}>
          {step.label}
        </Text>

        {step.detail ? (
          <Text numberOfLines={1} style={styles.stepDetail}>
            {step.detail}
          </Text>
        ) : null}
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
  const shouldShowSteps = showSteps ?? steps.length > 0;
  const isCard = variant === 'card' || shouldShowSteps;
  const copy = statusCopy[status] ?? statusCopy.thinking;
  const title = label ?? (isCard || status === 'error' ? copy.label : 'Thinking');
  const subtitle = detail ?? copy.detail;

  const accessibilityLabel = useMemo(() => {
    if (subtitle) return `Kivo status: ${title}. ${subtitle}`;
    return `Kivo status: ${title}`;
  }, [subtitle, title]);

  if (!visible || status === 'idle' || status === 'done') return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={[isCard ? styles.card : styles.line, style]}
    >
      <View style={styles.headerRow}>
        <KivoThinkingOrb status={status} />

        <View style={styles.copyBlock}>
          <KivoStatusText title={title} isCard={isCard} />

          {isCard && subtitle ? (
            <Text numberOfLines={1} style={styles.cardSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {shouldShowSteps ? (
        <View style={styles.stepsBlock}>
          {steps.map((step) => (
            <KivoAgentStepRow key={step.id} step={step} />
          ))}
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
    minHeight: 38,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 11,
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
    gap: 13,
  },
  orbWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -1,
  },
  lottieOrb: {
    width: 46,
    height: 46,
  },
  fallbackOrb: {
    width: 25,
    height: 25,
    borderRadius: 13,
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
    minWidth: 118,
    overflow: 'visible',
  },
  lineTitle: {
    color: '#6f7077',
    fontSize: 22.5,
    fontWeight: '300',
    letterSpacing: 1.2,
    lineHeight: 28,
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
