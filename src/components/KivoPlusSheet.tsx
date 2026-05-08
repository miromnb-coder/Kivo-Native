import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  open: boolean;
  onClose: () => void;
};

type ActionItem = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: string;
};

type ConnectorItem = {
  title: string;
  initial: string;
};

const actions: ActionItem[] = [
  { title: 'Add files', icon: 'folder-plus' },
  { title: 'Create image', icon: 'edit-3' },
  { title: 'Write draft', icon: 'file-text' },
  { title: 'Research deeply', icon: 'globe', badge: '5 left' },
  { title: 'Schedule task', icon: 'calendar' },
  { title: 'Connect tools', icon: 'plug' },
];

const connectors: ConnectorItem[] = [
  { title: 'Google Drive', initial: 'D' },
  { title: 'Gmail', initial: 'G' },
  { title: 'Google Calendar', initial: 'C' },
  { title: 'Outlook Calendar', initial: 'O' },
  { title: 'Outlook Mail', initial: 'M' },
];

export function KivoPlusSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  if (!open) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel="Close plus menu" style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { maxHeight: height * 0.79, paddingBottom: insets.bottom + 22 }]}> 
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scrollContent}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={styles.previewRow}>
            <PreviewTile large />
            <PreviewTile />
            <PreviewTile />
            <PreviewTile />
          </ScrollView>

          <View style={styles.actionsList}>
            {actions.map((item) => (
              <ActionRow key={item.title} item={item} onPress={item.title === 'Add files' ? onClose : undefined} />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.connectorsSection}>
            <Text style={styles.connectorsTitle}>Connectors</Text>
            <View style={styles.connectorsList}>
              {connectors.map((connector) => (
                <ConnectorRow key={connector.title} connector={connector} />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function PreviewTile({ large = false }: { large?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.previewTile, large ? styles.previewTileLarge : styles.previewTileWide, pressed && styles.pressed]}>
      {large ? <Feather name="camera" size={38} color="#5a5a5e" strokeWidth={2.15} /> : null}
    </Pressable>
  );
}

function ActionRow({ item, onPress }: { item: ActionItem; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressedRow]} onPress={onPress}>
      <View style={styles.actionIconWrap}>
        <Feather name={item.icon} size={24} color="#15161a" strokeWidth={1.75} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text numberOfLines={1} style={styles.actionTitle}>{item.title}</Text>
        {item.badge ? <Text style={styles.actionBadge}>{item.badge}</Text> : null}
      </View>
    </Pressable>
  );
}

function ConnectorRow({ connector }: { connector: ConnectorItem }) {
  return (
    <Pressable style={({ pressed }) => [styles.connectorRow, pressed && styles.pressedRow]}>
      <View style={styles.connectorIcon}>
        <Text style={styles.connectorInitial}>{connector.initial}</Text>
      </View>
      <Text numberOfLines={1} style={styles.connectorTitle}>{connector.title}</Text>
      <View style={styles.connectButton}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 90,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: '#fbfbfc',
    paddingHorizontal: 24,
    paddingTop: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 58,
    shadowOffset: { width: 0, height: -18 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.035)',
  },
  handleWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    marginBottom: 10,
  },
  handle: {
    width: 76,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#c4c4c9',
  },
  scrollContent: {
    paddingBottom: 2,
  },
  previewRow: {
    gap: 18,
    paddingHorizontal: 10,
    paddingBottom: 36,
    marginHorizontal: -10,
  },
  previewTile: {
    height: 98,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: '#f8f8f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTileLarge: {
    width: 98,
  },
  previewTileWide: {
    width: 112,
  },
  actionsList: {
    gap: 1,
  },
  actionRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTitle: {
    color: '#17181b',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: -0.8,
    lineHeight: 24,
  },
  actionBadge: {
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: '#ececf0',
    paddingHorizontal: 9,
    paddingVertical: 3,
    color: '#505157',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.39,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 22,
  },
  connectorsSection: {},
  connectorsTitle: {
    marginBottom: 12,
    color: '#6d6e76',
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: -0.76,
  },
  connectorsList: {
    gap: 8,
  },
  connectorRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  connectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#f1f1f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorInitial: {
    color: '#777982',
    fontSize: 12,
    fontWeight: '700',
  },
  connectorTitle: {
    flex: 1,
    minWidth: 0,
    color: '#24252a',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.63,
  },
  connectButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.035,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  connectButtonText: {
    color: '#202124',
    fontSize: 15.5,
    fontWeight: '500',
    letterSpacing: -0.46,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.84,
  },
  pressedRow: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
});
