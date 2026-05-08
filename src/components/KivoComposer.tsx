import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  onSubmit?: (message: string) => void;
};

export function KivoComposer({ onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const canSend = value.trim().length > 0;

  function animateOffset(toValue: number, duration = 240) {
    Animated.timing(offset, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  }

  function dismissKeyboard() {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setKeyboardOpen(false);
    animateOffset(0, 220);
  }

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOpen(true);
      const height = Math.max(0, event.endCoordinates.height - insets.bottom + 10);
      animateOffset(height, Platform.OS === 'ios' ? event.duration || 260 : 220);
    });

    const hide = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardOpen(false);
      animateOffset(0, Platform.OS === 'ios' ? event.duration || 240 : 220);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [insets.bottom, offset]);

  function submit() {
    const message = value.trim();
    if (!message) return;
    setValue('');
    inputRef.current?.blur();
    onSubmit?.(message);
    Keyboard.dismiss();
    setKeyboardOpen(false);
    animateOffset(0, 220);
  }

  const actionIcon = canSend ? 'arrow-up' : keyboardOpen ? 'chevron-down' : 'arrow-up';
  const actionEnabled = canSend || keyboardOpen;

  return (
    <Animated.View style={[styles.wrap, { paddingBottom: insets.bottom + 12, transform: [{ translateY: Animated.multiply(offset, -1) }] }]}>
      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder="Ask anything or assign a task"
          placeholderTextColor="#a7a7ad"
          multiline
          style={styles.input}
          selectionColor={colors.text}
        />
        <View style={styles.controls}>
          <View style={styles.leftControls}>
            <CircleButton icon="plus" />
            <CircleButton icon="sliders" />
          </View>
          <View style={styles.rightControls}>
            <CircleButton icon="message-circle" onPress={dismissKeyboard} />
            <CircleButton icon="mic" />
            <Pressable
              onPress={canSend ? submit : dismissKeyboard}
              disabled={!actionEnabled}
              style={[styles.circle, canSend ? styles.sendActive : styles.sendIdle]}
            >
              <Feather name={actionIcon} size={22} color={canSend ? '#ffffff' : '#cfcfd4'} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function CircleButton({ icon, onPress }: { icon: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.circle, styles.controlCircle, pressed && styles.pressed]}>
      <Feather name={icon} size={20} color={colors.text} strokeWidth={1.7} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  composer: {
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eeeef1',
    backgroundColor: '#f9f9fa',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  input: {
    minHeight: 24,
    maxHeight: 96,
    paddingHorizontal: 4,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.35,
  },
  controls: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    gap: 14,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9e9ec',
    backgroundColor: '#f9f9fa',
  },
  sendIdle: {
    backgroundColor: '#eeeeef',
  },
  sendActive: {
    backgroundColor: colors.text,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
});
