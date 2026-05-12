import { StyleSheet, View } from 'react-native';
import { KivoTodayHero } from './KivoTodayHero';
import { KivoTodayContextLine } from './KivoTodayContextLine';
import { KivoTodaySection, KivoTodayActionLine, KivoTodayBodyText, KivoTodayBullet } from './KivoTodaySection';
import { KivoTodayTimeline } from './KivoTodayTimeline';
import { KivoTodayComposerHint } from './KivoTodayComposerHint';

type TimelineItem = {
  time: string;
  title: string;
};

type Props = {
  preferredName?: string | null;
  connectedSources?: string[];
  limitedContext?: boolean;
  focusText?: string;
  timelineItems?: TimelineItem[];
  needsAttention?: string[];
};

const defaultNeedsAttention = [
  '2 important emails',
  '1 file to review',
  '1 follow-up waiting',
];

export function KivoTodayBriefing({
  preferredName = 'Miro',
  connectedSources = ['Calendar', 'Mail', 'Drive'],
  limitedContext = false,
  focusText = 'Finish the product design review, send the most important update, and protect one deep work block this afternoon.',
  timelineItems,
  needsAttention = defaultNeedsAttention,
}: Props) {
  return (
    <View style={styles.wrap}>
      <KivoTodayHero preferredName={preferredName} />
      <KivoTodayContextLine connectedSources={connectedSources} limited={limitedContext} />

      <KivoTodaySection tone="focus" title="Focus for today">
        <KivoTodayBodyText>{focusText}</KivoTodayBodyText>
      </KivoTodaySection>

      <KivoTodaySection tone="time" title="Coming up">
        <KivoTodayTimeline items={timelineItems} />
      </KivoTodaySection>

      <KivoTodaySection tone="notice" title="Needs attention">
        {needsAttention.map((item) => (
          <KivoTodayBullet key={item}>{item}</KivoTodayBullet>
        ))}
      </KivoTodaySection>

      <KivoTodaySection tone="assist" title="I can help with" showDivider={false}>
        <KivoTodayActionLine icon="edit-3">Draft replies and updates</KivoTodayActionLine>
        <KivoTodayActionLine icon="file-text">Summarize notes and files</KivoTodayActionLine>
        <KivoTodayActionLine icon="corner-up-right">Plan the next step</KivoTodayActionLine>
      </KivoTodaySection>

      <KivoTodayComposerHint />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 86,
    paddingBottom: 6,
  },
});
