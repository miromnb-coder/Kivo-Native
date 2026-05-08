import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

export function KivoNativeStarterScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}> 
      <View style={styles.card}>
        <Text style={styles.kicker}>Kivo Native</Text>
        <Text style={styles.title}>Native shell ready</Text>
        <Text style={styles.body}>
          This is the first clean Expo + React Native foundation. The visual UI will be built next from the Kivo reference design.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1.2,
    marginBottom: 10,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.25,
  },
});
