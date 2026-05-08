import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KivoNativeConversation = {
  id: string;
  title: string;
};

type Props = {
  open: boolean;
  conversations?: KivoNativeConversation[];
  activeConversationId?: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onOpenConversation?: (conversationId: string) => void;
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

const ANIMATION_MS = 320;
const FALLBACK_RECENTS: KivoNativeConversation[] = [
  { id: 'fallback-email', title: 'Katso minun viimeisimmät sähköpo...' },
  { id: 'fallback-calendar', title: 'Lisää tapahtuma minun kalenteriin ...' },
  { id: 'fallback-tools', title: 'Mitä työkaluja pystyt käyttämään ja...' },
  { id: 'fallback-image-1', title: 'Mitä näet tässä kuvassa' },
  { id: 'fallback-image-2', title: 'Mitä näet tässä kuvassa' },
  { id: 'fallback-build', title: 'Miten voin tehdä oman sovelluksen' },
];

function triggerHaptic(type: 'open' | 'close' | 'action') {
  try {
    Vibration.vibrate(type === 'open' ? [8, 18, 8] : type === 'action' ? 12 : 10);
  } catch {
    // Ignore safely on platforms where vibration is unavailable.
  }
}

export function KivoSidebarOverlay({ open, conversations = [], activeConversationId = null, onClose, onNewChat, onOpenConversation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 370);
  const closedX = -drawerWidth - 34;
  const [isPresent, setIsPresent] = useState(open);
  const [actionConversation, setActionConversation] = useState<KivoNativeConversation | null>(null);
  const translateX = useRef(new Animated.Value(closedX)).current;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const dragModeRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');

  const recentItems = conversations.length ? conversations.slice(0, 12) : FALLBACK_RECENTS;

  function animateTo(toValue: number, callback?: () => void) {
    Animated.timing(translateX, {
      toValue,
      duration: ANIMATION_MS,
      easing: undefined,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) callback?.();
    });
  }

  function closeWithMotion() {
    if (!open) return;
    triggerHaptic('close');
    setActionConversation(null);
    animateTo(closedX);
    onClose();
  }

  function handleNewChat() {
    triggerHaptic('close');
    onNewChat();
    closeWithMotion();
  }

  function handleOpenConversation(id: string) {
    if (id.startsWith('fallback-')) return;
    triggerHaptic('close');
    onOpenConversation?.(id);
    closeWithMotion();
  }

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
      onPanResponderGrant: (_, gesture) => {
        dragStartXRef.current = gesture.x0;
        dragStartYRef.current = gesture.y0;
        dragStartTimeRef.current = Date.now();
        dragModeRef.current = 'idle';
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        const deltaX = gesture.moveX - dragStartXRef.current;
        const deltaY = gesture.moveY - dragStartYRef.current;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (dragModeRef.current === 'idle') {
          if (absY > 10 && absY > absX * 1.12) {
            dragModeRef.current = 'vertical';
            translateX.setValue(0);
            return;
          }

          if (deltaX < -10 && absX > absY * 1.18) {
            dragModeRef.current = 'horizontal';
          }
        }

        if (dragModeRef.current !== 'horizontal') return;
        translateX.setValue(Math.min(0, Math.max(closedX, deltaX)));
      },
      onPanResponderRelease: (_, gesture) => {
        const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
        const velocity = gesture.dx / elapsed;
        const shouldClose = dragModeRef.current === 'horizontal' && (gesture.dx < -72 || velocity < -0.55);
        dragModeRef.current = 'idle';

        if (shouldClose) {
          closeWithMotion();
          return;
        }

        animateTo(0);
      },
      onPanResponderTerminate: () => animateTo(0),
    }),
    [closedX, open, translateX],
  );

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsPresent(true);
      setActionConversation(null);
      translateX.setValue(closedX);
      triggerHaptic('open');
      requestAnimationFrame(() => animateTo(0));
      return;
    }

    if (!isPresent) return;
    setActionConversation(null);
    animateTo(closedX);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsPresent(false);
    }, ANIMATION_MS + 20);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [closedX, isPresent, open, translateX]);

  if (!isPresent && !open) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        onPress={closeWithMotion}
        style={[styles.closeArea, { left: drawerWidth }]}
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
        {...panResponder.panHandlers}
      >
        <View style={styles.drawerGradient} pointerEvents="none" />

        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.logo}>Kivo</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.nav}>
              <MenuItem icon="home" label="Home" active onPress={closeWithMotion} />
              <MenuItem icon="calendar" label="Today" onPress={closeWithMotion} />
              <MenuItem icon="file-text" label="Library" onPress={closeWithMotion} />
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
                    triggerHaptic('action');
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
      </Animated.View>

      {actionConversation ? (
        <ConversationActionSheet
          conversation={actionConversation}
          bottomInset={insets.bottom}
          onClose={() => setActionConversation(null)}
        />
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
    backgroundColor: 'rgba(243,243,245,0.98)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 42,
    shadowOffset: { width: 12, height: 0 },
  },
  drawerGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  inner: {
    flex: 1,
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
    paddingBottom: 22,
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
