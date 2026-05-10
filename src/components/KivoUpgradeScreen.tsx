import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  onBack: () => void;
};

type BenefitRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
};

const benefits: BenefitRow[] = [
  { icon: 'database', label: '500 daily credits' },
  { icon: 'grid', label: 'All connected tools' },
  { icon: 'cpu', label: 'Smarter memory' },
  { icon: 'star', label: 'Priority features' },
  { icon: 'zap', label: 'Faster responses' },
];

function BenefitList({ compact }: { compact: boolean }) {
  return (
    <View style={styles.benefitCard}>
      {benefits.map((benefit, index) => (
        <Pressable
          key={benefit.label}
          accessibilityRole="button"
          accessibilityLabel={benefit.label}
          style={({ pressed }) => [
            styles.benefitRow,
            compact && styles.benefitRowCompact,
            index < benefits.length - 1 && styles.rowBorder,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.benefitIconSlot}>
            <Feather name={benefit.icon} size={compact ? 21 : 23} color="#111216" strokeWidth={1.78} />
          </View>
          <Text numberOfLines={1} style={[styles.benefitText, compact && styles.benefitTextCompact]}>{benefit.label}</Text>
          <Feather name="chevron-right" size={compact ? 21 : 23} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoUpgradeScreen({ onBack }: Props) {
  const { height } = useWindowDimensions();
  const compact = height < 880;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, compact && styles.backButtonCompact, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={compact ? 28 : 30} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>Upgrade to Plus</Text>
            <Text numberOfLines={1} style={[styles.subtitle, compact && styles.subtitleCompact]}>Unlock more daily operator usage.</Text>
          </View>
          <View style={[styles.headerSpacer, compact && styles.headerSpacerCompact]} />
        </View>

        <View style={[styles.heroCard, compact && styles.heroCardCompact]}>
          <View style={styles.heroArcOne} />
          <View style={styles.heroArcTwo} />
          <View style={styles.heroArcThree} />
          <Feather name="star" size={compact ? 25 : 28} color="#ffffff" strokeWidth={1.9} style={styles.heroStar} />
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Kivo Plus</Text>
          <Text style={[styles.heroSubtitle, compact && styles.heroSubtitleCompact]}>500 daily credits.</Text>
          <Text style={[styles.heroSubtitle, compact && styles.heroSubtitleCompact, styles.heroSubtitleSecond]}>More power for every day.</Text>
        </View>

        <Text style={[styles.sectionLabel, compact && styles.sectionLabelCompact]}>EVERYTHING IN FREE, PLUS:</Text>
        <BenefitList compact={compact} />

        <View style={[styles.planCard, compact && styles.planCardCompact]}>
          <View style={[styles.planBadge, compact && styles.planBadgeCompact]}>
            <Feather name="star" size={compact ? 21 : 24} color="#ffffff" strokeWidth={1.75} />
          </View>
          <View style={styles.planTextBlock}>
            <Text style={[styles.planName, compact && styles.planNameCompact]}>Plus</Text>
            <Text style={[styles.price, compact && styles.priceCompact]}>€12/month</Text>
            <Text style={[styles.cancelText, compact && styles.cancelTextCompact]}>Cancel anytime</Text>
          </View>
          <View style={[styles.selectedOuter, compact && styles.selectedOuterCompact]}>
            <View style={[styles.selectedInner, compact && styles.selectedInnerCompact]} />
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Current plan Free" style={({ pressed }) => [styles.currentPlanRow, compact && styles.currentPlanRowCompact, pressed && styles.pressed]}>
          <View style={styles.currentPlanTextBlock}>
            <Text numberOfLines={1} style={[styles.currentPlanText, compact && styles.currentPlanTextCompact]}>Current plan: Free · 50 daily credits</Text>
            <Text numberOfLines={1} style={[styles.currentPlanSubtext, compact && styles.currentPlanSubtextCompact]}>Credits reset every day.</Text>
          </View>
          <Feather name="chevron-right" size={compact ? 21 : 23} color="#8f9097" strokeWidth={1.85} />
        </Pressable>

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Upgrade to Plus" style={({ pressed }) => [styles.primaryButton, compact && styles.actionButtonCompact, pressed && styles.primaryPressed]}>
            <Text style={[styles.primaryButtonText, compact && styles.buttonTextCompact]}>Upgrade to Plus</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Maybe later" onPress={onBack} style={({ pressed }) => [styles.secondaryButton, compact && styles.actionButtonCompact, pressed && styles.pressed]}>
            <Text style={[styles.secondaryButtonText, compact && styles.buttonTextCompact]}>Maybe later</Text>
          </Pressable>
        </View>

        <View style={[styles.privacyLine, compact && styles.privacyLineCompact]}>
          <Feather name="shield" size={compact ? 15 : 17} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.privacyText, compact && styles.privacyTextCompact]}>Private by design. Your data stays in your control.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 185,
    backgroundColor: '#f5f5f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 10,
  },
  contentCompact: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 6,
  },
  header: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCompact: {
    height: 76,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  backButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    color: '#111216',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.86,
    lineHeight: 33,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 24.5,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 7,
    color: '#737680',
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.34,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitleCompact: {
    marginTop: 5,
    fontSize: 15.5,
    lineHeight: 19,
  },
  headerSpacer: {
    width: 56,
    height: 56,
  },
  headerSpacerCompact: {
    width: 48,
    height: 48,
  },
  heroCard: {
    height: 144,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: '#111216',
    paddingHorizontal: 23,
    paddingVertical: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.11,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  heroCardCompact: {
    height: 120,
    borderRadius: 23,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  heroArcOne: {
    position: 'absolute',
    right: -46,
    bottom: -82,
    width: 320,
    height: 196,
    borderRadius: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroArcTwo: {
    position: 'absolute',
    right: -22,
    bottom: -66,
    width: 292,
    height: 172,
    borderRadius: 146,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.105)',
  },
  heroArcThree: {
    position: 'absolute',
    right: 2,
    bottom: -50,
    width: 264,
    height: 150,
    borderRadius: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  heroStar: {
    position: 'absolute',
    top: 24,
    right: 30,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 33,
    fontWeight: '700',
    letterSpacing: -1.05,
    lineHeight: 39,
  },
  heroTitleCompact: {
    fontSize: 29,
    lineHeight: 34,
  },
  heroSubtitle: {
    marginTop: 11,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 17.2,
    fontWeight: '400',
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  heroSubtitleCompact: {
    marginTop: 7,
    fontSize: 15.5,
    lineHeight: 18,
  },
  heroSubtitleSecond: {
    marginTop: 0,
  },
  sectionLabel: {
    marginTop: 22,
    marginLeft: 10,
    marginBottom: 12,
    color: '#747780',
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.95,
  },
  sectionLabelCompact: {
    marginTop: 15,
    marginBottom: 9,
    fontSize: 12.2,
    letterSpacing: 0.82,
  },
  benefitCard: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.024,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  benefitRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 20,
    gap: 18,
  },
  benefitRowCompact: {
    minHeight: 47,
    paddingLeft: 20,
    paddingRight: 18,
    gap: 16,
  },
  benefitIconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    color: '#111216',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  benefitTextCompact: {
    fontSize: 15.4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.064)',
  },
  planCard: {
    minHeight: 94,
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 17,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  planCardCompact: {
    minHeight: 76,
    marginTop: 12,
    borderRadius: 21,
    paddingHorizontal: 17,
    gap: 14,
  },
  planBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
  },
  planBadgeCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  planTextBlock: {
    flex: 1,
  },
  planName: {
    color: '#111216',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.64,
    lineHeight: 27,
  },
  planNameCompact: {
    fontSize: 19,
    lineHeight: 22,
  },
  price: {
    marginTop: 2,
    color: '#111216',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.52,
    lineHeight: 25,
  },
  priceCompact: {
    fontSize: 17,
    lineHeight: 20,
  },
  cancelText: {
    marginTop: 5,
    color: '#8b8d94',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.28,
  },
  cancelTextCompact: {
    marginTop: 3,
    fontSize: 13.5,
  },
  selectedOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.2,
    borderColor: '#111216',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOuterCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  selectedInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111216',
  },
  selectedInnerCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentPlanRow: {
    minHeight: 66,
    marginTop: 12,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 12,
  },
  currentPlanRowCompact: {
    minHeight: 53,
    marginTop: 9,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  currentPlanTextBlock: {
    flex: 1,
  },
  currentPlanText: {
    color: '#6c6f78',
    fontSize: 16.4,
    fontWeight: '500',
    letterSpacing: -0.36,
    lineHeight: 21,
  },
  currentPlanTextCompact: {
    fontSize: 14.6,
    lineHeight: 18,
  },
  currentPlanSubtext: {
    marginTop: 4,
    color: '#8b8d94',
    fontSize: 13.4,
    fontWeight: '400',
    letterSpacing: -0.22,
    lineHeight: 17,
  },
  currentPlanSubtextCompact: {
    marginTop: 1,
    fontSize: 12.2,
    lineHeight: 15,
  },
  actions: {
    gap: 13,
    marginTop: 16,
  },
  actionsCompact: {
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    height: 58,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  secondaryButton: {
    height: 58,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  actionButtonCompact: {
    height: 48,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  buttonTextCompact: {
    fontSize: 16,
  },
  privacyLine: {
    minHeight: 30,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  privacyLineCompact: {
    minHeight: 22,
    marginTop: 9,
    gap: 7,
  },
  privacyText: {
    color: '#747780',
    fontSize: 13.6,
    fontWeight: '400',
    letterSpacing: -0.22,
  },
  privacyTextCompact: {
    fontSize: 12.2,
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
