import { Feather } from '@expo/vector-icons';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { KivoSource } from '../lib/kivo-ai';

type Props = {
  messageText: string;
  sources?: KivoSource[];
  onOpenSources?: () => void;
};

const MAX_VISIBLE_SOURCE_ICONS = 3;

function sourceKey(source: KivoSource, index: number) {
  return `${source.url || source.domain || source.title}-${index}`;
}

export function KivoMessageActionBar({ messageText, sources = [], onOpenSources }: Props) {
  const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCE_ICONS);
  const hasSources = sources.length > 0;

  async function shareMessage() {
    const clean = messageText.trim();
    if (!clean) return;

    try {
      await Share.share({ message: clean });
    } catch {
      // Ignore share sheet cancellation.
    }
  }

  return (
    <View style={styles.shell}>
      <View style={styles.leftActions}>
        <ActionIcon icon="copy" label="Copy answer" />
        <ActionIcon icon="volume-2" label="Read answer" />
        <ActionIcon icon="thumbs-up" label="Good answer" />
        <ActionIcon icon="thumbs-down" label="Bad answer" />
        <ActionIcon icon="share" label="Share answer" onPress={shareMessage} />
        <ActionIcon icon="more-horizontal" label="More actions" />
      </View>

      {hasSources ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open sources"
          hitSlop={8}
          onPress={onOpenSources}
          style={({ pressed }) => [styles.sourcesButton, pressed && styles.pressed]}
        >
          <View style={styles.sourceIcons}>
            {visibleSources.map((source, index) => (
              <View key={sourceKey(source, index)} style={[styles.sourceIconWrap, index > 0 && styles.sourceIconOverlap]}>
                {source.faviconUrl ? (
                  <Image source={{ uri: source.faviconUrl }} style={styles.sourceIconImage} resizeMode="cover" />
                ) : (
                  <View style={styles.sourceIconFallback}>
                    <Text style={styles.sourceIconFallbackText}>{(source.domain || source.title || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.sourcesText}>Lähteet</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionIcon({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Feather name={icon} size={18} color="#5f6068" strokeWidth={1.85} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 42,
    marginTop: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    width: 31,
    height: 31,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcesButton: {
    minHeight: 31,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 3,
    paddingRight: 10,
  },
  sourceIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: '#f2f2f4',
  },
  sourceIconOverlap: {
    marginLeft: -8,
  },
  sourceIconImage: {
    width: '100%',
    height: '100%',
  },
  sourceIconFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  sourceIconFallbackText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  sourcesText: {
    color: '#5f6068',
    fontSize: 13.4,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.97 }],
  },
});
