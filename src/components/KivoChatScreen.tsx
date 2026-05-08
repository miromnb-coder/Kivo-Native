import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { KivoComposer } from './KivoComposer';
import { KivoPlusSheet } from './KivoPlusSheet';
import { KivoSidebarOverlay } from './KivoSidebarOverlay';
import { KivoTodayDashboard } from './KivoTodayDashboard';
import { KivoTopBar } from './KivoTopBar';

const sampleConversations = [
  { id: 'recent-email', title: 'Katso minun viimeisimmät sähköpo...' },
  { id: 'recent-calendar', title: 'Lisää tapahtuma minun kalenteriin ...' },
  { id: 'recent-tools', title: 'Mitä työkaluja pystyt käyttämään ja...' },
  { id: 'recent-image-1', title: 'Mitä näet tässä kuvassa' },
  { id: 'recent-image-2', title: 'Mitä näet tässä kuvassa' },
  { id: 'recent-build', title: 'Miten voin tehdä oman sovelluksen' },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function KivoChatScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 370);
  const pushedDistance = drawerWidth - 20;
  const [messages, setMessages] = useState<string[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusExpanded, setPlusExpanded] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appScale = useRef(new Animated.Value(1)).current;
  const appRadius = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sidebarProgress = useRef(new Animated.Value(0)).current;
  const sidebarProgressRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const dragModeRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatTranslateX = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pushedDistance],
  });

  const chatScale = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });

  const chatRadius = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });

  useEffect(() => {
    const listener = sidebarProgress.addListener(({ value }) => {
      sidebarProgressRef.current = value;
    });

    return () => {
      sidebarProgress.removeListener(listener);
    };
  }, [sidebarProgress]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(appScale, {
        toValue: plusExpanded ? 0.92 : 1,
        damping: 22,
        stiffness: 170,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.timing(appRadius, {
        toValue: plusExpanded ? 30 : 0,
        duration: plusExpanded ? 220 : 190,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: plusExpanded ? 1 : 0,
        duration: plusExpanded ? 220 : 190,
        useNativeDriver: false,
      }),
    ]).start();
  }, [appRadius, appScale, backdropOpacity, plusExpanded]);

  function animateSidebar(toValue: number) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (toValue > 0) {
      setSidebarVisible(true);
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }

    Animated.timing(sidebarProgress, {
      toValue,
      duration: 325,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      sidebarProgressRef.current = toValue;
      if (toValue === 0) {
        closeTimerRef.current = setTimeout(() => {
          setSidebarVisible(false);
          closeTimerRef.current = null;
        }, 20);
      }
    });
  }

  function setSidebarGestureProgress(nextProgress: number) {
    const clamped = clamp(nextProgress);
    if (clamped > 0 && !sidebarVisible) setSidebarVisible(true);
    if (clamped > 0) setSidebarOpen(true);
    sidebarProgress.stopAnimation();
    sidebarProgress.setValue(clamped);
    sidebarProgressRef.current = clamped;
  }

  function endSidebarGesture(open: boolean) {
    animateSidebar(open ? 1 : 0);
  }

  function handleSubmit(message: string) {
    setMessages((current) => [...current, message]);
  }

  function openPlusSheet() {
    Keyboard.dismiss();
    animateSidebar(0);
    setPlusOpen(true);
  }

  function closePlusSheet() {
    setPlusExpanded(false);
    setPlusOpen(false);
  }

  function openSidebar() {
    Keyboard.dismiss();
    setPlusExpanded(false);
    setPlusOpen(false);
    animateSidebar(1);
  }

  function closeSidebar() {
    animateSidebar(0);
  }

  function startNewChat() {
    setMessages([]);
    animateSidebar(0);
  }

  const screenPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const current = sidebarProgressRef.current;
        const fromLeftEdge = gesture.x0 < 32;
        const fromOpenChat = current > 0.01;
        const movingRightToOpen = gesture.dx > 11 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15;
        const movingLeftToClose = gesture.dx < -11 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15;
        return (fromLeftEdge && movingRightToOpen) || (fromOpenChat && movingLeftToClose);
      },
      onPanResponderGrant: () => {
        dragStartProgressRef.current = sidebarProgressRef.current;
        dragStartTimeRef.current = Date.now();
        dragModeRef.current = 'idle';
        sidebarProgress.stopAnimation();
        if (!sidebarVisible) setSidebarVisible(true);
      },
      onPanResponderMove: (_, gesture) => {
        const absX = Math.abs(gesture.dx);
        const absY = Math.abs(gesture.dy);

        if (dragModeRef.current === 'idle') {
          if (absY > 12 && absY > absX * 1.12) {
            dragModeRef.current = 'vertical';
            return;
          }
          if (absX > 10 && absX > absY * 1.12) dragModeRef.current = 'horizontal';
        }

        if (dragModeRef.current !== 'horizontal') return;

        const next = clamp(dragStartProgressRef.current + gesture.dx / pushedDistance);
        setSidebarGestureProgress(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
        const velocity = gesture.dx / elapsed;
        const current = sidebarProgressRef.current;
        const shouldOpen = velocity > 0.42 || (velocity > -0.34 && current > 0.42);
        dragModeRef.current = 'idle';
        endSidebarGesture(shouldOpen);
      },
      onPanResponderTerminate: () => {
        dragModeRef.current = 'idle';
        endSidebarGesture(sidebarProgressRef.current > 0.5);
      },
    }),
    [pushedDistance, sidebarProgress, sidebarVisible],
  );

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.blackBackdrop, { opacity: backdropOpacity }]} />

      <KivoSidebarOverlay
        visible={sidebarVisible}
        progress={sidebarProgress}
        drawerWidth={drawerWidth}
        conversations={sampleConversations}
        activeConversationId={null}
        onClose={closeSidebar}
        onNewChat={startNewChat}
        onGestureProgress={setSidebarGestureProgress}
        onGestureEnd={endSidebarGesture}
      />

      <Animated.View
        style={[
          styles.appCard,
          {
            borderRadius: Animated.add(appRadius, chatRadius),
            transform: [{ translateX: chatTranslateX }, { scale: Animated.multiply(appScale, chatScale) }],
          },
        ]}
        {...screenPanResponder.panHandlers}
      >
        {sidebarOpen ? <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={styles.sidebarDismissLayer} onPress={closeSidebar} /> : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <KivoTopBar onOpenMenu={openSidebar} onOpenModes={() => Keyboard.dismiss()} />
        </View>

        <Pressable style={styles.contentDismissLayer} onPress={Keyboard.dismiss}>
          {messages.length === 0 ? (
            <KivoTodayDashboard />
          ) : (
            <View style={[styles.chatPreview, { paddingTop: insets.top + 86 }]}>
              {messages.map((message, index) => (
                <View key={`${message}-${index}`} style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>{message}</Text>
                </View>
              ))}
              <View style={styles.assistantBubble}>
                <Text style={styles.assistantText}>Kivo is ready. Native agent streaming will connect here next.</Text>
              </View>
            </View>
          )}
        </Pressable>

        <KivoComposer onSubmit={handleSubmit} onOpenPlus={openPlusSheet} />
      </Animated.View>

      <KivoPlusSheet open={plusOpen} onClose={closePlusSheet} onExpandedChange={setPlusExpanded} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3f3f5',
  },
  blackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  appCard: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.055,
    shadowRadius: 34,
    shadowOffset: { width: -8, height: 0 },
  },
  sidebarDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    backgroundColor: 'transparent',
  },
  topBar: {
    zIndex: 20,
  },
  contentDismissLayer: {
    flex: 1,
  },
  chatPreview: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 220,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    borderRadius: 22,
    backgroundColor: colors.text,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginBottom: 12,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: -0.25,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.045)',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  assistantText: {
    color: colors.text,
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.25,
  },
});
