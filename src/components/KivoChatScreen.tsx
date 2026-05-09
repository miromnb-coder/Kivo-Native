import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, PanResponder, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { askKivoAi } from '../lib/kivo-ai';
import {
  createConversationTitle,
  createKivoConversation,
  listKivoConversations,
  loadKivoConversationMessages,
  saveKivoMessage,
  type KivoConversationSummary,
  type KivoStoredMessage,
} from '../lib/kivo-history';
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

type TableBlock = {
  header: string[];
  rows: string[][];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function isTableLine(line: string) {
  return line.includes('|') && line.split('|').filter((cell) => cell.trim().length > 0).length >= 2;
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTable(lines: string[]): TableBlock | null {
  const cleanRows = lines
    .filter((line) => !isTableDivider(line))
    .map((line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim()))
    .filter((row) => row.length >= 2);

  if (cleanRows.length < 2) return null;

  const [header, ...rows] = cleanRows;
  return { header, rows };
}

function storedMessageToChatMessage(message: KivoStoredMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    photo: message.photo,
  };
}

function renderInlineText(text: string, keyPrefix: string, style = styles.assistantText) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const isBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
    const value = isBold ? part.slice(2, -2) : part;

    return (
      <Text key={`${keyPrefix}-${index}`} style={[style, isBold && styles.assistantBold]}>
        {value}
      </Text>
    );
  });
}

function KivoTableBlock({ table }: { table: TableBlock }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={styles.tableScroller} contentContainerStyle={styles.tableContent}>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          {table.header.map((cell, index) => (
            <View key={`header-${index}`} style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>{renderInlineText(cell, `table-header-${index}`, styles.tableHeaderText)}</Text>
            </View>
          ))}
        </View>

        {table.rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.tableRow}>
            {table.header.map((_, cellIndex) => (
              <View key={`cell-${rowIndex}-${cellIndex}`} style={styles.tableCell}>
                <Text style={styles.tableCellText}>{renderInlineText(row[cellIndex] ?? '', `table-cell-${rowIndex}-${cellIndex}`, styles.tableCellText)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function KivoAssistantContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: JSX.Element[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];

      while (index < lines.length && isTableLine(lines[index].trim())) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const table = parseTable(tableLines);
      if (table) {
        blocks.push(<KivoTableBlock key={`table-${index}`} table={table} />);
        continue;
      }
    }

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      blocks.push(
        <Text key={`heading-${index}`} style={styles.assistantHeading}>
          {renderInlineText(headingMatch[1], `heading-${index}`, styles.assistantHeading)}
        </Text>,
      );
      index += 1;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push(
        <View key={`bullet-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{renderInlineText(bulletMatch[1], `bullet-${index}`, styles.bulletText)}</Text>
        </View>,
      );
      index += 1;
      continue;
    }

    const numberMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberMatch) {
      blocks.push(
        <View key={`number-${index}`} style={styles.bulletRow}>
          <Text style={styles.numberDot}>{numberMatch[1]}.</Text>
          <Text style={styles.bulletText}>{renderInlineText(numberMatch[2], `number-${index}`, styles.bulletText)}</Text>
        </View>,
      );
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim().length > 0 &&
      !isTableLine(lines[index].trim()) &&
      !/^#{1,3}\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^(\d+)\.\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <Text key={`paragraph-${index}`} style={styles.assistantText}>
        {renderInlineText(paragraphLines.join(' '), `paragraph-${index}`)}
      </Text>,
    );
  }

  return <View style={styles.assistantContent}>{blocks}</View>;
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
  const [conversations, setConversations] = useState<KivoConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<RecentPhoto | null>(null);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusExpanded, setPlusExpanded] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const chatContentHeightRef = useRef(0);
  const chatViewportHeightRef = useRef(0);
  const chatScrollYRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const userDraggingChatRef = useRef(false);
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
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const conversationLoadIdRef = useRef(0);
  const shouldShowTodayDashboard = messages.length === 0 && !activeConversationId && !composerActive && !plusOpen;

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

  function updateChatStickiness() {
    const distanceFromBottom = chatContentHeightRef.current - chatViewportHeightRef.current - chatScrollYRef.current;
    const isNearBottom = distanceFromBottom < 110;

    if (isNearBottom) {
      shouldStickToBottomRef.current = true;
    } else if (userDraggingChatRef.current) {
      shouldStickToBottomRef.current = false;
    }
  }

  function scrollChatToEnd(animated = true, force = false) {
    if (!force && !shouldStickToBottomRef.current) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

    scrollTimerRef.current = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated });
      scrollTimerRef.current = null;
    }, 42);
  }

  function upsertConversation(conversation: KivoConversationSummary) {
    setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)].slice(0, 24));
  }

  async function refreshConversations() {
    const nextConversations = await listKivoConversations();
    setConversations(nextConversations);
  }

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    const listener = sidebarProgress.addListener(({ value }) => {
      sidebarProgressRef.current = value;
    });

    return () => {
      sidebarProgress.removeListener(listener);
    };
  }, [sidebarProgress]);

  useEffect(() => {
    if (messages.length > 0 || assistantThinking) {
      scrollChatToEnd(true);
    }
  }, [assistantThinking, messages.length]);

  useEffect(() => {
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      requestIdRef.current += 1;
      conversationLoadIdRef.current += 1;
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

  async function handleSubmit(message: string) {
    const photoForMessage = selectedPhoto;
    const userMessage: ChatMessage = {
      id: `${Date.now()}-${messages.length}-user`,
      role: 'user',
      text: message,
      photo: photoForMessage,
    };
    const historyForAi = [...messages, userMessage]
      .filter((item) => item.text.trim().length > 0)
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.text }));
    const requestId = requestIdRef.current + 1;
    const existingConversationId = activeConversationId;
    const conversationTitle = createConversationTitle(message, Boolean(photoForMessage));

    requestIdRef.current = requestId;
    shouldStickToBottomRef.current = true;
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);

    setMessages((current) => [...current, userMessage]);
    setSelectedPhoto(null);
    setComposerActive(false);
    setAssistantThinking(true);
    scrollChatToEnd(true, true);

    const conversation = existingConversationId
      ? conversations.find((item) => item.id === existingConversationId) ?? { id: existingConversationId, title: conversationTitle }
      : await createKivoConversation(conversationTitle);

    if (!existingConversationId) {
      setActiveConversationId(conversation.id);
      upsertConversation(conversation);
    }

    await saveKivoMessage(conversation.id, userMessage);

    const startedAt = Date.now();
    const answer = await askKivoAi({
      message,
      photo: photoForMessage,
      history: historyForAi,
    });
    const elapsed = Date.now() - startedAt;
    const delay = Math.max(0, 520 - elapsed);

    responseTimerRef.current = setTimeout(async () => {
      if (requestIdRef.current !== requestId) return;

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-${messages.length + 1}-assistant`,
        role: 'assistant',
        text: answer,
      };

      setAssistantThinking(false);
      setMessages((current) => [...current, assistantMessage]);
      scrollChatToEnd(true);
      await saveKivoMessage(conversation.id, assistantMessage);
      await refreshConversations();
    }, delay);
  }

  async function openConversation(conversationId: string) {
    const loadId = conversationLoadIdRef.current + 1;
    conversationLoadIdRef.current = loadId;
    requestIdRef.current += 1;

    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

    shouldStickToBottomRef.current = true;
    setAssistantThinking(false);
    setSelectedPhoto(null);
    setComposerActive(false);
    setActiveConversationId(conversationId);
    setMessages([]);

    const storedMessages = await loadKivoConversationMessages(conversationId);
    if (conversationLoadIdRef.current !== loadId) return;

    setMessages(storedMessages.map(storedMessageToChatMessage));
    scrollChatToEnd(false, true);
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
    refreshConversations();
    animateSidebar(1);
  }

  function closeSidebar() {
    animateSidebar(0);
  }

  function startNewChat() {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    requestIdRef.current += 1;
    conversationLoadIdRef.current += 1;
    shouldStickToBottomRef.current = true;
    setAssistantThinking(false);
    setMessages([]);
    setSelectedPhoto(null);
    setActiveConversationId(null);
    setComposerActive(false);
    animateSidebar(0);
    refreshConversations();
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
        conversations={conversations}
        activeConversationId={activeConversationId}
        onClose={closeSidebar}
        onNewChat={startNewChat}
        onOpenConversation={openConversation}
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
        {sidebarOpen ? <View accessibilityRole="button" accessibilityLabel="Close menu" style={styles.sidebarDismissLayer} onTouchEnd={closeSidebar} /> : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <KivoTopBar onOpenMenu={openSidebar} onOpenModes={() => Keyboard.dismiss()} />
        </View>

        <View style={styles.contentDismissLayer}>
          {messages.length === 0 ? (
            <Animated.View
              pointerEvents={shouldShowTodayDashboard ? 'auto' : 'none'}
              style={[styles.dashboardMotion, { opacity: dashboardOpacity, transform: [{ translateY: dashboardTranslateY }] }]}
            >
              {shouldShowTodayDashboard ? <KivoTodayDashboard /> : null}
            </Animated.View>
          ) : (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatPreview}
              contentContainerStyle={[styles.chatPreviewContent, { paddingTop: insets.top + 86 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onScrollBeginDrag={() => {
                userDraggingChatRef.current = true;
              }}
              onScroll={(event) => {
                chatScrollYRef.current = event.nativeEvent.contentOffset.y;
                chatViewportHeightRef.current = event.nativeEvent.layoutMeasurement.height;
                chatContentHeightRef.current = event.nativeEvent.contentSize.height;
                updateChatStickiness();
              }}
              onScrollEndDrag={() => {
                updateChatStickiness();
                userDraggingChatRef.current = false;
              }}
              onMomentumScrollEnd={() => {
                updateChatStickiness();
                userDraggingChatRef.current = false;
              }}
              onContentSizeChange={(_, height) => {
                chatContentHeightRef.current = height;
                scrollChatToEnd(true);
              }}
              onLayout={(event) => {
                chatViewportHeightRef.current = event.nativeEvent.layout.height;
                scrollChatToEnd(false);
              }}
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
                    <KivoAssistantContent text={message.text} />
                  </View>
                )
              ))}
              {assistantThinking ? <KivoThinkingLine /> : null}
            </ScrollView>
          )}
        </View>

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
    maxWidth: '92%',
    marginBottom: 20,
    paddingLeft: 2,
  },
  assistantName: {
    marginBottom: 5,
    color: '#8f9098',
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  assistantContent: {
    gap: 8,
  },
  assistantText: {
    color: colors.text,
    fontSize: 16.2,
    lineHeight: 23,
    letterSpacing: -0.32,
  },
  assistantBold: {
    color: '#111216',
    fontWeight: '700',
  },
  assistantHeading: {
    marginTop: 4,
    color: '#111216',
    fontSize: 17.5,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.48,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 14,
    color: '#111216',
    fontSize: 16.2,
    lineHeight: 23,
    fontWeight: '700',
  },
  numberDot: {
    minWidth: 24,
    color: '#111216',
    fontSize: 16.2,
    lineHeight: 23,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 16.2,
    lineHeight: 23,
    letterSpacing: -0.32,
  },
  tableScroller: {
    marginTop: 4,
    marginBottom: 4,
    maxWidth: '100%',
  },
  tableContent: {
    paddingRight: 18,
  },
  table: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.07)',
  },
  tableHeaderRow: {
    borderTopWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  tableCell: {
    width: 132,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.07)',
  },
  tableHeaderText: {
    color: '#111216',
    fontSize: 13.4,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  tableCellText: {
    color: colors.text,
    fontSize: 13.2,
    lineHeight: 18,
    letterSpacing: -0.2,
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
