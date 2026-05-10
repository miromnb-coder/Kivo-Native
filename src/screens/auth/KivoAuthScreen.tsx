import { Feather, FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type KivoAuthMethod = 'apple' | 'google' | 'email' | 'signin' | 'skip';

type KivoAuthScreenProps = {
  loading?: boolean;
  onContinue: (method: KivoAuthMethod, email?: string) => void;
};

function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <Image
        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
        style={styles.googleLogo}
        resizeMode="contain"
      />
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  method: KivoAuthMethod;
  loading?: boolean;
  secondary?: boolean;
  icon: 'apple' | 'google' | 'email';
  height: number;
  onPress: (method: KivoAuthMethod) => void;
};

function AuthButton({ label, method, loading, secondary, icon, height, onPress }: AuthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={() => onPress(method)}
      style={({ pressed }) => [
        styles.authButton,
        { height },
        secondary && styles.authButtonSecondary,
        pressed && !loading ? styles.authButtonPressed : null,
        loading ? styles.authButtonDisabled : null,
      ]}
    >
      <View style={styles.buttonIconSlot}>
        {icon === 'apple' ? <FontAwesome name="apple" size={29} color="#030406" /> : null}
        {icon === 'google' ? <GoogleMark /> : null}
        {icon === 'email' ? <Feather name="mail" size={29} color="#111216" strokeWidth={1.85} /> : null}
      </View>

      <Text numberOfLines={1} style={[styles.authButtonText, secondary && styles.authButtonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

type EmailAuthScreenProps = {
  email: string;
  loading: boolean;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onSubmit: () => void;
};

function KivoEmailAuthScreen({ email, loading, onBack, onChangeEmail, onSubmit }: EmailAuthScreenProps) {
  const { height, width } = useWindowDimensions();
  const sidePadding = width < 370 ? 24 : 32;
  const contentTop = Math.max(138, Math.min(214, height * 0.22));

  function handleBack() {
    Keyboard.dismiss();
    onBack();
  }

  function handleSubmit() {
    Keyboard.dismiss();
    onSubmit();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.emailScreen}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss keyboard" style={styles.emailDismissLayer} onPress={Keyboard.dismiss} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          disabled={loading}
          onPress={handleBack}
          style={({ pressed }) => [styles.topBackButton, pressed && !loading ? styles.softPressed : null]}
        >
          <Feather name="chevron-left" size={28} color="#4d5058" strokeWidth={1.9} />
          <Text style={styles.topBackText}>Back</Text>
        </Pressable>

        <View pointerEvents="box-none" style={[styles.emailContent, { paddingHorizontal: sidePadding, paddingTop: contentTop }]}>
          <Text style={styles.emailWordmark}>Kivo</Text>
          <Text style={styles.emailScreenTitle}>Continue with email</Text>
          <Text style={styles.emailScreenSubtitle}>Enter your email to receive</Text>
          <Text style={[styles.emailScreenSubtitle, styles.emailScreenSubtitleSecond]}>a secure sign-in link.</Text>

          <View style={styles.emailInputShell}>
            <Feather name="mail" size={23} color="#8f929a" strokeWidth={1.65} />
            <TextInput
              value={email}
              onChangeText={onChangeEmail}
              placeholder="you@example.com"
              placeholderTextColor="#92949c"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleSubmit}
              style={styles.emailScreenInput}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send sign-in link"
            disabled={loading}
            onPress={handleSubmit}
            style={({ pressed }) => [styles.emailPrimaryButton, pressed && !loading ? styles.authButtonPressed : null, loading ? styles.authButtonDisabled : null]}
          >
            <Text style={styles.emailPrimaryButtonText}>Send sign-in link</Text>
          </Pressable>

          <Pressable disabled={loading} style={({ pressed }) => [styles.passwordInsteadButton, pressed && !loading ? styles.softPressed : null]}>
            <Text style={styles.passwordInsteadText}>Use password instead</Text>
          </Pressable>
        </View>

        <View pointerEvents="box-none" style={[styles.emailFooter, { paddingHorizontal: sidePadding }]}>
          <View style={styles.emailFooterTrustLine}>
            <Feather name="lock" size={13.5} color="#8e9098" strokeWidth={1.65} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.trustText}>
              Private by design. You control your data.
            </Text>
          </View>

          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.legalText}>
            By continuing, you agree to <Text style={styles.legalLink}>Terms</Text> and <Text style={styles.legalLink}>Privacy</Text>.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#202024" />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function KivoAuthScreen({ loading = false, onContinue }: KivoAuthScreenProps) {
  const { height, width } = useWindowDimensions();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const isCompact = height < 780;
  const heroTop = Math.max(126, Math.min(156, height * 0.18));
  const buttonHeight = isCompact ? 56 : 58;
  const buttonGap = isCompact ? 12 : 14;
  const authBottom = isCompact ? 16 : 22;
  const sidePadding = width < 370 ? 24 : 32;

  function handleMethod(method: KivoAuthMethod) {
    if (method === 'email' || method === 'signin') {
      Keyboard.dismiss();
      setEmailMode(true);
      return;
    }

    Keyboard.dismiss();
    onContinue(method);
  }

  function handleEmailSubmit() {
    onContinue('email', email.trim());
  }

  if (emailMode) {
    return (
      <KivoEmailAuthScreen
        email={email}
        loading={loading}
        onBack={() => setEmailMode(false)}
        onChangeEmail={setEmail}
        onSubmit={handleEmailSubmit}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip sign in"
          disabled={loading}
          onPress={() => onContinue('skip')}
          style={({ pressed }) => [styles.topSkipButton, pressed && !loading ? styles.softPressed : null]}
        >
          <Text style={styles.topSkipText}>Skip</Text>
        </Pressable>

        <View style={[styles.hero, { top: heroTop }]}>
          <Text style={styles.wordmark}>Kivo</Text>
          <Text style={styles.tagline}>Your personal AI operator.</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.description}>Plan your day, track what matters,</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.description, styles.descriptionSecond]}>and let Kivo help before you ask.</Text>
        </View>

        <View style={[styles.authArea, { bottom: authBottom, paddingHorizontal: sidePadding }]}>
          <View style={[styles.buttons, { gap: buttonGap }]}>
            <AuthButton label="Continue with Apple" method="apple" icon="apple" height={buttonHeight} loading={loading} onPress={handleMethod} />
            <AuthButton label="Continue with Google" method="google" icon="google" height={buttonHeight} loading={loading} onPress={handleMethod} />
            <AuthButton label="Continue with email" method="email" icon="email" height={buttonHeight} secondary loading={loading} onPress={handleMethod} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            disabled={loading}
            onPress={() => handleMethod('signin')}
            style={({ pressed }) => [styles.signInRow, pressed && !loading ? styles.softPressed : null]}
          >
            <Text numberOfLines={1} style={styles.signInMuted}>Already have an account?</Text>
            <Text numberOfLines={1} style={styles.signInLink}>Sign in</Text>
          </Pressable>

          <View style={styles.trustLine}>
            <Feather name="lock" size={13.5} color="#8e9098" strokeWidth={1.65} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.trustText}>
              Private by design. You control your data.
            </Text>
          </View>

          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.legalText}>
            By continuing, you agree to <Text style={styles.legalLink}>Terms</Text> and <Text style={styles.legalLink}>Privacy</Text>.
          </Text>

          {loading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#202024" />
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f6',
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f5f5f6',
  },
  emailScreen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f5f5f6',
  },
  emailDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topGlow: {
    position: 'absolute',
    top: 86,
    left: '8%',
    right: '8%',
    height: 230,
    borderRadius: 190,
    backgroundColor: 'rgba(255,255,255,0.34)',
    opacity: 0.38,
    transform: [{ scaleX: 1.18 }],
  },
  bottomGlow: {
    position: 'absolute',
    left: '-18%',
    right: '-18%',
    bottom: -104,
    height: 286,
    borderRadius: 230,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  hero: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  wordmark: {
    color: '#0d1117',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 76,
    fontWeight: '700',
    letterSpacing: -5.6,
    lineHeight: 84,
    includeFontPadding: false,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 10,
    width: '100%',
    color: '#4a4c53',
    fontSize: 22.5,
    fontWeight: '400',
    letterSpacing: -0.72,
    lineHeight: 29,
    textAlign: 'center',
  },
  description: {
    marginTop: 27,
    color: '#51535a',
    fontSize: 19,
    fontWeight: '400',
    letterSpacing: -0.48,
    lineHeight: 27,
    textAlign: 'center',
  },
  descriptionSecond: {
    marginTop: 0,
  },
  authArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  buttons: {},
  authButton: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.055)',
    backgroundColor: 'rgba(255,255,255,0.91)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.046,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 13 },
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  authButtonSecondary: {
    backgroundColor: 'rgba(250,250,251,0.58)',
    borderColor: 'rgba(0,0,0,0.052)',
    shadowOpacity: 0.018,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  authButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.988 }],
  },
  authButtonDisabled: {
    opacity: 0.74,
  },
  buttonIconSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    flex: 1,
    color: '#111216',
    fontSize: 20.5,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  authButtonTextSecondary: {
    fontWeight: '500',
  },
  googleMark: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 29,
    height: 29,
  },
  topSkipButton: {
    position: 'absolute',
    top: 15,
    left: 22,
    zIndex: 3,
    minHeight: 44,
    minWidth: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topSkipText: {
    color: '#4d5058',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.38,
  },
  topBackButton: {
    position: 'absolute',
    top: 15,
    left: 22,
    zIndex: 3,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  topBackText: {
    color: '#4d5058',
    fontSize: 19,
    fontWeight: '400',
    letterSpacing: -0.45,
  },
  emailContent: {
    zIndex: 2,
    alignItems: 'center',
  },
  emailWordmark: {
    color: '#0d1117',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -5.3,
    lineHeight: 80,
    includeFontPadding: false,
    textAlign: 'center',
  },
  emailScreenTitle: {
    marginTop: 24,
    color: '#4a4c53',
    fontSize: 22.5,
    fontWeight: '400',
    letterSpacing: -0.72,
    lineHeight: 29,
    textAlign: 'center',
  },
  emailScreenSubtitle: {
    marginTop: 24,
    color: '#51535a',
    fontSize: 17.5,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 24,
    textAlign: 'center',
  },
  emailScreenSubtitleSecond: {
    marginTop: 0,
  },
  emailInputShell: {
    width: '100%',
    height: 60,
    marginTop: 44,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.085)',
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  emailScreenInput: {
    flex: 1,
    height: 58,
    color: '#111216',
    fontSize: 17,
    letterSpacing: -0.35,
  },
  emailPrimaryButton: {
    width: '100%',
    height: 62,
    marginTop: 20,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.045)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.038,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailPrimaryButtonText: {
    color: '#111216',
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  passwordInsteadButton: {
    minHeight: 48,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordInsteadText: {
    color: '#4d5058',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.34,
  },
  emailFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 35,
    zIndex: 2,
  },
  emailFooterTrustLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInRow: {
    marginTop: 32,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  signInMuted: {
    color: '#696b72',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.45,
  },
  signInLink: {
    color: '#111216',
    fontSize: 18.5,
    fontWeight: '700',
    letterSpacing: -0.48,
  },
  softPressed: {
    opacity: 0.68,
  },
  trustLine: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trustText: {
    color: '#747780',
    fontSize: 13.8,
    fontWeight: '400',
    letterSpacing: -0.28,
  },
  legalText: {
    marginTop: 24,
    color: '#6f7179',
    fontSize: 13.6,
    fontWeight: '400',
    letterSpacing: -0.24,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    color: '#51535b',
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    right: 32,
    bottom: 24,
    zIndex: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
