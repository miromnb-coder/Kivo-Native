import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteKivoConversation, renameKivoConversation } from '../lib/kivo-history';
import { KivoAccountSheet } from './KivoAccountSheet';

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
  onRenameConversation?: (conversationId: string, title: string) => Promise<void> | void;
  onDeleteConversation?: (conversationId: string) => Promise<void> | void;
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

const SIDEBAR_BACKGROUND = '#f4f4f6';

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
  onRenameConversation,
  onDeleteConversation,
  onGestureProgress,
  onGestureEnd,
}: Props) {
  const insets = useSafeAreaInsets();
  const [sidebarConversations, setSidebarConversations] = useState<KivoNativeConversation[]>(conversations);
  const [actionConversation, setActionConversation] = useState<KivoNativeConversation | null>(null);
  const [renamingConversation, setRenamingConversation] = useState<KivoNativeConversation | null>(null);
  const [deleteConversation, setDeleteConversation] = useState<KivoNativeConversation | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const dragStartTimeRef = useRef(0);
  const dragModeRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');
  const recentItems = sidebarConversations.slice(0, 18);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth - 34, 0],
  });

  useEffect(() => {
    setSidebarConversations(conversations);
  }, [conversations]);

  function closeMenu() {
    setActionConversation(null);
    setRenamingConversation(null);
    setDeleteConversation(null);
    setAccountSheetOpen(false);
    onClose();
  }

  function handleNewChat() {
    setActionConversation(null);
    setRenamingConversation(null);
    setDeleteConversation(null);
    setAccountSheetOpen(false);
    onNewChat();
  }

  function handleOpenConversation(id: string) {
    setActionConversation(null);
    setRenamingConversation(null);
    setDeleteConversation(null);
    setAccountSheetOpen(false);
    onOpenConversation?.(id);
    onClose();
  }

  async function handleRenameConversation(conversationId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setSidebarConversations((current) => current.map((item) => (item.id === conversationId ? { ...item, title: cleanTitle } : item)));

    if (onRenameConversation) {
      await onRenameConversation(conversationId, cleanTitle);
      return;
    }

    await renameKivoConversation(conversationId, cleanTitle);
  }

  async function handleDeleteConversation(conversationId: string) {
    setSidebarConversations((current) => current.filter((item) => item.id !== conversationId));

    if (onDeleteConversation) {
      await onDeleteConversation(conversationId);
    } else {
      await deleteKivoConversation(conversationId);
    }

    if (conversationId === activeConversationId) {
      onNewChat();
    }
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
              <MenuItem icon="home" label="Home" active={!activeConversationId} onPress={closeMenu} />
              <MenuItem icon="calendar" label="Today" onPress={closeMenu} />
              <MenuItem icon="file-text" label="Library" onPress={closeMenu} />
            </View>

            <View style={styles.divider} />

            <View style={styles.projectsSection}>
              <Text style={styles.sectionLabel}>Projects</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create new project"
                onPress={handleNewChat}
                style={({ pressed }) => [styles.projectButton, pressed && styles.pressedRow]}
              >
                <Feather name="folder-plus" size={25} color="#191a1f" strokeWidth={1.85} />
                <Text numberOfLines={1} style={styles.projectButtonText}>New project</Text>
              </Pressable>
            </View>

            <View style={styles.dividerTight} />

            <View style={styles.recentList}>
              <Text style={styles.sectionLabel}>Recent</Text>
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <RecentItem
                    key={item.id}
                    title={item.title}
                    active={activeConversationId === item.id}
                    onPress={() => handleOpenConversation(item.id)}
                    onLongPress={() => setActionConversation(item)}
                  />
                ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptyText}>Your chats will appear here after the first message.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(22, insets.bottom + 22) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open account menu"
              onPress={() => setAccountSheetOpen(true)}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
            >
              <Text style={styles.avatarText}>M</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={handleNewChat}
              style={({ pressed }) => [styles.composeButton, pressed && styles.composePressed]}
            >
              <Feather name="edit-3" size={24} color="#ffffff" strokeWidth={1.85} />
            </Pressable>
          </View>
        </View>

        <View pointerEvents="box-only" style={styles.drawerGestureEdge} {...panResponder.panHandlers} />
      </Animated.View>

      <KivoAccountSheet visible={accountSheetOpen} onClose={() => setAccountSheetOpen(false)} />

      {actionConversation ? (
        <ConversationActionSheet
          conversation={actionConversation}
          bottomInset={insets.bottom}
          onClose={() => setActionConversation(null)}
          onRename={() => {
            setRenamingConversation(actionConversation);
            setActionConversation(null);
          }}
          onDelete={() => {
            setDeleteConversation(actionConversation);
            setActionConversation(null);
          }}
        />
      ) : null}

      {renamingConversation ? (
        <RenameConversationSheet
          conversation={renamingConversation}
          bottomInset={insets.bottom}
          onClose={() => setRenamingConversation(null)}
          onSave={async (title) => {
            await handleRenameConversation(renamingConversation.id, title);
            setRenamingConversation(null);
          }}
        />
      ) : null}

      {deleteConversation ? (
        <DeleteConversationSheet
          conversation={deleteConversation}
          bottomInset={insets.bottom}
          onClose={() => setDeleteConversation(null)}
          onDelete={async () => {
            await handleDeleteConversation(deleteConversation.id);
            setDeleteConversation(null);
          }}
        />
      ) : null}
    </View>
  );
}

function MenuItem({ icon, label, active = false, onPress }: MenuItemProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, active && styles.menuItemActive, pressed && styles.pressedRow]}>
      <View style={styles.menuIconWrap}>
        <Feather name={icon} size={23} color="#222329" strokeWidth={1.75} />
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
      <Feather name="message-square" size={21} color="#222329" strokeWidth={1.75} />
      <Text numberOfLines={1} style={styles.recentText}>{title}</Text>
      <Feather name="chevron-right" size={21} color="#8f9097" strokeWidth={1.9} />
    </Pressable>
  );
}

function ActionSurface({ children, bottomInset }: { children: React.ReactNode; bottomInset: number }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={10}
      style={[styles.actionLayer, { paddingBottom: bottomInset + 18 }]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

function ConversationActionSheet({
  conversation,
  bottomInset,
  onClose,
  onRename,
  onDelete,
}: {
  conversation: KivoNativeConversation;
  bottomInset: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <ActionSurface bottomInset={bottomInset}>
      <Pressable style={styles.actionBackdrop} onPress={onClose} />
      <View style={styles.actionSheet}>
        <Text numberOfLines={1} style={styles.actionTitle}>{conversation.title || 'Untitled conversation'}</Text>
        <Pressable onPress={onRename} style={({ pressed }) => [styles.actionButton, pressed && styles.pressedRow]}>
          <Feather name="edit-3" size={20} color="#17181b" strokeWidth={1.9} />
          <Text style={styles.actionButtonText}>Rename</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={({ pressed }) => [styles.actionButton, pressed && styles.pressedRow]}>
          <Feather name="trash-2" size={20} color="#d33a32" strokeWidth={1.9} />
          <Text style={[styles.actionButtonText, styles.deleteText]}>Delete conversation</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressedRow]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </ActionSurface>
  );
}

function RenameConversationSheet({
  conversation,
  bottomInset,
  onClose,
  onSave,
}: {
  conversation: KivoNativeConversation;
  bottomInset: number;
  onClose: () => void;
  onSave: (title: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(conversation.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const canSave = title.trim().length > 0 && title.trim() !== conversation.title.trim();

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(timer);
  }, []);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    Keyboard.dismiss();
    await onSave(title.trim());
    setSaving(false);
  }

  return (
    <ActionSurface bottomInset={bottomInset}>
      <Pressable style={styles.actionBackdrop} onPress={onClose} />
      <View style={styles.renameSheet}>
        <Text style={styles.actionTitle}>Rename conversation</Text>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          placeholder="Conversation title"
          placeholderTextColor="#a3a4aa"
          returnKeyType="done"
          onSubmitEditing={save}
          selectionColor="#111113"
          autoCorrect={false}
          style={styles.renameInput}
        />
        <View style={styles.renameActions}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.renameButton, styles.renameButtonGhost, pressed && styles.pressedRow]}>
            <Text style={styles.renameCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={!canSave || saving}
            style={({ pressed }) => [styles.renameButton, styles.renameButtonPrimary, (!canSave || saving) && styles.disabledButton, pressed && canSave && !saving && styles.pressedRow]}
          >
            <Text style={styles.renameSaveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    </ActionSurface>
  );
}

function DeleteConversationSheet({
  conversation,
  bottomInset,
  onClose,
  onDelete,
}: {
  conversation: KivoNativeConversation;
  bottomInset: number;
  onClose: () => void;
  onDelete: () => Promise<void> | void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <ActionSurface bottomInset={bottomInset}>
      <Pressable style={styles.actionBackdrop} onPress={onClose} />
      <View style={styles.actionSheet}>
        <Text style={styles.actionTitle}>Delete conversation?</Text>
        <Text numberOfLines={2} style={styles.deleteDescription}>{conversation.title}</Text>
        <Pressable onPress={remove} disabled={deleting} style={({ pressed }) => [styles.actionButton, deleting && styles.disabledButton, pressed && !deleting && styles.pressedRow]}>
          <Feather name="trash-2" size={20} color="#d33a32" strokeWidth={1.9} />
          <Text style={[styles.actionButtonText, styles.deleteText]}>{deleting ? 'Deleting...' : 'Delete permanently'}</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressedRow]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </ActionSurface>
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
    borderRightColor: 'rgba(0,0,0,0.025)',
    backgroundColor: SIDEBAR_BACKGROUND,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 32,
    shadowOffset: { width: 10, height: 0 },
  },
  drawerGestureEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 22,
    backgroundColor: 'transparent',
  },
  inner: {
    flex: 1,
    backgroundColor: SIDEBAR_BACKGROUND,
  },
  header: {
    height: 70,
    justifyContent: 'flex-end',
    paddingHorizontal: 29,
    paddingBottom: 7,
  },
  logo: {
    color: '#111113',
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: -2.15,
    lineHeight: 42,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 22,
    paddingBottom: 38,
  },
  nav: {
    gap: 11,
  },
  menuItem: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 0,
  },
  menuItemActive: {
    backgroundColor: 'transparent',
  },
  menuIconWrap: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    color: '#1b1c20',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.53,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginTop: 28,
    marginBottom: 22,
  },
  dividerTight: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginTop: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#6e7078',
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.35,
    lineHeight: 20,
    marginBottom: 12,
  },
  projectsSection: {
    gap: 0,
  },
  projectButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.018)',
  },
  projectButtonText: {
    flex: 1,
    color: '#1b1c20',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  recentList: {
    gap: 5,
  },
  recentItem: {
    minHeight: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  recentItemActive: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  recentText: {
    flex: 1,
    color: '#2b2c31',
    fontSize: 16.2,
    fontWeight: '400',
    letterSpacing: -0.48,
    lineHeight: 20,
  },
  emptyHistory: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 6,
  },
  emptyTitle: {
    color: '#1b1c20',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  emptyText: {
    maxWidth: 230,
    color: '#8b8d94',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: SIDEBAR_BACKGROUND,
  },
  avatarButton: {
    width: 43,
    height: 43,
    borderRadius: 21.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9771b',
    shadowColor: '#0f172a',
    shadowOpacity: 0.028,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
  },
  composeButton: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#050507',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
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
  renameSheet: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#fbfbfc',
    padding: 8,
    marginBottom: 10,
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
  deleteDescription: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#7f8188',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
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
  renameInput: {
    height: 58,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.035)',
    paddingHorizontal: 16,
    color: '#17181b',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.45,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  renameButton: {
    flex: 1,
    height: 52,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameButtonGhost: {
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  renameButtonPrimary: {
    backgroundColor: '#111113',
  },
  renameCancelText: {
    color: '#17181b',
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: -0.42,
  },
  renameSaveText: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: -0.42,
  },
  disabledButton: {
    opacity: 0.42,
  },
});
