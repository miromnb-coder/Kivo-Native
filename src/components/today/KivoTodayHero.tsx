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
      <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={0.82}>
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
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -2.05,
  },
  subtitle: {
    marginTop: 8,
    color: '#676870',
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: -0.42,
  },
});
