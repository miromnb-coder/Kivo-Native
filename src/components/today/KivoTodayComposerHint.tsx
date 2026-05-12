import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function KivoTodayComposerHint({ text = 'What would you like to focus on first?' }: { text?: string }) {
  return (
    <View style={styles.wrap}>
      <Feather name="star" size={13} color="#9d9ea5" strokeWidth={1.75} />
      <Text numberOfLines={1} style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 22,
    paddingLeft: 58,
  },
  text: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13.6,
    lineHeight: 19,
    letterSpacing: -0.25,
  },
});
