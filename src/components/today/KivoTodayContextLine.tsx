import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  connectedSources?: string[];
  limited?: boolean;
};

export function KivoTodayContextLine({ connectedSources = ['Calendar', 'Mail', 'Drive'], limited = false }: Props) {
  const label = limited || connectedSources.length === 0
    ? 'Using Kivo memory and recent context'
    : `Using context from ${connectedSources.join(' · ')}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <Text numberOfLines={1} style={styles.text}>{label}</Text>
      {limited ? <Feather name="lock" size={11} color="#aaabb1" strokeWidth={1.8} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c7c8cd',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.075)',
  },
  text: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13.2,
    lineHeight: 18,
    letterSpacing: -0.28,
  },
});
