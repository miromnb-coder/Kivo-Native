import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export function KivoThinkingLine() {
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

const styles = StyleSheet.create({
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
