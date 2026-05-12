import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { KivoSectionIconBadge } from './KivoSectionIconBadge';

type SectionTone = 'focus' | 'time' | 'notice' | 'assist' | 'context';

type Props = {
  tone: SectionTone;
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  children: ReactNode;
  showDivider?: boolean;
};

export function KivoTodaySection({ tone, title, icon, children, showDivider = true }: Props) {
  return (
    <View style={[styles.section, showDivider && styles.divider]}>
      <View style={styles.badgeColumn}>
        <KivoSectionIconBadge tone={tone} icon={icon} compact />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

export function KivoTodayBodyText({ children }: { children: ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

export function KivoTodayBullet({ children, icon = 'check' }: { children: ReactNode; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIcon}>
        <Feather name={icon} size={8.8} color="#ffffff" strokeWidth={2.35} />
      </View>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function KivoTodayActionLine({ children, icon }: { children: ReactNode; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.actionRow}>
      <Feather name={icon} size={12} color="#777980" strokeWidth={1.8} />
      <Text style={styles.actionText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingBottom: 19,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  badgeColumn: {
    width: 50,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 17.2,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.62,
  },
  body: {
    marginTop: 10,
    gap: 5,
  },
  bodyText: {
    color: '#3d3e45',
    fontSize: 14.9,
    lineHeight: 22,
    letterSpacing: -0.35,
  },
  bulletRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  bulletIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b9bac0',
  },
  bulletText: {
    flex: 1,
    color: '#3d3e45',
    fontSize: 14.2,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  actionRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionText: {
    flex: 1,
    color: '#3d3e45',
    fontSize: 14.1,
    lineHeight: 20,
    letterSpacing: -0.29,
  },
});
