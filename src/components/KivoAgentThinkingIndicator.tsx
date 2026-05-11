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
  writing: { label: 'Writing', detail: 'Composing the answer' },
  responding: { label: 'Writing', detail: 'Composing the answer' },
  done: { label: 'Ready' },
  error: { label: 'Something went wrong', detail: 'Try again in a moment' },
};

const kivoThinkingOrbAnimation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 144,
  w: 72,
  h: 72,
  nm: 'Kivo Soft Morphing Orb',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'outer soft glow',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [18] },
            { t: 44, s: [34] },
            { t: 92, s: [26] },
            { t: 144, s: [18] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [-8] },
            { t: 144, s: [352] },
          ],
        },
        p: { a: 0, k: [36, 36, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [94, 94, 100] },
            { t: 50, s: [132, 126, 100] },
            { t: 100, s: [118, 136, 100] },
            { t: 144, s: [94, 94, 100] },
          ],
        },
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
                  {
                    t: 0,
                    s: [
                      {
                        i: [[9, -9], [9, 9], [-9, 9], [-9, -9]],
                        o: [[9, 9], [-9, 9], [-9, -9], [9, -9]],
                        v: [[0, -18], [18, 0], [0, 18], [-18, 0]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 48,
                    s: [
                      {
                        i: [[12, -6], [6, 11], [-11, 6], [-7, -12]],
                        o: [[7, 12], [-11, 6], [-7, -12], [12, -6]],
                        v: [[2, -19], [20, 2], [-2, 17], [-18, -1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 96,
                    s: [
                      {
                        i: [[6, -12], [12, 6], [-6, 12], [-12, -6]],
                        o: [[12, 6], [-6, 12], [-12, -6], [6, -12]],
                        v: [[-1, -17], [18, -2], [1, 20], [-20, 1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 144,
                    s: [
                      {
                        i: [[9, -9], [9, 9], [-9, 9], [-9, -9]],
                        o: [[9, 9], [-9, 9], [-9, -9], [9, -9]],
                        v: [[0, -18], [18, 0], [0, 18], [-18, 0]],
                        c: true,
                      },
                    ],
                  },
                ],
              },
              nm: 'outer glow shape',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.09, 0.32, 1, 1] },
              o: { a: 0, k: 20 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 144,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'soft trail',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [18] },
            { t: 60, s: [30] },
            { t: 144, s: [18] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [24] },
            { t: 144, s: [-336] },
          ],
        },
        p: { a: 0, k: [36, 36, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [104, 96, 100] },
            { t: 72, s: [118, 108, 100] },
            { t: 144, s: [104, 96, 100] },
          ],
        },
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
                  {
                    t: 0,
                    s: [
                      {
                        i: [[8, -7], [9, 7], [-8, 9], [-9, -8]],
                        o: [[9, 7], [-8, 9], [-9, -8], [8, -7]],
                        v: [[1, -16], [17, 1], [-1, 16], [-16, -1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 72,
                    s: [
                      {
                        i: [[5, -11], [11, 5], [-5, 11], [-11, -5]],
                        o: [[11, 5], [-5, 11], [-11, -5], [5, -11]],
                        v: [[-1, -15], [16, -2], [1, 18], [-18, 1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 144,
                    s: [
                      {
                        i: [[8, -7], [9, 7], [-8, 9], [-9, -8]],
                        o: [[9, 7], [-8, 9], [-9, -8], [8, -7]],
                        v: [[1, -16], [17, 1], [-1, 16], [-16, -1]],
                        c: true,
                      },
                    ],
                  },
                ],
              },
              nm: 'trail shape',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.12, 0.38, 1, 1] },
              o: { a: 0, k: 24 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 144,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'main morphing orb',
      sr: 1,
      ks: {
        o: { a: 0, k: 98 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [-18] },
            { t: 144, s: [342] },
          ],
        },
        p: { a: 0, k: [36, 36, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100] },
            { t: 36, s: [113, 94, 100] },
            { t: 72, s: [96, 112, 100] },
            { t: 108, s: [109, 98, 100] },
            { t: 144, s: [100, 100, 100] },
          ],
        },
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
                  {
                    t: 0,
                    s: [
                      {
                        i: [[8, -8], [8, 8], [-8, 8], [-8, -8]],
                        o: [[8, 8], [-8, 8], [-8, -8], [8, -8]],
                        v: [[0, -14], [14, 0], [0, 14], [-14, 0]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 36,
                    s: [
                      {
                        i: [[10, -5], [5, 10], [-10, 5], [-5, -10]],
                        o: [[6, 10], [-10, 5], [-5, -10], [10, -5]],
                        v: [[1, -15], [15, 1], [-1, 13], [-14, -1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 72,
                    s: [
                      {
                        i: [[5, -10], [10, 5], [-5, 10], [-10, -5]],
                        o: [[10, 5], [-5, 10], [-10, -5], [5, -10]],
                        v: [[-1, -13], [14, -1], [1, 15], [-15, 1]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 108,
                    s: [
                      {
                        i: [[9, -6], [6, 9], [-9, 6], [-6, -9]],
                        o: [[6, 9], [-9, 6], [-6, -9], [9, -6]],
                        v: [[0, -15], [15, 0], [0, 13], [-13, 0]],
                        c: true,
                      },
                    ],
                  },
                  {
                    t: 144,
                    s: [
                      {
                        i: [[8, -8], [8, 8], [-8, 8], [-8, -8]],
                        o: [[8, 8], [-8, 8], [-8, -8], [8, -8]],
                        v: [[0, -14], [14, 0], [0, 14], [-14, 0]],
                        c: true,
                      },
                    ],
                  },
                ],
              },
              nm: 'main shape',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.08, 0.34, 1, 1] },
              o: { a: 0, k: 96 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 144,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: 'deep blue center',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [54] },
            { t: 72, s: [82] },
            { t: 144, s: [54] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [12] },
            { t: 144, s: [372] },
          ],
        },
        p: { a: 0, k: [36, 36, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [68, 68, 100] },
            { t: 72, s: [86, 82, 100] },
            { t: 144, s: [68, 68, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [18, 18] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.03, 0.2, 0.95, 1] },
              o: { a: 0, k: 76 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 144,
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
        speed={0.82}
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
          duration: 1750,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(420),
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
    fade.setValue(0.32);

    Animated.timing(fade, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade, title]);

  const shimmerTranslateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 210],
  });

  return (
    <Animated.View style={[styles.statusTextWrap, { opacity: fade }]}>
      <Text numberOfLines={1} style={isCard ? styles.cardTitle : styles.lineTitle}>
        {title}
      </Text>

      {!isCard ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.textLightSweep,
            {
              transform: [{ translateX: shimmerTranslateX }, { rotate: '14deg' }],
            },
          ]}
        />
      ) : null}
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
        <Feather name={getStepIconName(step.status)} size={12} color={iconColor} strokeWidth={2.2} />
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
    minHeight: 52,
    paddingHorizontal: 0,
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
    gap: 18,
  },
  orbWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  lottieOrb: {
    width: 62,
    height: 62,
  },
  fallbackOrb: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    minWidth: 174,
    overflow: 'hidden',
  },
  textLightSweep: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 38,
    backgroundColor: 'rgba(255,255,255,0.44)',
    opacity: 0.42,
  },
  lineTitle: {
    color: '#6f727a',
    fontSize: 27,
    fontWeight: '400',
    letterSpacing: 1.75,
    lineHeight: 36,
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
