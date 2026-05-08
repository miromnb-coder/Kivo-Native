import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type NativeConnector = {
  title: string;
  iconUri: string;
  description: string;
  category: string;
  features: string;
};

type Props = {
  connector: NativeConnector;
  topInset: number;
  bottomInset: number;
  onBack: () => void;
};

export function KivoConnectorDetailView({ connector, topInset, bottomInset, onBack }: Props) {
  return (
    <View style={[styles.layer, { paddingTop: topInset + 10, paddingBottom: bottomInset + 18 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.headerButton, styles.leftButton, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={31} color="#111113" strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Apps</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Share" style={({ pressed }) => [styles.headerButton, styles.rightButton, pressed && styles.pressed]}>
          <Feather name="share" size={24} color="#111113" strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.iconShell}>
            <Image source={{ uri: connector.iconUri }} style={styles.heroIcon} resizeMode="contain" />
          </View>
          <View style={styles.titleBlock}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{connector.title}</Text>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Connect</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.description}>{connector.description}</Text>

        <View>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.table}>
            <DetailRow label="Category" value={connector.category} first />
            <DetailRow label="Features" value={connector.features} />
            <DetailRow label="Developer" value="Kivo" />
            <DetailRow label="Website" external />
            <DetailRow label="Privacy Policy" external />
            <DetailRow label="Terms of Service" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, external = false, first = false }: { label: string; value?: string; external?: boolean; first?: boolean }) {
  return (
    <View style={[styles.row, first && styles.firstRow]}>
      <Text numberOfLines={1} style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        {external ? <Feather name="external-link" size={17} color="#15161a" strokeWidth={2} /> : <Text numberOfLines={1} style={styles.rowValue}>{value}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 140,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
  },
  header: {
    position: 'relative',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  headerButton: {
    position: 'absolute',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: { left: 0 },
  rightButton: { right: 0 },
  headerTitle: {
    color: '#111113',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginBottom: 30,
  },
  iconShell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    marginBottom: 16,
    color: '#111113',
    fontSize: 31,
    fontWeight: '600',
    letterSpacing: -1.7,
    lineHeight: 34,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    height: 42,
    borderRadius: 999,
    backgroundColor: '#000000',
    paddingHorizontal: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.56,
  },
  description: {
    maxWidth: 360,
    marginBottom: 42,
    color: '#5c5d64',
    fontSize: 19,
    lineHeight: 27.5,
    letterSpacing: -0.86,
  },
  sectionTitle: {
    marginBottom: 24,
    color: '#111113',
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -1.15,
  },
  table: {
    overflow: 'hidden',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  row: {
    minHeight: 54,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstRow: {
    borderTopWidth: 0,
  },
  rowLabel: {
    flex: 1,
    color: '#8b8c92',
    fontSize: 16,
    letterSpacing: -0.56,
  },
  rowValueWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rowValue: {
    color: '#15161a',
    fontSize: 16,
    letterSpacing: -0.56,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.84,
  },
});
