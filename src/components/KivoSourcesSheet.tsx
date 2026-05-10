import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KivoSource } from '../lib/kivo-ai';
import { colors } from '../theme/colors';

type Props = {
  open: boolean;
  sources: KivoSource[];
  onClose: () => void;
};

type SheetSnap = 'peek' | 'expanded' | 'closed';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
  const peekHeight = Math.min(height * 0.72, 620);
  const expandedHeight = height - Math.max(insets.top + 10, 48);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const scrollYRef = useRef(0);
  const sheetHeight = useRef(new Animated.Value(peekHeight)).current;
  const translateY = useRef(new Animated.Value(height)).current;
  const currentHeightRef = useRef(peekHeight);
  const currentTranslateRef = useRef(height);
  const gestureStartHeightRef = useRef(peekHeight);

  function updateExpanded(nextExpanded: boolean) {
    if (expandedRef.current === nextExpanded) return;
    expandedRef.current = nextExpanded;
    setExpanded(nextExpanded);
  }

  function setSheetHeight(nextHeight: number) {
    const clamped = clamp(nextHeight, peekHeight, expandedHeight);
    currentHeightRef.current = clamped;
    sheetHeight.setValue(clamped);
  }

  function setSheetTranslate(nextTranslate: number) {
    const clamped = clamp(nextTranslate, 0, height + 40);
    currentTranslateRef.current = clamped;
    translateY.setValue(clamped);
  }

  function animateToSnap(snap: SheetSnap) {
    if (snap === 'closed') {
      updateExpanded(false);
      Animated.timing(translateY, {
        toValue: height + 40,
        duration: 220,
        easing: Easing.bezier(0.28, 0.92, 0.36, 1),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          currentTranslateRef.current = height + 40;
          onClose();
        }
      });
      return;
    }

    const nextExpanded = snap === 'expanded';
    const nextHeight = nextExpanded ? expandedHeight : peekHeight;
    updateExpanded(nextExpanded);

    Animated.parallel([
      Animated.spring(sheetHeight, {
        toValue: nextHeight,
        damping: 25,
        stiffness: 225,
        mass: 0.84,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 25,
        stiffness: 225,
        mass: 0.84,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      currentHeightRef.current = nextHeight;
      currentTranslateRef.current = 0;
    });
  }

  function closeWithAnimation() {
    animateToSnap('closed');
  }

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const mostlyVertical = Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.08;
        if (!mostlyVertical || Math.abs(gesture.dy) < 4) return false;
        if (!expandedRef.current) return true;
        return scrollYRef.current <= 1 && gesture.dy > 6;
      },
      onPanResponderGrant: () => {
        gestureStartHeightRef.current = currentHeightRef.current;
        sheetHeight.stopAnimation((value) => {
          currentHeightRef.current = value;
          gestureStartHeightRef.current = value;
        });
        translateY.stopAnimation((value) => {
          currentTranslateRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const startHeight = gestureStartHeightRef.current;

        if (gesture.dy < 0) {
          setSheetTranslate(0);
          setSheetHeight(startHeight - gesture.dy);
          if (startHeight - gesture.dy > expandedHeight - 42) updateExpanded(true);
          return;
        }

        if (startHeight > peekHeight + 1) {
          const nextHeight = Math.max(peekHeight, startHeight - gesture.dy);
          setSheetHeight(nextHeight);
          const overflow = Math.max(0, gesture.dy - (startHeight - peekHeight));
          setSheetTranslate(overflow);
          if (nextHeight < expandedHeight - 64) updateExpanded(false);
          return;
        }

        setSheetHeight(peekHeight);
        setSheetTranslate(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        const heightNow = currentHeightRef.current;
        const translateNow = currentTranslateRef.current;
        const middle = peekHeight + (expandedHeight - peekHeight) * 0.45;

        if (translateNow > 130 || gesture.vy > 1.05) {
          animateToSnap('closed');
          return;
        }

        if (gesture.vy < -0.42 || heightNow > middle) {
          animateToSnap('expanded');
          return;
        }

        animateToSnap('peek');
      },
      onPanResponderTerminate: () => {
        animateToSnap(currentHeightRef.current > peekHeight + (expandedHeight - peekHeight) * 0.5 ? 'expanded' : 'peek');
      },
    }),
    [expandedHeight, height, peekHeight, sheetHeight, translateY],
  );

  useEffect(() => {
    if (!open) return;
    expandedRef.current = false;
    setExpanded(false);
    scrollYRef.current = 0;
    currentHeightRef.current = peekHeight;
    currentTranslateRef.current = height + 40;
    sheetHeight.setValue(peekHeight);
    translateY.setValue(height + 40);
    requestAnimationFrame(() => animateToSnap('peek'));
  }, [height, open, peekHeight, sheetHeight, translateY]);

  if (!open) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel="Close sources" style={styles.backdrop} onPress={closeWithAnimation} />

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            paddingBottom: Math.max(18, insets.bottom + 6),
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleHitArea}>
            <View style={styles.handle} />
          </View>
        </View>
        <Text style={styles.title}>Sources</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={expanded}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={styles.content}
        >
          {sources.slice(0, 1).map((source, index) => (
            <SourceRow key={sourceKey(source, index)} source={source} featured />
          ))}

          {sources.length > 1 ? <Text style={styles.moreTitle}>More</Text> : null}

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
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 90,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.01)',
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
  handleWrap: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    marginBottom: 3,
  },
  handleHitArea: {
    width: 150,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d1d6',
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
