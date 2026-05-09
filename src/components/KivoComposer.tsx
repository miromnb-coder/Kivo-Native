import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Keyboard, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, TextInput, TextInputContentSizeChangeEventData, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { RecentPhoto } from './KivoPlusSheet';

type Props = {
  onSubmit?: (message: string) => void;
  onOpenPlus?: () => void;
  onComposingChange?: (composing: boolean) => void;
  selectedPhoto?: RecentPhoto | null;
  onRemovePhoto?: () => void;
};

const MIN_INPUT_HEIGHT = 23;
const MAX_INPUT_HEIGHT = 132;
const BASE_COMPOSER_HEIGHT = 103;
const BASE_ATTACHMENT_COMPOSER_HEIGHT = 171;
const COMPOSER_FIXED_SPACE = 80;
const ATTACHMENT_COMPOSER_FIXED_SPACE = 148;
const INPUT_LINE_HEIGHT = 22;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimateDraftHeight(text: string, screenWidth: number) {
  if (!text) return MIN_INPUT_HEIGHT;

  const inputWidth = Math.max(180, screenWidth - 72);
  const approximateCharsPerLine = Math.max(24, Math.floor(inputWidth / 8.4));
  const visualLineCount = text.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / approximateCharsPerLine));
  }, 0);

  return Math.max(MIN_INPUT_HEIGHT, visualLineCount * INPUT_LINE_HEIGHT + 2);
}

export function KivoComposer({ onSubmit, onOpenPlus, onComposingChange, selectedPhoto, onRemovePhoto }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [value, setValue] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [draftMeasuredHeight, setDraftMeasuredHeight] = useState(MIN_INPUT_HEIGHT);
  const inputRef = useRef<TextInput>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const hasAttachment = Boolean(selectedPhoto);
  const canSend = value.trim().length > 0 || hasAttachment;

  const draftNaturalHeight = Math.max(draftMeasuredHeight, estimateDraftHeight(value, width));
  const inputHeight = clamp(draftNaturalHeight, MIN_INPUT_HEIGHT, MAX_INPUT_HEIGHT);
  const inputScrollEnabled = draftNaturalHeight > MAX_INPUT_HEIGHT + 2;
  const composerHeight = useMemo(() => {
    const fixedSpace = hasAttachment ? ATTACHMENT_COMPOSER_FIXED_SPACE : COMPOSER_FIXED_SPACE;
    const minimumHeight = hasAttachment ? BASE_ATTACHMENT_COMPOSER_HEIGHT : BASE_COMPOSER_HEIGHT;

    return Math.max(minimumHeight, fixedSpace + inputHeight);
  }, [hasAttachment, inputHeight]);

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
    onComposingChange?.(hasAttachment);
    animateOffset(0, 220);
  }

  function openPlusSheet() {
    dismissKeyboard();
    onOpenPlus?.();
  }

  function handleContentSizeChange(event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) {
    const nextHeight = Math.ceil(event.nativeEvent.contentSize.height);
    setDraftMeasuredHeight(Math.max(MIN_INPUT_HEIGHT, nextHeight));
  }

  useEffect(() => {
    onComposingChange?.(keyboardOpen || hasAttachment);
  }, [hasAttachment, keyboardOpen, onComposingChange]);

  useEffect(() => {
    if (value.length === 0) {
      setDraftMeasuredHeight(MIN_INPUT_HEIGHT);
    }
  }, [value]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOpen(true);
      onComposingChange?.(true);
      const height = Math.max(0, event.endCoordinates.height - insets.bottom + 10);
      animateOffset(height, Platform.OS === 'ios' ? event.duration || 260 : 220);
    });

    const hide = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardOpen(false);
      onComposingChange?.(hasAttachment);
      animateOffset(0, Platform.OS === 'ios' ? event.duration || 240 : 220);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [hasAttachment, insets.bottom, offset, onComposingChange]);

  function submit() {
    const message = value.trim();
    if (!message && !hasAttachment) return;
    setValue('');
    setDraftMeasuredHeight(MIN_INPUT_HEIGHT);
    inputRef.current?.blur();
    onSubmit?.(message || 'Image attached');
    onRemovePhoto?.();
    Keyboard.dismiss();
    setKeyboardOpen(false);
    onComposingChange?.(false);
    animateOffset(0, 220);
  }

  const actionIcon = canSend ? 'arrow-up' : keyboardOpen ? 'chevron-down' : 'arrow-up';
  const actionEnabled = canSend || keyboardOpen;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {keyboardOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
          style={styles.dismissLayer}
          onPress={dismissKeyboard}
        />
      ) : null}

      <Animated.View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(18, insets.bottom - 10), transform: [{ translateY: Animated.multiply(offset, -1) }] }]}>
        <View style={[styles.composer, { height: composerHeight }, hasAttachment && styles.composerWithAttachment]}>
          {selectedPhoto ? (
            <View style={styles.attachmentRow}>
              <View style={styles.attachmentThumbWrap}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.attachmentThumb} resizeMode="cover" />
                <Pressable accessibilityRole="button" accessibilityLabel="Remove selected photo" hitSlop={8} style={({ pressed }) => [styles.removeAttachment, pressed && styles.pressed]} onPress={onRemovePhoto}>
                  <Feather name="x" size={13} color="#ffffff" strokeWidth={2.2} />
                </Pressable>
              </View>
              <View style={styles.attachmentCopy}>
                <Text numberOfLines={1} style={styles.attachmentTitle}>Image selected</Text>
                <Text numberOfLines={1} style={styles.attachmentSub}>Ready to send with your message</Text>
              </View>
            </View>
          ) : null}

          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            onContentSizeChange={handleContentSizeChange}
            onFocus={() => {
              setKeyboardOpen(true);
              onComposingChange?.(true);
            }}
            onBlur={() => {
              setKeyboardOpen(false);
              onComposingChange?.(hasAttachment);
            }}
            placeholder="Ask anything or assign a task"
            placeholderTextColor="#a9a9b0"
            multiline
            scrollEnabled={inputScrollEnabled}
            style={[styles.input, { height: inputHeight }]}
            selectionColor={colors.text}
            keyboardAppearance="light"
            textAlignVertical="top"
          />
          <View style={[styles.controls, hasAttachment && styles.controlsWithAttachment]}>
            <View style={styles.leftControls}>
              <CircleButton icon="plus" onPress={openPlusSheet} />
              <CircleButton icon="sliders" />
            </View>
            <View style={styles.rightControls}>
              <CircleButton icon="message-circle" onPress={dismissKeyboard} />
              <CircleButton icon="mic" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={canSend ? 'Send message' : keyboardOpen ? 'Hide keyboard' : 'Send disabled'}
                onPress={canSend ? submit : dismissKeyboard}
                disabled={!actionEnabled}
                style={({ pressed }) => [
                  styles.circle,
                  styles.sendButton,
                  canSend ? styles.sendActive : styles.sendIdle,
                  pressed && actionEnabled && styles.pressed,
                ]}
              >
                <Feather name={actionIcon} size={21} color={canSend ? '#ffffff' : '#cfcfd4'} strokeWidth={1.85} />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function CircleButton({ icon, onPress }: { icon: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.circle, styles.controlCircle, pressed && styles.pressed]}
    >
      <Feather name={icon} size={20} color={colors.text} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
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
    borderColor: 'rgba(0,0,0,0.028)',
    backgroundColor: '#fbfbfc',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 7,
    shadowColor: '#0f172a',
    shadowOpacity: 0.035,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
  },
  composerWithAttachment: {
    borderRadius: 36,
  },
  attachmentRow: {
    height: 62,
    marginBottom: 11,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.045)',
    backgroundColor: 'rgba(247,247,248,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    gap: 11,
  },
  attachmentThumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    overflow: 'visible',
  },
  attachmentThumb: {
    width: 46,
    height: 46,
    borderRadius: 15,
  },
  removeAttachment: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(25,25,28,0.82)',
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCopy: {
    flex: 1,
    minWidth: 0,
  },
  attachmentTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.36,
  },
  attachmentSub: {
    marginTop: 4,
    color: '#8f9098',
    fontSize: 12.5,
    letterSpacing: -0.25,
  },
  input: {
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 0,
    color: colors.text,
    fontSize: 16.8,
    lineHeight: INPUT_LINE_HEIGHT,
    letterSpacing: -0.42,
  },
  controls: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsWithAttachment: {
    marginTop: 14,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.048)',
    backgroundColor: '#fbfbfc',
  },
  sendButton: {
    marginLeft: 1,
  },
  sendIdle: {
    backgroundColor: '#efeff1',
  },
  sendActive: {
    backgroundColor: colors.text,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
});
