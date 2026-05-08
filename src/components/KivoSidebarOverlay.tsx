import { Feather } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KivoNativeConversation = {
  id: string;
  title: string;
};

type Props = {
  visible: boolean;
  progress: Animated.Value;
  drawerWidth: number;
  conversations?: KivoNativeConversation[];
  activeConversationId?: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onOpenConversation?: (conversationId: string) => void;
  onGestureProgress: (progress: number) => void;
  onGestureEnd: (open: boolean) => void;
};

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type RecentItemProps = {
  title: string;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

const FALLBACK_RECENTS: KivoNativeConversation[] = [
  { id: 'fallback-email', title: 'Katso minun viimeisimmät sähköpo...' },
  { id: 'fallback-calendar', title: 'Lisää tapahtuma minun kalenteriin ...' },
  { id: 'fallback-tools', title: 'Mitä työkaluja pystyt käyttämään ja...' },
  { id: 'fallback-image-1', title: 'Mitä näet tässä kuvassa' },
  { id: 'fallback-image-2', title: 'Mitä näet tässä kuvassa' },
  { id: 'fallback-build', title: 'Miten voin tehdä oman sovelluksen' },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function KivoSidebarOverlay({
  visible,
  progress,
  drawerWidth,
  conversations = [],
  activeConversationId = null,
  onClose,
  onNewChat,
  onOpenConversation,
  onGestureProgress,
  onGestureEnd,
}: Props) {
  const insets = useSafeAreaInsets();
  const [actionConversation, setActionConversation] = useState<KivoNativeConversation | null>(null);
  const dragStartTimeRef = useRef(0);
  const dragModeRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');
  const recentItems = conversations.length ? conversations.slice(0, 12) : FALLBACK_RECENTS;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth - 34, 0],
  });

  function closeMenu() {
    setActionConversation(null);
    onClose();
  }

  function handleNewChat() {
    setActionConversation(null);
    onNewChat();
  }

  function handleOpenConversation(id: string) {
    if (id.startsWith('fallback-')) return;
    setActionConversation(null);
    onOpenConversation?.(id);
    onClose();
  }

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 9 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.08,
      onPanResponderGrant: () => {
        dragStartTimeRef.current = Date.now();
        dragModeRef.current = 'idle';
      },
      onPanResponderMove: (_, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        if (dragModeRef.current === 'idle') {
          if (absY > 10 && absY > absX * 1.1) {
            dragModeRef.current = 'vertical';
            return;
          }
          if (absX > 10 && absX > absY * 1.1) {
            dragModeRef.current = 'horizontal';
          }
        }

        if (dragModeRef.current !== 'horizontal') return;
        onGestureProgress(clamp(1 + gesture.dx / drawerWidth));
      },
      onPanResponderRelease: (_, gesture) => {
        const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
        const velocity = gesture.dx / elapsed;
        const nextProgress = clamp(1 + gesture.dx / drawerWidth);
        const shouldStayOpen = nextProgress > 0.72 && velocity > -0.45;
        dragModeRef.current = 'idle';
        onGestureEnd(shouldStayOpen);
      },
      onPanResponderTerminate: () => {
        dragModeRef.current = 'idle';
        onGestureEnd(true);
      },
    }),
    [drawerWidth, onGestureEnd, onGestureProgress],
  );

  if (!visible) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        onPress={closeMenu}
        style={[styles.closeArea, { left: drawerWidth }]}
        {...panResponder.panHandlers}
      />

      <Animated.View
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            paddingTop: insets.top,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.logo}>Kivo</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
            directionalLockEnabled
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.nav}>
              <MenuItem icon="home" label="Home" active onPress={closeMenu} />
              <MenuItem icon="calendar" label="Today" onPress={closeMenu} />
              <MenuItem icon="file-text" label="Library" onPress={closeMenu} />
            </View>

            <View style={styles.divider} />

            <View style={styles.recentList}>
              {recentItems.map((item) => (
                <RecentItem
                  key={item.id}
                  title={item.title}
                  active={activeConversationId === item.id}
                  onPress={() => handleOpenConversation(item.id)}
                  onLongPress={() => {
                    if (item.id.startsWith('fallback-')) return;
                    setActionConversation(item);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable style={({ pressed }) => [styles.profilePill, pressed && styles.pressed]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <Text numberOfLines={1} style={styles.profileName}>Miro</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={handleNewChat}
              style={({ pressed }) => [styles.composeButton, pressed && styles.composePressed]}
            >
              <Feather name="edit-3" size={24} color="#111113" strokeWidth={1.85} />
            </Pressable>
          </View>
        </View>

        <View pointerEvents="box-only" style={styles.drawerGestureEdge} {...panResponder.panHandlers} />
      </Animated.View>

      {actionConversation ? (
        <ConversationActionSheet conversation={actionConversation} bottomInset={insets.bottom} onClose={() => setActionConversation(null)} />
      ) : null}
    </View>
  );
}

function MenuItem({ icon, label, active = false, onPress }: MenuItemProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, active && styles.menuItemActive, pressed && styles.pressedRow]}>
      <View style={styles.menuIconWrap}>
        <Feather name={icon} size={28} color="#222329" strokeWidth={1.75} />
      </View>
      <Text numberOfLines={1} style={styles.menuLabel}>{label}</Text>
    </Pressable>
  );
}

function RecentItem({ title, active = false, onPress, onLongPress }: RecentItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={440}
      style={({ pressed }) => [styles.recentItem, active && styles.recentItemActive, pressed && styles.pressedRow]}
    >
      <Text numberOfLines={1} style={styles.recentText}>{title}</Text>
    </Pressable>
  );
}

function ConversationActionSheet({ conversation, bottomInset, onClose }: { conversation: KivoNativeConversation; bottomInset: number; onClose: () => void }) {
  return (
    <View style={[styles.actionLayer, { paddingBottom: bottomInset + 18 }]}> 
      <Pressable style={styles.actionBackdrop} onPress={onClose} />
      <View style={styles.actionSheet}>
        <Text numberOfLines={1} style={styles.actionTitle}>{conversation.title || 'Untitled conversation'}</Text>
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressedRow]}>
          <Feather name="edit-3" size={20} color="#17181b" strokeWidth={1.9} />
          <Text style={styles.actionButtonText}>Rename</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressedRow]}>
          <Feather name="trash-2" size={20} color="#d33a32" strokeWidth={1.9} />
          <Text style={[styles.actionButtonText, styles.deleteText]}>Delete conversation</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressedRow]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 72,
    overflow: 'hidden',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.035)',
    backgroundColor: '#f4f4f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.042,
    shadowRadius: 44,
    shadowOffset: { width: 12, height: 0 },
  },
  drawerGestureEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 28,
    backgroundColor: 'transparent',
  },
  inner: {
    flex: 1,
    backgroundColor: '#f4f4f6',
  },
  header: {
    height: 56,
    justifyContent: 'flex-end',
    paddingHorizontal: 36,
    paddingBottom: 7,
  },
  logo: {
    color: '#111113',
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -1.8,
    lineHeight: 34,
  },
  scrollContent: {
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 42,
  },
  nav: {
    gap: 18,
  },
  menuItem: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 8,
  },
  menuItemActive: {
    backgroundColor: 'transparent',
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    color: '#1b1c20',
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: -0.67,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 34,
  },
  recentList: {
    gap: 6,
  },
  recentItem: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  recentItemActive: {
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  recentText: {
    color: '#2b2c31',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 19.2,
  },
  footer: {
    paddingHorizontal: 36,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: '#f4f4f6',
  },
  profilePill: {
    width: 138,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.018)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  profileName: {
    flex: 1,
    color: '#151518',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.68,
  },
  composeButton: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.018)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },
  composePressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.84,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.86,
  },
  pressedRow: {
    transform: [{ scale: 0.995 }],
    opacity: 0.72,
  },
  actionLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 110,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  actionBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheet: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#fbfbfc',
    padding: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 22 },
  },
  actionTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    color: '#777982',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.28,
  },
  actionButton: {
    height: 54,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionButtonText: {
    color: '#17181b',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.6,
  },
  deleteText: {
    color: '#d33a32',
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cancelButton: {
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#17181b',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.6,
  },
});
