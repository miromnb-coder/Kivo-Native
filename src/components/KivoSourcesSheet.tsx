import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KivoSource } from '../lib/kivo-ai';
import { colors } from '../theme/colors';

type Props = {
  open: boolean;
  sources: KivoSource[];
  onClose: () => void;
};

function sourceKey(source: KivoSource, index: number) {
  return `${source.url || source.domain || source.title}-${index}`;
}

async function openSource(source: KivoSource) {
  if (!source.url) return;

  try {
    await Linking.openURL(source.url);
  } catch {
    // Ignore invalid URL/open failures.
  }
}

export function KivoSourcesSheet({ open, sources, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const sheetHeight = Math.min(height * 0.72, 620);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 260 : 190,
      easing: Easing.bezier(0.2, 0.82, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  if (!open && sources.length === 0) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight + 30, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] });

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sources" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(18, insets.bottom + 6), transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Lähteet</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {sources.slice(0, 1).map((source, index) => (
            <SourceRow key={sourceKey(source, index)} source={source} featured />
          ))}

          {sources.length > 1 ? <Text style={styles.moreTitle}>Lisää</Text> : null}

          {sources.slice(1).map((source, index) => (
            <SourceRow key={sourceKey(source, index + 1)} source={source} />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function SourceRow({ source, featured = false }: { source: KivoSource; featured?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open source ${source.title}`}
      onPress={() => openSource(source)}
      style={({ pressed }) => [styles.sourceRow, featured && styles.featuredRow, pressed && styles.pressed]}
    >
      <View style={styles.sourceIconShell}>
        {source.faviconUrl ? (
          <Image source={{ uri: source.faviconUrl }} style={styles.sourceIcon} resizeMode="cover" />
        ) : (
          <View style={styles.sourceIconFallback}>
            <Feather name="zap" size={12} color="#ffffff" fill="#ffffff" />
          </View>
        )}
      </View>

      <View style={styles.sourceCopy}>
        <Text numberOfLines={1} style={styles.domain}>{source.domain || 'Source'}</Text>
        <Text numberOfLines={2} style={styles.sourceTitle}>{source.title || source.url}</Text>
        {source.date ? <Text numberOfLines={1} style={styles.date}>{source.date}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d1d6',
    marginBottom: 23,
  },
  title: {
    paddingHorizontal: 22,
    color: '#8f9098',
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  content: {
    paddingTop: 14,
    paddingBottom: 18,
  },
  sourceRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  featuredRow: {
    minHeight: 82,
  },
  sourceIconShell: {
    width: 32,
    height: 32,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIcon: {
    width: '100%',
    height: '100%',
  },
  sourceIconFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3b00',
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
  },
  domain: {
    color: '#1f2026',
    fontSize: 15.5,
    lineHeight: 20,
    letterSpacing: -0.28,
  },
  sourceTitle: {
    marginTop: 4,
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '500',
    letterSpacing: -0.62,
  },
  date: {
    marginTop: 5,
    color: '#9a9ba3',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  moreTitle: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 4,
    color: '#a0a1a8',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  pressed: {
    opacity: 0.62,
  },
});
