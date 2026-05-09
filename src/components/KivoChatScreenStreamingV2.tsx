import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askKivoAiStream, type KivoAiMetadata, type KivoSource } from '../lib/kivo-ai';
import {
  createConversationTitle,
  createKivoConversation,
  listKivoConversations,
  loadKivoConversationMessages,
  saveKivoMessage,
  type KivoConversationSummary,
  type KivoStoredMessage,
} from '../lib/kivo-history';
import { colors } from '../theme/colors';
import { KivoComposer } from './KivoComposer';
import { KivoMessageActionBar } from './KivoMessageActionBar';
import { KivoPlusSheet, type RecentPhoto } from './KivoPlusSheet';
import { KivoSidebarOverlay } from './KivoSidebarOverlay';
import { KivoSourcesSheet } from './KivoSourcesSheet';
import { KivoTodayDashboard } from './KivoTodayDashboard';
import { KivoTopBar } from './KivoTopBar';

const SIDEBAR_BACKGROUND = '#f4f4f6';
const BASE_CHAT_BOTTOM_PADDING = 236;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  photo?: RecentPhoto | null;
  sources?: KivoSource[];
  usedSearch?: boolean;
};

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

function KivoAssistantContent({ text }: { text: string }) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <View style={styles.assistantContent}>
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        if (heading) {
          return (
            <Text key={`heading-${index}`} style={styles.assistantHeading}>
              {renderInlineText(heading[1], `heading-${index}`, styles.assistantHeading)}
            </Text>
          );
        }

        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <View key={`bullet-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{renderInlineText(bullet[1], `bullet-${index}`, styles.bulletText)}</Text>
            </View>
          );
        }

        const number = line.match(/^(\d+)\.\s+(.+)$/);
        if (number) {
          return (
            <View key={`number-${index}`} style={styles.bulletRow}>
              <Text style={styles.numberDot}>{number[1]}.</Text>
              <Text style={styles.bulletText}>{renderInlineText(number[2], `number-${index}`, styles.bulletText)}</Text>
            </View>
          );
        }

        return (
          <Text key={`paragraph-${index}`} style={styles.assistantText}>
            {renderInlineText(line, `paragraph-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

function KivoThinkingLine() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.82] });

  return (
    <View style={styles.thinkingLine}>
      <Animated.Text style={[styles.thinkingText, { opacity }]}>Miettii</Animated.Text>
      <View style={styles.thinkingDots}>
        <View style={styles.thinkingDot} />
        <View style={styles.thinkingDot} />
        <View style={styles.thinkingDot} />
      </View>
    </View>
  );
}

export function KivoChatScreenStreamingV2() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<KivoConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<RecentPhoto | null>(null);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusExpanded, setPlusExpanded] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourcesSheetSources, setSourcesSheetSources] = useState<KivoSource[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const sidebarProgress = useRef(new Animated.Value(0)).current;
  const dashboardOpacity = useRef(new Animated.Value(1)).current;
  const dashboardTranslateY = useRef(new Animated.Value(0)).current;
  const drawerWidth = 342;
  const shouldShowTodayDashboard = messages.length === 0 && !activeConversationId && !composerActive && !plusOpen;

  const chatTranslateX = sidebarProgress.interpolate({ inputRange: [0, 1], outputRange: [0, drawerWidth - 8] });
  const chatScale = sidebarProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.992] });
  const chatRadius = sidebarProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

  function scrollChatToEnd(animated = true) {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated });
      scrollTimerRef.current = null;
    }, 70);
  }

  function animateSidebar(toValue: number) {
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
      if (finished && toValue === 0) setSidebarVisible(false);
    });
  }

  async function refreshConversations() {
    const nextConversations = await listKivoConversations();
    setConversations(nextConversations);
  }

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom + 18);
      setKeyboardHeight(nextHeight);
      setTimeout(() => scrollChatToEnd(true), 150);
    });

    const didShow = Keyboard.addListener('keyboardDidShow', (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom + 18);
      setKeyboardHeight(nextHeight);
      scrollChatToEnd(true);
    });

    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    const didHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

    return () => {
      show.remove();
      didShow.remove();
      hide.remove();
      didHide.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    if (messages.length > 0 || assistantThinking) scrollChatToEnd(true);
  }, [assistantThinking, messages.length]);

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

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      requestIdRef.current += 1;
    };
  }, []);

  async function handleSubmit(message: string) {
    const photoForMessage = selectedPhoto;
    const userMessage: ChatMessage = {
      id: `${Date.now()}-${messages.length}-user`,
      role: 'user',
      text: message,
      photo: photoForMessage,
    };
    const assistantMessageId = `${Date.now()}-${messages.length + 1}-assistant`;
    const historyForAi = [...messages, userMessage]
      .filter((item) => item.text.trim().length > 0)
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.text }));
    const requestId = requestIdRef.current + 1;
    const conversationTitle = createConversationTitle(message, Boolean(photoForMessage));

    requestIdRef.current = requestId;
    setMessages((current) => [...current, userMessage]);
    setSelectedPhoto(null);
    setComposerActive(false);
    setAssistantThinking(true);
    scrollChatToEnd(true);

    const conversation = activeConversationId
      ? conversations.find((item) => item.id === activeConversationId) ?? { id: activeConversationId, title: conversationTitle }
      : await createKivoConversation(conversationTitle);

    if (requestIdRef.current !== requestId) return;

    if (!activeConversationId) {
      setActiveConversationId(conversation.id);
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)].slice(0, 24));
    }

    await saveKivoMessage(conversation.id, userMessage);

    let assistantInserted = false;
    let streamedText = '';
    let assistantMetadata: KivoAiMetadata = {};

    const finalAnswer = await askKivoAiStream({
      message,
      photo: photoForMessage,
      history: historyForAi,
      onMetadata: (metadata) => {
        assistantMetadata = metadata;
        setMessages((current) => current.map((item) => (
          item.id === assistantMessageId
            ? { ...item, sources: metadata.sources ?? [], usedSearch: metadata.usedSearch }
            : item
        )));
      },
      onDelta: (delta) => {
        if (requestIdRef.current !== requestId) return;
        streamedText += delta;
        setAssistantThinking(false);

        setMessages((current) => {
          if (!assistantInserted && !current.some((item) => item.id === assistantMessageId)) {
            assistantInserted = true;
            return [...current, {
              id: assistantMessageId,
              role: 'assistant',
              text: streamedText,
              sources: assistantMetadata.sources ?? [],
              usedSearch: assistantMetadata.usedSearch,
            }];
          }

          return current.map((item) => (
            item.id === assistantMessageId
              ? { ...item, text: streamedText, sources: assistantMetadata.sources ?? item.sources, usedSearch: assistantMetadata.usedSearch ?? item.usedSearch }
              : item
          ));
        });

        scrollChatToEnd(false);
      },
    });

    if (requestIdRef.current !== requestId) return;

    const cleanAnswer = finalAnswer.trim() || streamedText.trim();
    setAssistantThinking(false);
    setMessages((current) => {
      const hasAssistant = current.some((item) => item.id === assistantMessageId);
      if (!hasAssistant) {
        return [...current, {
          id: assistantMessageId,
          role: 'assistant',
          text: cleanAnswer,
          sources: assistantMetadata.sources ?? [],
          usedSearch: assistantMetadata.usedSearch,
        }];
      }

      return current.map((item) => (
        item.id === assistantMessageId
          ? { ...item, text: cleanAnswer, sources: assistantMetadata.sources ?? item.sources, usedSearch: assistantMetadata.usedSearch ?? item.usedSearch }
          : item
      ));
    });

    scrollChatToEnd(true);
    await saveKivoMessage(conversation.id, { id: assistantMessageId, role: 'assistant', text: cleanAnswer });
    await refreshConversations();
  }

  async function openConversation(conversationId: string) {
    requestIdRef.current += 1;
    setAssistantThinking(false);
    setSelectedPhoto(null);
    setComposerActive(false);
    setActiveConversationId(conversationId);
    setMessages([]);

    const storedMessages = await loadKivoConversationMessages(conversationId);
    setMessages(storedMessages.map(storedMessageToChatMessage));
    scrollChatToEnd(false);
  }

  function openPlusSheet() {
    Keyboard.dismiss();
    setComposerActive(false);
    animateSidebar(0);
    setPlusOpen(true);
  }

  function openSidebar() {
    Keyboard.dismiss();
    setComposerActive(false);
    setPlusExpanded(false);
    setPlusOpen(false);
    refreshConversations();
    animateSidebar(1);
  }

  function startNewChat() {
    requestIdRef.current += 1;
    setAssistantThinking(false);
    setMessages([]);
    setSelectedPhoto(null);
    setActiveConversationId(null);
    setComposerActive(false);
    animateSidebar(0);
    refreshConversations();
  }

  return (
    <View style={styles.root}>
      <KivoSidebarOverlay
        visible={sidebarVisible}
        progress={sidebarProgress}
        drawerWidth={drawerWidth}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onClose={() => animateSidebar(0)}
        onNewChat={startNewChat}
        onOpenConversation={openConversation}
        onGestureProgress={(nextProgress) => sidebarProgress.setValue(nextProgress)}
        onGestureEnd={(open) => animateSidebar(open ? 1 : 0)}
      />

      <Animated.View
        style={[
          styles.appCard,
          {
            borderRadius: chatRadius,
            transform: [{ translateX: chatTranslateX }, { scale: chatScale }],
          },
        ]}
      >
        {sidebarOpen ? <View accessibilityRole="button" accessibilityLabel="Close menu" style={styles.sidebarDismissLayer} onTouchEnd={() => animateSidebar(0)} /> : null}

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
              contentContainerStyle={[styles.chatPreviewContent, { paddingTop: insets.top + 86, paddingBottom: BASE_CHAT_BOTTOM_PADDING + keyboardHeight }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollChatToEnd(false)}
              onLayout={() => scrollChatToEnd(false)}
            >
              {messages.map((item) => (
                item.role === 'user' ? (
                  <View key={item.id} style={styles.userBubble}>
                    {item.photo ? <Image source={{ uri: item.photo.uri }} style={styles.userBubbleImage} resizeMode="cover" /> : null}
                    {item.text ? <Text style={styles.userBubbleText}>{item.text}</Text> : null}
                  </View>
                ) : (
                  <View key={item.id} style={styles.assistantTextBlock}>
                    <Text style={styles.assistantName}>Kivo</Text>
                    <KivoAssistantContent text={item.text} />
                    <KivoMessageActionBar
                      messageText={item.text}
                      sources={item.sources}
                      onOpenSources={() => setSourcesSheetSources(item.sources ?? [])}
                    />
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

      <KivoPlusSheet open={plusOpen} onClose={() => setPlusOpen(false)} onExpandedChange={setPlusExpanded} onSelectPhoto={(photo) => { setSelectedPhoto(photo); setComposerActive(true); }} />
      <KivoSourcesSheet open={sourcesSheetSources.length > 0} sources={sourcesSheetSources} onClose={() => setSourcesSheetSources([])} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SIDEBAR_BACKGROUND,
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
    maxWidth: '96%',
    marginBottom: 22,
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
  thinkingLine: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    paddingLeft: 2,
  },
  thinkingText: {
    color: '#8f9098',
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.26,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 2,
  },
  thinkingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8f9098',
  },
});
