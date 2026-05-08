import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
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

export function KivoChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<string[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusExpanded, setPlusExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appScale = useRef(new Animated.Value(1)).current;
  const appRadius = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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

  function handleSubmit(message: string) {
    setMessages((current) => [...current, message]);
  }

  function openPlusSheet() {
    Keyboard.dismiss();
    setPlusOpen(true);
  }

  function closePlusSheet() {
    setPlusExpanded(false);
    setPlusOpen(false);
  }

  function openSidebar() {
    Keyboard.dismiss();
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function startNewChat() {
    setMessages([]);
    setSidebarOpen(false);
  }

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.blackBackdrop, { opacity: backdropOpacity }]} />

      <Animated.View
        style={[
          styles.appCard,
          {
            borderRadius: appRadius,
            transform: [{ scale: appScale }],
          },
        ]}
      >
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

      <KivoSidebarOverlay
        open={sidebarOpen}
        conversations={sampleConversations}
        activeConversationId={null}
        onClose={closeSidebar}
        onNewChat={startNewChat}
      />

      <KivoPlusSheet open={plusOpen} onClose={closePlusSheet} onExpandedChange={setPlusExpanded} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  appCard: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
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
