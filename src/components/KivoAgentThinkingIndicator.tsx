import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
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
  style?: object;
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
  const glow = useRef(new Animated.Value(0)).current;
  const shouldAnimate = status !== 'idle' && status !== 'done' && status !== 'error';

  useEffect(() => {
    if (!shouldAnimate) {
      morph.stopAnimation();
      glow.stopAnimation();
      morph.setValue(status === 'error' ? 0.64 : 0);
      glow.setValue(0);
      return;
    }

    const morphLoop = Animated.loop(
      Animated.timing(morph, {
        toValue: 1,
        duration: 1850,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 760, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 920, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]),
    );

    morphLoop.start();
    glowLoop.start();

    return () => {
      morphLoop.stop();
      glowLoop.stop();
    };
  }, [glow, morph, shouldAnimate, status]);

  const rotate = morph.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = morph.interpolate({ inputRange: [0, 0.22, 0.48, 0.73, 1], outputRange: [1, 1.12, 0.96, 1.08, 1] });
  const scaleX = morph.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [1, 0.86, 1.12, 0.94, 1] });
  const scaleY = morph.interpolate({ inputRange: [0, 0.24, 0.52, 0.78, 1], outputRange: [1, 1.14, 0.88, 1.08, 1] });
  const radiusTopLeft = morph.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [11, 7, 13, 5, 11] });
  const radiusTopRight = morph.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [11, 13, 6, 10, 11] });
  const radiusBottomRight = morph.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [11, 6, 12, 14, 11] });
  const radiusBottomLeft = morph.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [11, 12, 8, 6, 11] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.42] });

  const orbColor = status === 'error' ? '#ef4444' : status === 'done' ? '#111216' : '#2563eb';
  const glowColor = status === 'error' ? 'rgba(239,68,68,0.22)' : 'rgba(37,99,235,0.24)';

  return (
    <View style={styles.orbWrap} accessibilityElementsHidden>
      <Animated.View style={[styles.orbGlow, { backgroundColor: glowColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: orbColor,
            borderTopLeftRadius: radiusTopLeft,
            borderTopRightRadius: radiusTopRight,
            borderBottomRightRadius: radiusBottomRight,
            borderBottomLeftRadius: radiusBottomLeft,
            transform: [{ rotate }, { scale }, { scaleX }, { scaleY }],
          },
        ]}
      />
      <Animated.View style={[styles.orbHighlight, { opacity: shouldAnimate ? glowOpacity : 0.32 }]} />
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
    maxWidth: '86%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 2,
    marginBottom: 14,
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
    gap: 12,
  },
  orbWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 999,
  },
  orb: {
    width: 17,
    height: 17,
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  orbHighlight: {
    position: 'absolute',
    top: 7,
    left: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  copyBlock: {
    flex: 1,
    minWidth: 0,
  },
  lineTitle: {
    color: '#737680',
    fontSize: 19.5,
    fontWeight: '400',
    letterSpacing: 0.8,
    lineHeight: 25,
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
    fontWeight: '650',
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
