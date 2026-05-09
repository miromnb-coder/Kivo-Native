import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { KivoComposer } from './KivoComposer';
import { KivoPlusSheet, type RecentPhoto } from './KivoPlusSheet';
import { KivoSidebarOverlay } from './KivoSidebarOverlay';
import { KivoTodayDashboard } from './KivoTodayDashboard';
import { KivoTopBar } from './KivoTopBar';

const SIDEBAR_BACKGROUND = '#f4f4f6';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  photo?: RecentPhoto | null;
};

const sampleConversations = [
  { id: 'recent-email', title: 'Katso minun viimeisimmät sähköpo...' },
  { id: 'recent-calendar', title: 'Lisää tapahtuma minun kalenteriin ...' },
  { id: 'recent-tools', title: 'Mitä työkaluja pystyt käyttämään ja...' },
  { id: 'recent-image-1', title: 'Mitä näet tässä kuvassa' },
  { id: 'recent-image-2', title: 'Mitä näet tässä kuvassa' },
  { id: 'recent-build', title: 'Miten voin tehdä oman sovelluksen' },
  { id: 'recent-sidebar', title: 'Viimeistellään sivuvalikko täysin' },
  { id: 'recent-native', title: 'Tee Kivo native näkymä valmiiksi' },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createFirstKivoResponse(message: string, photo?: RecentPhoto | null) {
  if (photo && message.trim()) {
    return 'I received the image and your message. I can use this as context and help you refine, analyze, or turn it into the next action.';
  }

  if (photo) {
    return 'Image received. Tell me what you want me to do with it, or send another instruction and I’ll continue from there.';
  }

  return 'Got it. I’m ready to help with the next step and keep the conversation moving from here.';
}

function KivoThinkingLine() {
  const dotOne = useRef(new Animated.Value(0.34)).current;
  const dotTwo = useRef(new Animated.Value(0.34)).current;
  const dotThree = useRef(new Animated.Value(0.34)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeDotLoop = (dot: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.34, duration: 360, useNativeDriver: true }),
      ]),
    );

    const loops = [
      makeDotLoop(dotOne, 0),
      makeDotLoop(dotTwo, 120),
      makeDotLoop(dotThree, 240),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ),
    ];

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [dotOne, dotThree, dotTwo, shimmer]);

  const textOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.46, 0.86] });

  return (
    <View style={styles.thinkingLine}>
      <Animated.Text style={[styles.thinkingText, { opacity: textOpacity }]}>Kivo is thinking</Animated.Text>
      <View style={styles.thinkingDots}>
        <Animated.View style={[styles.thinkingDot, { opacity: dotOne }]} />
        <Animated.View style={[styles.thinkingDot, { opacity: dotTwo }]} />
        <Animated.View style={[styles.thinkingDot, { opacity: dotThree }]} />
      </View>
    </View>
  );
}

export function KivoChatScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 372);
  const pushedDistance = drawerWidth - 8;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<RecentPhoto | null>(null);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusExpanded, setPlusExpanded] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appScale = useRef(new Animated.Value(1)).current;
  const appRadius = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dashboardOpacity = useRef(new Animated.Value(1)).current;
  const dashboardTranslateY = useRef(new Animated.Value(0)).current;
  const sidebarProgress = useRef(new Animated.Value(0)).current;
  const sidebarProgressRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const dragModeRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldShowTodayDashboard = messages.length === 0 && !composerActive && !plusOpen;

  const chatTranslateX = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pushedDistance],
  });

  const chatScale = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.992],
  });

  const chatRadius = sidebarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
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
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dashboardOpacity, {
        toValue: shouldShowTodayDashboard ? 1 : 0,
        duration: shouldShowTodayDashboard ? 260 : 170,
        easing: Easing.bezier(0.2, 0.82, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(dashboardTranslateY, {
        toValue: shouldShowTodayDashboard ? 0 : -16,
        duration: shouldShowTodayDashboard ? 260 : 170,
        easing: Easing.bezier(0.2, 0.82, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [dashboardOpacity, dashboardTranslateY, shouldShowTodayDashboard]);

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
      duration: 340,
      easing: Easing.bezier(0.2, 0.82, 0.2, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      sidebarProgressRef.current = toValue;
      if (toValue === 0) {
        closeTimerRef.current = setTimeout(() => {
          setSidebarVisible(false);
          closeTimerRef.current = null;
        }, 24);
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
    const photoForMessage = selectedPhoto;
    const response = createFirstKivoResponse(message, photoForMessage);

    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);

    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}-user`,
        role: 'user',
        text: message,
        photo: photoForMessage,
      },
    ]);
    setSelectedPhoto(null);
    setComposerActive(false);
    setAssistantThinking(true);

    responseTimerRef.current = setTimeout(() => {
      setAssistantThinking(false);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}-assistant`,
          role: 'assistant',
          text: response,
        },
      ]);
    }, 850);
  }

  function openPlusSheet() {
    Keyboard.dismiss();
    setComposerActive(false);
    animateSidebar(0);
    setPlusOpen(true);
  }

  function closePlusSheet() {
    setPlusExpanded(false);
    setPlusOpen(false);
  }

  function handleSelectPhoto(photo: RecentPhoto) {
    setSelectedPhoto(photo);
    setComposerActive(true);
  }

  function openSidebar() {
    Keyboard.dismiss();
    setComposerActive(false);
    setPlusExpanded(false);
    setPlusOpen(false);
    animateSidebar(1);
  }

  function closeSidebar() {
    animateSidebar(0);
  }

  function startNewChat() {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    setAssistantThinking(false);
    setMessages([]);
    setSelectedPhoto(null);
    setComposerActive(false);
    animateSidebar(0);
  }

  const screenPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const current = sidebarProgressRef.current;
        const fromLeftEdge = gesture.x0 < 42;
        const fromOpenChat = current > 0.01;
        const movingRightToOpen = gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.14;
        const movingLeftToClose = gesture.dx < -10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.14;
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
        const shouldOpen = velocity > 0.38 || (velocity > -0.34 && current > 0.42);
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
            <Animated.View
              pointerEvents={shouldShowTodayDashboard ? 'auto' : 'none'}
              style={[styles.dashboardMotion, { opacity: dashboardOpacity, transform: [{ translateY: dashboardTranslateY }] }]}
            >
              <KivoTodayDashboard />
            </Animated.View>
          ) : (
            <ScrollView
              style={styles.chatPreview}
              contentContainerStyle={[styles.chatPreviewContent, { paddingTop: insets.top + 86 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) => (
                message.role === 'user' ? (
                  <View key={message.id} style={styles.userBubble}>
                    {message.photo ? <Image source={{ uri: message.photo.uri }} style={styles.userBubbleImage} resizeMode="cover" /> : null}
                    {message.text ? <Text style={styles.userBubbleText}>{message.text}</Text> : null}
                  </View>
                ) : (
                  <View key={message.id} style={styles.assistantTextBlock}>
                    <Text style={styles.assistantName}>Kivo</Text>
                    <Text style={styles.assistantText}>{message.text}</Text>
                  </View>
                )
              ))}
              {assistantThinking ? <KivoThinkingLine /> : null}
            </ScrollView>
          )}
        </Pressable>

        <KivoComposer
          onSubmit={handleSubmit}
          onOpenPlus={openPlusSheet}
          onComposingChange={setComposerActive}
          selectedPhoto={selectedPhoto}
          onRemovePhoto={() => setSelectedPhoto(null)}
        />
      </Animated.View>

      <KivoPlusSheet open={plusOpen} onClose={closePlusSheet} onExpandedChange={setPlusExpanded} onSelectPhoto={handleSelectPhoto} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SIDEBAR_BACKGROUND,
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
    shadowOpacity: 0.05,
    shadowRadius: 38,
    shadowOffset: { width: -10, height: 0 },
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
  dashboardMotion: {
    flex: 1,
  },
  chatPreview: {
    flex: 1,
  },
  chatPreviewContent: {
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
    marginBottom: 16,
    overflow: 'hidden',
  },
  userBubbleImage: {
    width: 178,
    height: 128,
    borderRadius: 16,
    marginHorizontal: -5,
    marginTop: -1,
    marginBottom: 9,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: -0.25,
  },
  assistantTextBlock: {
    maxWidth: '88%',
    marginBottom: 18,
    paddingLeft: 2,
  },
  assistantName: {
    marginBottom: 5,
    color: '#8f9098',
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  assistantText: {
    color: colors.text,
    fontSize: 16.2,
    lineHeight: 23,
    letterSpacing: -0.32,
  },
  thinkingLine: {
    marginTop: 2,
    marginBottom: 18,
    paddingLeft: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thinkingText: {
    color: colors.text,
    fontSize: 15.5,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  thinkingDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
});
