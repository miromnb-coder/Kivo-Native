import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

type BadgeTone = 'focus' | 'time' | 'notice' | 'assist' | 'context';

const iconByTone: Record<BadgeTone, keyof typeof Feather.glyphMap> = {
  focus: 'target',
  time: 'clock',
  notice: 'bell',
  assist: 'star',
  context: 'circle',
};

type Props = {
  tone: BadgeTone;
  icon?: keyof typeof Feather.glyphMap;
  compact?: boolean;
};

export function KivoSectionIconBadge({ tone, icon, compact = false }: Props) {
  return (
    <View style={[styles.badge, compact && styles.compactBadge]}>
      <Feather name={icon ?? iconByTone[tone]} size={compact ? 13 : 16} color="#74757c" strokeWidth={1.85} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#111827',
    shadowOpacity: 0.026,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  compactBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.28)',
    shadowOpacity: 0,
  },
});
