import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
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
import { KivoMessageList } from './chat/KivoMessageList';
import type { ChatMessage } from './chat/types';
import { KivoComposer } from './KivoComposer';
import { KivoPlusSheet, type RecentPhoto } from './KivoPlusSheet';
import { KivoSidebarOverlay } from './KivoSidebarOverlay';
import { KivoSourcesSheet } from './KivoSourcesSheet';
import { KivoTopBar } from './KivoTopBar';

const SIDEBAR_BACKGROUND = '#f4f4f6';
const CHAT_BOTTOM_PADDING = 236;
const START_BRIEFING_BOTTOM_PADDING = 126;
const KEYBOARD_BRIEFING_SCROLL_Y = 132;

function storedMessageToChatMessage(message: KivoStoredMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    photo: message.photo,
  };
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
  const [showBriefingBlock, setShowBriefingBlock] = useState(true);
  const chatScrollRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const conversationLoadIdRef = useRef(0);
  const sidebarProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = 342;
  const isStartBriefingOnly = showBriefingBlock && messages.length === 0 && !assistantThinking;
  const chatBottomPadding = (isStartBriefingOnly ? START_BRIEFING_BOTTOM_PADDING : CHAT_BOTTOM_PADDING) + keyboardHeight;

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

  function scrollForKeyboard() {
    if (messages.length > 0 || assistantThinking) {
      scrollChatToEnd(true);
      return;
    }

    chatScrollRef.current?.scrollTo({ y: KEYBOARD_BRIEFING_SCROLL_Y, animated: true });
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

  function setSidebarGestureProgress(nextProgress: number) {
    if (nextProgress > 0 && !sidebarVisible) setSidebarVisible(true);
    if (nextProgress > 0) setSidebarOpen(true);
    sidebarProgress.stopAnimation();
    sidebarProgress.setValue(Math.min(1, Math.max(0, nextProgress)));
  }

  async function refreshConversations() {
    const nextConversations = await listKivoConversations();
    setConversations(nextConversations);
  }

  function upsertConversation(conversation: KivoConversationSummary) {
    setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)].slice(0, 24));
  }

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom + 18);
      setKeyboardHeight(nextHeight);
      if (keyboardScrollTimerRef.current) clearTimeout(keyboardScrollTimerRef.current);
      keyboardScrollTimerRef.current = setTimeout(() => {
        scrollForKeyboard();
        keyboardScrollTimerRef.current = null;
      }, 110);
    });

    const didShow = Keyboard.addListener('keyboardDidShow', (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom + 18);
      setKeyboardHeight(nextHeight);
      scrollForKeyboard();
    });

    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    const didHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

    return () => {
      show.remove();
      didShow.remove();
      hide.remove();
      didHide.remove();
      if (keyboardScrollTimerRef.current) clearTimeout(keyboardScrollTimerRef.current);
    };
  }, [assistantThinking, insets.bottom, messages.length]);

  useEffect(() => {
    if (messages.length > 0 || assistantThinking) scrollChatToEnd(true);
  }, [assistantThinking, messages.length]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (keyboardScrollTimerRef.current) clearTimeout(keyboardScrollTimerRef.current);
      requestIdRef.current += 1;
      conversationLoadIdRef.current += 1;
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
    const existingConversationId = activeConversationId;
    const conversationTitle = createConversationTitle(message, Boolean(photoForMessage));

    requestIdRef.current = requestId;
    setMessages((current) => [...current, userMessage]);
    setSelectedPhoto(null);
    setComposerActive(false);
    setAssistantThinking(true);
    scrollChatToEnd(true);

    const conversation = existingConversationId
      ? conversations.find((item) => item.id === existingConversationId) ?? { id: existingConversationId, title: conversationTitle }
      : await createKivoConversation(conversationTitle);

    if (requestIdRef.current !== requestId) return;

    if (!existingConversationId) {
      setActiveConversationId(conversation.id);
      upsertConversation(conversation);
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
    const loadId = conversationLoadIdRef.current + 1;
    conversationLoadIdRef.current = loadId;
    requestIdRef.current += 1;
    setAssistantThinking(false);
    setSelectedPhoto(null);
    setComposerActive(false);
    setShowBriefingBlock(false);
    setActiveConversationId(conversationId);
    setMessages([]);

    const storedMessages = await loadKivoConversationMessages(conversationId);
    if (conversationLoadIdRef.current !== loadId) return;

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
    conversationLoadIdRef.current += 1;
    setAssistantThinking(false);
    setMessages([]);
    setSelectedPhoto(null);
    setActiveConversationId(null);
    setComposerActive(false);
    setShowBriefingBlock(true);
    animateSidebar(0);
    refreshConversations();
    setTimeout(() => chatScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
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
        onGestureProgress={setSidebarGestureProgress}
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

        <ScrollView
          ref={chatScrollRef}
          style={styles.chatPreview}
          contentContainerStyle={[styles.chatPreviewContent, { paddingBottom: chatBottomPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={!isStartBriefingOnly}
          scrollEnabled={!isStartBriefingOnly}
          onContentSizeChange={() => {
            if (messages.length > 0 || assistantThinking) scrollChatToEnd(false);
          }}
          onLayout={() => {
            if (messages.length > 0 || assistantThinking) scrollChatToEnd(false);
          }}
        >
          <KivoMessageList
            messages={messages}
            showBriefingBlock={showBriefingBlock}
            assistantThinking={assistantThinking}
            onOpenSources={setSourcesSheetSources}
          />
        </ScrollView>

        <KivoComposer
          onSubmit={handleSubmit}
          onOpenPlus={openPlusSheet}
          onComposingChange={setComposerActive}
          selectedPhoto={selectedPhoto}
          onRemovePhoto={() => setSelectedPhoto(null)}
        />
      </Animated.View>

      <KivoPlusSheet
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        onExpandedChange={setPlusExpanded}
        onSelectPhoto={(photo) => {
          setSelectedPhoto(photo);
          setComposerActive(true);
        }}
      />
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
  chatPreview: {
    flex: 1,
  },
  chatPreviewContent: {
    paddingHorizontal: 18,
  },
});
