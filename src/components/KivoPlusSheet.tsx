import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KivoConnectorDetailView, type NativeConnector } from './KivoConnectorDetailView';

type Props = {
  open: boolean;
  onClose: () => void;
  onExpandedChange?: (expanded: boolean) => void;
};

type ActionItem = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: string;
};

type ConnectorItem = NativeConnector & {
  id: string;
};

type SheetSnap = 'peek' | 'expanded' | 'closed';

type RecentPhoto = {
  id: string;
  uri: string;
};

const actions: ActionItem[] = [
  { title: 'Add files', icon: 'folder-plus' },
  { title: 'Create image', icon: 'edit-3' },
  { title: 'Write draft', icon: 'file-text' },
  { title: 'Research deeply', icon: 'globe', badge: '5 left' },
  { title: 'Schedule task', icon: 'calendar' },
  { title: 'Connect tools', icon: 'plug' },
];

const connectorAssetBase = 'https://raw.githubusercontent.com/miromnb-coder/Kivo/main/public/connectors';

const connectors: ConnectorItem[] = [
  {
    id: 'google-drive',
    title: 'Google Drive',
    iconUri: `${connectorAssetBase}/google-drive.PNG`,
    description: 'Connect Google Drive to Kivo to search files, summarize documents, analyze folders, and use workspace content in conversations.',
    category: 'Productivity',
    features: 'File search',
  },
  {
    id: 'gmail',
    title: 'Gmail',
    iconUri: `${connectorAssetBase}/gmail.PNG`,
    description: 'Connect Gmail to Kivo to summarize conversations, draft replies, surface recent threads, prepare meeting context, and highlight action items.',
    category: 'Productivity',
    features: 'Email assistance',
  },
  {
    id: 'google-calendar',
    title: 'Google Calendar',
    iconUri: `${connectorAssetBase}/google-calendar.PNG`,
    description: 'Connect Google Calendar to Kivo to review your schedule, plan your day, prepare meetings, and create smarter reminders.',
    category: 'Productivity',
    features: 'Calendar planning',
  },
  {
    id: 'outlook-calendar',
    title: 'Outlook Calendar',
    iconUri: `${connectorAssetBase}/outlook-calendar.PNG`,
    description: 'Connect Outlook Calendar to Kivo to organize events, prepare meeting context, find open time, and keep your day on track.',
    category: 'Productivity',
    features: 'Calendar planning',
  },
  {
    id: 'outlook-mail',
    title: 'Outlook Mail',
    iconUri: `${connectorAssetBase}/outlook-mail.PNG`,
    description: 'Connect Outlook Mail to Kivo to summarize emails, draft responses, find important messages, and turn threads into next steps.',
    category: 'Productivity',
    features: 'Email assistance',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function KivoPlusSheet({ open, onClose, onExpandedChange }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const peekHeight = Math.min(height * 0.78, Math.max(520, height - 118));
  const expandedHeight = height - Math.max(insets.top + 10, 48);
  const [expanded, setExpanded] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorItem | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [photoPermission, setPhotoPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const expandedRef = useRef(false);
  const scrollYRef = useRef(0);
  const sheetHeight = useRef(new Animated.Value(peekHeight)).current;
  const translateY = useRef(new Animated.Value(height)).current;
  const currentHeightRef = useRef(peekHeight);
  const currentTranslateRef = useRef(height);
  const gestureStartHeightRef = useRef(peekHeight);
  const gestureModeRef = useRef<'idle' | 'sheet' | 'scroll'>('idle');

  async function loadRecentPhotos() {
    try {
      const permission = await MediaLibrary.getPermissionsAsync();
      let nextPermission = permission;

      if (!permission.granted && permission.canAskAgain) {
        nextPermission = await MediaLibrary.requestPermissionsAsync();
      }

      if (!nextPermission.granted) {
        setPhotoPermission('denied');
        setRecentPhotos([]);
        return;
      }

      setPhotoPermission('granted');
      const result = await MediaLibrary.getAssetsAsync({
        first: 12,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      const photos = await Promise.all(
        result.assets.map(async (asset) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(asset);
            return {
              id: asset.id,
              uri: info.localUri ?? info.uri ?? asset.uri,
            };
          } catch {
            return {
              id: asset.id,
              uri: asset.uri,
            };
          }
        }),
      );

      setRecentPhotos(photos.filter((photo) => Boolean(photo.uri) && !photo.uri.startsWith('ph://')));
    } catch {
      setPhotoPermission('denied');
      setRecentPhotos([]);
    }
  }

  function updateExpanded(nextExpanded: boolean) {
    if (expandedRef.current === nextExpanded) return;
    expandedRef.current = nextExpanded;
    setExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  function setSheetHeight(nextHeight: number) {
    const clamped = clamp(nextHeight, peekHeight, expandedHeight);
    currentHeightRef.current = clamped;
    sheetHeight.setValue(clamped);
  }

  function setSheetTranslate(nextTranslate: number) {
    const clamped = clamp(nextTranslate, 0, height + 40);
    currentTranslateRef.current = clamped;
    translateY.setValue(clamped);
  }

  function animateToSnap(snap: SheetSnap) {
    if (snap === 'closed') {
      updateExpanded(false);
      setSelectedConnector(null);
      Animated.timing(translateY, {
        toValue: height + 40,
        duration: 220,
        easing: Easing.bezier(0.28, 0.92, 0.36, 1),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          currentTranslateRef.current = height + 40;
          onClose();
        }
      });
      return;
    }

    const nextExpanded = snap === 'expanded';
    const nextHeight = nextExpanded ? expandedHeight : peekHeight;
    updateExpanded(nextExpanded);

    Animated.parallel([
      Animated.spring(sheetHeight, {
        toValue: nextHeight,
        damping: 25,
        stiffness: 225,
        mass: 0.84,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 25,
        stiffness: 225,
        mass: 0.84,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      currentHeightRef.current = nextHeight;
      currentTranslateRef.current = 0;
    });
  }

  function closeWithAnimation() {
    animateToSnap('closed');
  }

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const mostlyVertical = Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.08;
        if (!mostlyVertical || Math.abs(gesture.dy) < 4) return false;

        if (!expandedRef.current) return true;
        return scrollYRef.current <= 1 && gesture.dy > 6;
      },
      onPanResponderGrant: () => {
        gestureModeRef.current = 'sheet';
        gestureStartHeightRef.current = currentHeightRef.current;
        sheetHeight.stopAnimation((value) => {
          currentHeightRef.current = value;
          gestureStartHeightRef.current = value;
        });
        translateY.stopAnimation((value) => {
          currentTranslateRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        if (gestureModeRef.current !== 'sheet') return;

        const startHeight = gestureStartHeightRef.current;

        if (gesture.dy < 0) {
          setSheetTranslate(0);
          setSheetHeight(startHeight - gesture.dy);
          if (startHeight - gesture.dy > expandedHeight - 42) updateExpanded(true);
          return;
        }

        if (startHeight > peekHeight + 1) {
          const nextHeight = Math.max(peekHeight, startHeight - gesture.dy);
          setSheetHeight(nextHeight);

          const overflow = Math.max(0, gesture.dy - (startHeight - peekHeight));
          setSheetTranslate(overflow);
          if (nextHeight < expandedHeight - 64) updateExpanded(false);
          return;
        }

        setSheetHeight(peekHeight);
        setSheetTranslate(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        gestureModeRef.current = 'idle';
        const heightNow = currentHeightRef.current;
        const translateNow = currentTranslateRef.current;
        const middle = peekHeight + (expandedHeight - peekHeight) * 0.45;

        if (translateNow > 130 || gesture.vy > 1.05) {
          animateToSnap('closed');
          return;
        }

        if (gesture.vy < -0.42 || heightNow > middle) {
          animateToSnap('expanded');
          return;
        }

        animateToSnap('peek');
      },
      onPanResponderTerminate: () => {
        gestureModeRef.current = 'idle';
        animateToSnap(currentHeightRef.current > peekHeight + (expandedHeight - peekHeight) * 0.5 ? 'expanded' : 'peek');
      },
    }),
    [expandedHeight, height, peekHeight, sheetHeight, translateY],
  );

  useEffect(() => {
    if (!open) return;
    expandedRef.current = false;
    setExpanded(false);
    setSelectedConnector(null);
    onExpandedChange?.(false);
    scrollYRef.current = 0;
    currentHeightRef.current = peekHeight;
    currentTranslateRef.current = height + 40;
    sheetHeight.setValue(peekHeight);
    translateY.setValue(height + 40);
    loadRecentPhotos();
    requestAnimationFrame(() => animateToSnap('peek'));
  }, [height, onExpandedChange, open, peekHeight, sheetHeight, translateY]);

  if (!open) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel="Close plus menu" style={styles.backdrop} onPress={closeWithAnimation} />

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            paddingBottom: insets.bottom + 22,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleHitArea}>
            <View style={styles.handle} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={expanded}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={styles.scrollContent}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={styles.previewRow}>
            <PreviewTile large permission={photoPermission} onPress={loadRecentPhotos} />
            {recentPhotos.length > 0 ? (
              recentPhotos.map((photo) => <PreviewTile key={photo.id} photoUri={photo.uri} />)
            ) : (
              <>
                <PreviewTile />
                <PreviewTile />
                <PreviewTile />
              </>
            )}
          </ScrollView>

          <View style={styles.actionsList}>
            {actions.map((item) => (
              <ActionRow key={item.title} item={item} onPress={item.title === 'Add files' ? closeWithAnimation : undefined} />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.connectorsSection}>
            <Text style={styles.connectorsTitle}>Connectors</Text>
            <View style={styles.connectorsList}>
              {connectors.map((connector) => (
                <ConnectorRow key={connector.id} connector={connector} onOpen={() => setSelectedConnector(connector)} />
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {selectedConnector ? (
        <KivoConnectorDetailView connector={selectedConnector} topInset={insets.top} bottomInset={insets.bottom} onBack={() => setSelectedConnector(null)} />
      ) : null}
    </View>
  );
}

function PreviewTile({ large = false, photoUri, permission, onPress }: { large?: boolean; photoUri?: string; permission?: 'unknown' | 'granted' | 'denied'; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.previewTile, large ? styles.previewTileLarge : styles.previewTileWide, pressed && styles.pressed]} onPress={onPress}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
      ) : large ? (
        <View style={styles.cameraTileContent}>
          <Feather name="camera" size={34} color="#4f5055" strokeWidth={2.05} />
          {permission === 'denied' ? <Text style={styles.cameraTileLabel}>Allow photos</Text> : null}
        </View>
      ) : null}
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

function ConnectorIcon({ connector }: { connector: ConnectorItem }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.connectorIcon}>
      {failed ? (
        <Text style={styles.connectorInitial}>{connector.title.slice(0, 1)}</Text>
      ) : (
        <Image source={{ uri: connector.iconUri }} style={styles.connectorImage} resizeMode="contain" onError={() => setFailed(true)} />
      )}
    </View>
  );
}

function ConnectorRow({ connector, onOpen }: { connector: ConnectorItem; onOpen: () => void }) {
  return (
    <View style={styles.connectorRow}>
      <ConnectorIcon connector={connector} />
      <Text numberOfLines={1} style={styles.connectorTitle}>{connector.title}</Text>
      <Pressable style={({ pressed }) => [styles.connectButton, pressed && styles.pressed]} onPress={onOpen}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </Pressable>
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
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 4,
  },
  handleHitArea: {
    width: 150,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 76,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#c4c4c9',
  },
  scrollContent: {
    paddingBottom: 30,
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
    overflow: 'hidden',
  },
  previewTileLarge: {
    width: 98,
  },
  previewTileWide: {
    width: 112,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  cameraTileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  cameraTileLabel: {
    color: '#4f5055',
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: -0.28,
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
    overflow: 'hidden',
    backgroundColor: '#f1f1f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorImage: {
    width: '100%',
    height: '100%',
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
