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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={onOpenMenu}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressedMenu]}
      >
        <View style={styles.menuIcon}>
          <View style={styles.menuLineLarge} />
          <View style={styles.menuLineSmall} />
        </View>
      </Pressable>

      <View pointerEvents="box-none" style={styles.centerSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Kivo selector"
          onPress={onOpenModes}
          style={({ pressed }) => [styles.kivoPill, pressed && styles.pressedPill]}
        >
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.kivoText}>Kivo</Text>
          <View style={styles.chevronCircle}>
            <Feather name="chevron-down" size={12} color="#19191c" strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open quick actions"
        onPress={onOpenMore}
        style={({ pressed }) => [styles.iconButton, pressed && styles.morePressed]}
      >
        <Feather name="more-horizontal" size={27} color={colors.text} strokeWidth={2.75} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    height: 54,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  centerSlot: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    zIndex: 3,
  },
  pressedMenu: {
    transform: [{ scale: 0.96 }],
    opacity: 0.84,
  },
  pressedPill: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  morePressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  menuIcon: {
    width: 22,
    height: 11,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuLineLarge: {
    width: 22,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  menuLineSmall: {
    width: 15,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  kivoPill: {
    height: 40,
    minWidth: 108,
    paddingLeft: 15,
    paddingRight: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.045,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
  },
  sparkle: {
    fontSize: 9.5,
    color: '#7b8088',
    lineHeight: 10,
  },
  kivoText: {
    color: colors.text,
    fontSize: 18.5,
    fontWeight: '600',
    letterSpacing: -1.02,
    lineHeight: 22,
  },
  chevronCircle: {
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: '#f3f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
