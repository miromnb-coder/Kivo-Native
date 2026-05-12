import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  preferredName?: string | null;
  title?: string;
  subtitle?: string;
};

export function KivoTodayHero({ preferredName = 'Miro', title, subtitle }: Props) {
  const displayName = preferredName?.trim();
  const resolvedTitle = title ?? (displayName ? `Here’s your day, ${displayName}.` : 'Here’s your day.');

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.72}>
        {resolvedTitle}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle ?? 'Focus on what matters. I’ll handle the rest.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1.45,
  },
  subtitle: {
    marginTop: 6,
    color: '#676870',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.34,
  },
});
