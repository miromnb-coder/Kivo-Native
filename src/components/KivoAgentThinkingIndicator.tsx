import { Feather } from '@expo/vector-icons';
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

function getStepIconName(status: KivoAgentStepStatus): keyof typeof Feather.glyphMap {
  if (status === 'done') return 'check';
  if (status === 'error') return 'x';
  if (status === 'active') return 'loader';
  return 'circle';
}

function KivoMorphingOrb({ status }: { status: KivoAgentThinkingStatus }) {
  const morph = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shouldAnimate = status !== 'idle' && status !== 'done' && status !== 'error';

  useEffect(() => {
    if (!shouldAnimate) {
      morph.stopAnimation();
      pulse.stopAnimation();
      morph.setValue(status === 'error' ? 0.66 : 0);
      pulse.setValue(0);
      return;
    }

    const morphLoop = Animated.loop(
      Animated.timing(morph, {
        toValue: 1,
        duration: 1700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 860, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]),
    );

    morphLoop.start();
    pulseLoop.start();

    return () => {
      morphLoop.stop();
      pulseLoop.stop();
    };
  }, [morph, pulse, shouldAnimate, status]);

  const rotate = morph.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseRotate = morph.interpolate({ inputRange: [0, 1], outputRange: ['32deg', '-328deg'] });
  const slowRotate = morph.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '190deg'] });
  const scale = morph.interpolate({ inputRange: [0, 0.24, 0.5, 0.76, 1], outputRange: [1, 1.08, 0.96, 1.12, 1] });
  const trailScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.22] });
  const trailOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.08] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.46] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.34] });

  const radiusTopLeft = morph.interpolate({ inputRange: [0, 0.2, 0.48, 0.72, 1], outputRange: [14, 7, 15, 8, 14] });
  const radiusTopRight = morph.interpolate({ inputRange: [0, 0.2, 0.48, 0.72, 1], outputRange: [12, 15, 8, 14, 12] });
  const radiusBottomRight = morph.interpolate({ inputRange: [0, 0.2, 0.48, 0.72, 1], outputRange: [14, 8, 15, 7, 14] });
  const radiusBottomLeft = morph.interpolate({ inputRange: [0, 0.2, 0.48, 0.72, 1], outputRange: [8, 14, 7, 15, 8] });

  const orbColor = status === 'error' ? '#ef4444' : status === 'done' ? '#111216' : '#1556ff';
  const glowColor = status === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(21,86,255,0.18)';
  const trailColor = status === 'error' ? 'rgba(239,68,68,0.16)' : 'rgba(21,86,255,0.16)';

  return (
    <View style={styles.orbWrap} accessibilityElementsHidden>
      <Animated.View style={[styles.orbGlow, { backgroundColor: glowColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View
        style={[
          styles.orbTrail,
          styles.orbTrailOne,
          {
            backgroundColor: trailColor,
            opacity: trailOpacity,
            transform: [{ rotate: reverseRotate }, { scale: trailScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orbTrail,
          styles.orbTrailTwo,
          {
            backgroundColor: trailColor,
            opacity: trailOpacity,
            transform: [{ rotate: slowRotate }, { scale: trailScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: orbColor,
            borderTopLeftRadius: radiusTopLeft,
            borderTopRightRadius: radiusTopRight,
            borderBottomRightRadius: radiusBottomRight,
            borderBottomLeftRadius: radiusBottomLeft,
            transform: [{ rotate }, { scale }],
          },
        ]}
      />
      <Animated.View style={[styles.orbCoreShade, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.06] }) }]} />
    </View>
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

  if (!visible || status === 'idle') return null;

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={[isCard ? styles.card : styles.line, style]}>
      <View style={styles.headerRow}>
        <KivoMorphingOrb status={status} />
        <View style={styles.copyBlock}>
          <Text numberOfLines={1} style={isCard ? styles.cardTitle : styles.lineTitle}>{title}</Text>
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
    minHeight: 46,
    paddingHorizontal: 1,
    marginTop: 0,
    marginBottom: 9,
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
    gap: 14,
  },
  orbWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 999,
  },
  orbTrail: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 9,
  },
  orbTrailOne: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 9,
    borderBottomLeftRadius: 14,
  },
  orbTrailTwo: {
    width: 22,
    height: 22,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 7,
  },
  orb: {
    width: 20,
    height: 20,
    shadowColor: '#1556ff',
    shadowOpacity: 0.22,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
  },
  orbCoreShade: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.36)',
    transform: [{ translateX: -2 }, { translateY: -3 }],
  },
  copyBlock: {
    flex: 1,
    minWidth: 0,
  },
  lineTitle: {
    color: '#6d6f76',
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 1.45,
    lineHeight: 31,
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
