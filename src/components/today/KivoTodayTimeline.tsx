import { StyleSheet, Text, View } from 'react-native';

type TimelineItem = {
  time: string;
  title: string;
};

type Props = {
  items?: TimelineItem[];
};

const defaultItems: TimelineItem[] = [
  { time: '9:30', title: 'Design review' },
  { time: '12:00', title: 'Inbox reset' },
  { time: '15:00', title: 'Deep work block' },
];

export function KivoTodayTimeline({ items = defaultItems }: Props) {
  return (
    <View style={styles.timeline}>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        {items.map((item, index) => (
          <View key={`${item.time}-${index}`} style={[styles.railDot, index > 0 && styles.railDotSpacing]} />
        ))}
      </View>
      <View style={styles.items}>
        {items.map((item, index) => (
          <View key={`${item.time}-${item.title}-${index}`} style={styles.itemRow}>
            <Text style={styles.time}>{item.time}</Text>
            <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    flexDirection: 'row',
    paddingTop: 0,
  },
  rail: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
  },
  railLine: {
    position: 'absolute',
    top: 8,
    bottom: 9,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#d2d3d8',
  },
  railDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c3c4ca',
  },
  railDotSpacing: {
    marginTop: 20,
  },
  items: {
    flex: 1,
    gap: 11,
  },
  itemRow: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  time: {
    width: 52,
    color: '#777880',
    fontSize: 14.4,
    letterSpacing: -0.34,
  },
  title: {
    flex: 1,
    color: '#303137',
    fontSize: 14.4,
    letterSpacing: -0.33,
  },
});
