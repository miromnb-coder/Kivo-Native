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
  return <Text style={styles.bodyText} numberOfLines={2}>{children}</Text>;
}

export function KivoTodayBullet({ children, icon = 'check' }: { children: ReactNode; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIcon}>
        <Feather name={icon} size={8.2} color="#ffffff" strokeWidth={2.35} />
      </View>
      <Text style={styles.bulletText} numberOfLines={1}>{children}</Text>
    </View>
  );
}

export function KivoTodayActionLine({ children, icon }: { children: ReactNode; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.actionRow}>
      <Feather name={icon} size={11.2} color="#777980" strokeWidth={1.8} />
      <Text style={styles.actionText} numberOfLines={1}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    paddingTop: 13,
    paddingBottom: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  badgeColumn: {
    width: 40,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 15.8,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  body: {
    marginTop: 6,
    gap: 2,
  },
  bodyText: {
    color: '#3d3e45',
    fontSize: 13.7,
    lineHeight: 18.5,
    letterSpacing: -0.28,
  },
  bulletRow: {
    minHeight: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bulletIcon: {
    width: 12.5,
    height: 12.5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b9bac0',
  },
  bulletText: {
    flex: 1,
    color: '#3d3e45',
    fontSize: 13.1,
    lineHeight: 17,
    letterSpacing: -0.24,
  },
  actionRow: {
    minHeight: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    flex: 1,
    color: '#3d3e45',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.23,
  },
});
