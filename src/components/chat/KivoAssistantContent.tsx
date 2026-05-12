import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

function renderInlineText(text: string, keyPrefix: string, style = styles.assistantText) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const isBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
    const value = isBold ? part.slice(2, -2) : part;

    return (
      <Text key={`${keyPrefix}-${index}`} style={[style, isBold && styles.assistantBold]}>
        {value}
      </Text>
    );
  });
}

export function KivoAssistantContent({ text }: { text: string }) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <View style={styles.assistantContent}>
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        if (heading) {
          return (
            <Text key={`heading-${index}`} style={styles.assistantHeading}>
              {renderInlineText(heading[1], `heading-${index}`, styles.assistantHeading)}
            </Text>
          );
        }

        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <View key={`bullet-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{renderInlineText(bullet[1], `bullet-${index}`, styles.bulletText)}</Text>
            </View>
          );
        }

        const number = line.match(/^(\d+)\.\s+(.+)$/);
        if (number) {
          return (
            <View key={`number-${index}`} style={styles.bulletRow}>
              <Text style={styles.numberDot}>{number[1]}.</Text>
              <Text style={styles.bulletText}>{renderInlineText(number[2], `number-${index}`, styles.bulletText)}</Text>
            </View>
          );
        }

        return (
          <Text key={`paragraph-${index}`} style={styles.assistantText}>
            {renderInlineText(line, `paragraph-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  assistantContent: {
    gap: 8,
  },
  assistantText: {
    color: colors.text,
    fontSize: 16.2,
    lineHeight: 23,
    letterSpacing: -0.32,
  },
  assistantBold: {
    color: '#111216',
    fontWeight: '700',
  },
  assistantHeading: {
    marginTop: 4,
    color: '#111216',
    fontSize: 17.5,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.48,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 14,
    color: '#111216',
    fontSize: 16.2,
    lineHeight: 23,
    fontWeight: '700',
  },
  numberDot: {
    minWidth: 24,
    color: '#111216',
    fontSize: 16.2,
    lineHeight: 23,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 16.2,
    lineHeight: 23,
    letterSpacing: -0.32,
  },
});
