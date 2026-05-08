import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  onOpenMenu?: () => void;
  onOpenModes?: () => void;
  onOpenMore?: () => void;
};

export function KivoTopBar({ onOpenMenu, onOpenModes, onOpenMore }: Props) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onOpenMenu} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <View style={styles.menuIcon}>
          <View style={styles.menuLineLarge} />
          <View style={styles.menuLineSmall} />
        </View>
      </Pressable>

      <Pressable onPress={onOpenModes} style={({ pressed }) => [styles.kivoPill, pressed && styles.pressed]}>
        <Text style={styles.sparkle}>✦</Text>
        <Text style={styles.kivoText}>Kivo</Text>
        <View style={styles.chevronCircle}>
          <Feather name="chevron-down" size={13} color={colors.text} strokeWidth={2.5} />
        </View>
      </Pressable>

      <Pressable onPress={onOpenMore} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <Feather name="more-horizontal" size={28} color={colors.text} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
  menuIcon: {
    width: 22,
    gap: 7,
    alignItems: 'flex-start',
  },
  menuLineLarge: {
    width: 22,
    height: 2,
    borderRadius: 99,
    backgroundColor: colors.text,
  },
  menuLineSmall: {
    width: 15,
    height: 2,
    borderRadius: 99,
    backgroundColor: colors.text,
  },
  kivoPill: {
    position: 'absolute',
    left: '50%',
    top: -4,
    height: 40,
    paddingLeft: 15,
    paddingRight: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.045,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    transform: [{ translateX: -54 }],
  },
  sparkle: {
    fontSize: 9.5,
    color: '#7b8088',
    lineHeight: 10,
  },
  kivoText: {
    color: colors.text,
    fontSize: 18.5,
    fontWeight: '700',
    letterSpacing: -1,
  },
  chevronCircle: {
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
