import { Feather, FontAwesome } from '@expo/vector-icons';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type KivoAuthMethod = 'apple' | 'google' | 'email' | 'signin';

type KivoAuthScreenProps = {
  loading?: boolean;
  onContinue: (method: KivoAuthMethod) => void;
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

export function KivoAuthScreen({ loading = false, onContinue }: KivoAuthScreenProps) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 780;
  const heroTop = Math.max(126, Math.min(156, height * 0.18));
  const buttonHeight = isCompact ? 56 : 58;
  const buttonGap = isCompact ? 12 : 14;
  const authBottom = isCompact ? 16 : 22;
  const sidePadding = width < 370 ? 24 : 32;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />

        <View style={[styles.hero, { top: heroTop }]}>
          <Text style={styles.wordmark}>Kivo</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.tagline}>
            Your personal AI operator.
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.description}>
            Plan your day, track what matters,
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.description, styles.descriptionSecond]}>
            and let Kivo help before you ask.
          </Text>
        </View>

        <View style={[styles.authArea, { bottom: authBottom, paddingHorizontal: sidePadding }]}>
          <View style={[styles.buttons, { gap: buttonGap }]}>
            <AuthButton label="Continue with Apple" method="apple" icon="apple" height={buttonHeight} loading={loading} onPress={onContinue} />
            <AuthButton label="Continue with Google" method="google" icon="google" height={buttonHeight} loading={loading} onPress={onContinue} />
            <AuthButton label="Continue with email" method="email" icon="email" height={buttonHeight} secondary loading={loading} onPress={onContinue} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            disabled={loading}
            onPress={() => onContinue('signin')}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
