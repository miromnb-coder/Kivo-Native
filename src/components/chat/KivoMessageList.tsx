import { Image, StyleSheet, Text, View } from 'react-native';
import type { KivoSource } from '../../lib/kivo-ai';
import { colors } from '../../theme/colors';
import { KivoMessageActionBar } from '../KivoMessageActionBar';
import { KivoTodayBriefing } from '../today/KivoTodayBriefing';
import { KivoAssistantContent } from './KivoAssistantContent';
import { KivoThinkingLine } from './KivoThinkingLine';
import type { ChatMessage } from './types';

type Props = {
  messages: ChatMessage[];
  showBriefingBlock: boolean;
  assistantThinking: boolean;
  onOpenSources: (sources: KivoSource[]) => void;
};

export function KivoMessageList({ messages, showBriefingBlock, assistantThinking, onOpenSources }: Props) {
  return (
    <>
      {showBriefingBlock ? <KivoTodayBriefing /> : null}

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
              onOpenSources={() => onOpenSources(item.sources ?? [])}
            />
          </View>
        )
      ))}

      {assistantThinking ? <KivoThinkingLine /> : null}
    </>
  );
}

const styles = StyleSheet.create({
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
});
