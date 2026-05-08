import { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { KivoComposer } from './KivoComposer';
import { KivoTodayDashboard } from './KivoTodayDashboard';
import { KivoTopBar } from './KivoTopBar';

export function KivoChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<string[]>([]);

  function handleSubmit(message: string) {
    setMessages((current) => [...current, message]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.softGlowTop} />
      <View style={styles.softGlowCenter} />
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <KivoTopBar onOpenModes={() => Keyboard.dismiss()} />
      </View>

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
            <Text style={styles.assistantText}>Kivo Native shell is ready. Agent streaming will be connected later.</Text>
          </View>
        </View>
      )}

      <KivoComposer onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  softGlowTop: {
    position: 'absolute',
    top: 72,
    left: 36,
    right: 36,
    height: 170,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  softGlowCenter: {
    position: 'absolute',
    top: 210,
    left: -70,
    right: -70,
    height: 420,
    borderRadius: 280,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  topBar: {
    zIndex: 20,
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
    backgroundColor: 'rgba(255,255,255,0.74)',
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
