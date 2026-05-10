import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

function BenefitList() {
  return (
    <View style={styles.benefitCard}>
      {benefits.map((benefit, index) => (
        <Pressable
          key={benefit.label}
          accessibilityRole="button"
          accessibilityLabel={benefit.label}
          style={({ pressed }) => [styles.benefitRow, index < benefits.length - 1 && styles.rowBorder, pressed && styles.pressed]}
        >
          <View style={styles.benefitIconSlot}>
            <Feather name={benefit.icon} size={25} color="#111216" strokeWidth={1.78} />
          </View>
          <Text numberOfLines={1} style={styles.benefitText}>{benefit.label}</Text>
          <Feather name="chevron-right" size={24} color="#8f9097" strokeWidth={1.9} />
        </Pressable>
      ))}
    </View>
  );
}

export function KivoUpgradeScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 18) }]}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={30} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={styles.title}>Upgrade to Plus</Text>
            <Text numberOfLines={1} style={styles.subtitle}>Unlock more daily operator usage.</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroArcOne} />
          <View style={styles.heroArcTwo} />
          <View style={styles.heroArcThree} />
          <Feather name="star" size={30} color="#ffffff" strokeWidth={1.9} style={styles.heroStar} />
          <Text style={styles.heroTitle}>Kivo Plus</Text>
          <Text style={styles.heroSubtitle}>500 daily credits.</Text>
          <Text style={styles.heroSubtitle}>More power for every day.</Text>
        </View>

        <Text style={styles.sectionLabel}>EVERYTHING IN FREE, PLUS:</Text>
        <BenefitList />

        <View style={styles.planCard}>
          <View style={styles.planBadge}>
            <Feather name="star" size={26} color="#ffffff" strokeWidth={1.75} />
          </View>
          <View style={styles.planTextBlock}>
            <Text style={styles.planName}>Plus</Text>
            <Text style={styles.price}>€12/month</Text>
            <Text style={styles.cancelText}>Cancel anytime</Text>
          </View>
          <View style={styles.selectedOuter}>
            <View style={styles.selectedInner} />
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Current plan Free" style={({ pressed }) => [styles.currentPlanRow, pressed && styles.pressed]}>
          <View style={styles.currentPlanTextBlock}>
            <Text numberOfLines={1} style={styles.currentPlanText}>Current plan: Free · 50 daily credits</Text>
            <Text numberOfLines={1} style={styles.currentPlanSubtext}>Credits reset every day.</Text>
          </View>
          <Feather name="chevron-right" size={23} color="#8f9097" strokeWidth={1.85} />
        </Pressable>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Upgrade to Plus" style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>Upgrade to Plus</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Maybe later" onPress={onBack} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </Pressable>
        </View>

        <View style={styles.privacyLine}>
          <Feather name="shield" size={17} color="#8d9098" strokeWidth={1.75} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.privacyText}>Private by design. Your data stays in your control.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 185,
    backgroundColor: '#f5f5f6',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    color: '#111216',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.88,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 9,
    color: '#737680',
    fontSize: 17.5,
    fontWeight: '400',
    letterSpacing: -0.36,
    lineHeight: 22,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 58,
    height: 58,
  },
  heroCard: {
    height: 154,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: '#111216',
    paddingHorizontal: 23,
    paddingVertical: 25,
    shadowColor: '#0f172a',
    shadowOpacity: 0.11,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
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
    top: 27,
    right: 30,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.1,
    lineHeight: 40,
  },
  heroSubtitle: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.42,
    lineHeight: 24,
  },
  sectionLabel: {
    marginTop: 26,
    marginLeft: 10,
    marginBottom: 14,
    color: '#747780',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.05,
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
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 22,
    gap: 19,
  },
  benefitIconSlot: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    color: '#111216',
    fontSize: 17.5,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.064)',
  },
  planCard: {
    minHeight: 102,
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  planBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
  },
  planTextBlock: {
    flex: 1,
  },
  planName: {
    color: '#111216',
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.68,
    lineHeight: 28,
  },
  price: {
    marginTop: 3,
    color: '#111216',
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: -0.56,
    lineHeight: 26,
  },
  cancelText: {
    marginTop: 6,
    color: '#8b8d94',
    fontSize: 15.5,
    fontWeight: '400',
    letterSpacing: -0.28,
  },
  selectedOuter: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    borderWidth: 2.2,
    borderColor: '#111216',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInner: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#111216',
  },
  currentPlanRow: {
    minHeight: 72,
    marginTop: 13,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 19,
    gap: 12,
  },
  currentPlanTextBlock: {
    flex: 1,
  },
  currentPlanText: {
    color: '#6c6f78',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  currentPlanSubtext: {
    marginTop: 5,
    color: '#8b8d94',
    fontSize: 13.8,
    fontWeight: '400',
    letterSpacing: -0.22,
    lineHeight: 18,
  },
  actions: {
    gap: 14,
    marginTop: 18,
  },
  primaryButton: {
    height: 62,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050507',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryButton: {
    height: 62,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  secondaryButtonText: {
    color: '#111216',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  privacyLine: {
    minHeight: 32,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  privacyText: {
    color: '#747780',
    fontSize: 13.8,
    fontWeight: '400',
    letterSpacing: -0.22,
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
