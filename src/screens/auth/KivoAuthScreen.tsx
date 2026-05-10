import { Feather, FontAwesome } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type KivoAuthMethod = 'apple' | 'google' | 'email' | 'signin';

type KivoAuthScreenProps = {
  loading?: boolean;
  onContinue: (method: KivoAuthMethod) => void;
};

function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <Text style={styles.googleLetter}>G</Text>
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  method: KivoAuthMethod;
  loading?: boolean;
  secondary?: boolean;
  icon: 'apple' | 'google' | 'email';
  onPress: (method: KivoAuthMethod) => void;
};

function AuthButton({ label, method, loading, secondary, icon, onPress }: AuthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={() => onPress(method)}
      style={({ pressed }) => [
        styles.authButton,
        secondary && styles.authButtonSecondary,
        pressed && !loading ? styles.authButtonPressed : null,
        loading ? styles.authButtonDisabled : null,
      ]}
    >
      <View style={styles.buttonIconSlot}>
        {icon === 'apple' ? <FontAwesome name="apple" size={31} color="#030406" /> : null}
        {icon === 'google' ? <GoogleMark /> : null}
        {icon === 'email' ? <Feather name="mail" size={31} color="#111216" strokeWidth={1.85} /> : null}
      </View>

      <Text style={[styles.authButtonText, secondary && styles.authButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function KivoAuthScreen({ loading = false, onContinue }: KivoAuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />

        <View style={styles.hero}>
          <Text style={styles.wordmark}>Kivo</Text>
          <Text style={styles.tagline}>Your personal AI operator.</Text>
          <Text style={styles.description}>Plan your day, track what matters,</Text>
          <Text style={[styles.description, styles.descriptionSecond]}>and let Kivo help before you ask.</Text>
        </View>

        <View style={styles.authArea}>
          <View style={styles.buttons}>
            <AuthButton label="Continue with Apple" method="apple" icon="apple" loading={loading} onPress={onContinue} />
            <AuthButton label="Continue with Google" method="google" icon="google" loading={loading} onPress={onContinue} />
            <AuthButton label="Continue with email" method="email" icon="email" secondary loading={loading} onPress={onContinue} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            disabled={loading}
            onPress={() => onContinue('signin')}
            style={({ pressed }) => [styles.signInRow, pressed && !loading ? styles.softPressed : null]}
          >
            <Text style={styles.signInMuted}>Already have an account?</Text>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>

          <View style={styles.trustLine}>
            <Feather name="lock" size={14} color="#8e9098" strokeWidth={1.65} />
            <Text style={styles.trustText}>Private by design. You control your data.</Text>
          </View>

          <Text style={styles.legalText}>
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
    top: 56,
    left: '12%',
    right: '12%',
    height: 230,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.54)',
    opacity: 0.82,
    transform: [{ scaleX: 1.22 }],
  },
  bottomGlow: {
    position: 'absolute',
    left: '-16%',
    right: '-16%',
    bottom: -82,
    height: 310,
    borderRadius: 240,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 286,
  },
  wordmark: {
    color: '#0d1117',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 78,
    fontWeight: '700',
    letterSpacing: -5.8,
    lineHeight: 88,
    includeFontPadding: false,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 10,
    color: '#4a4c53',
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: -0.74,
    lineHeight: 31,
    textAlign: 'center',
  },
  description: {
    marginTop: 27,
    color: '#51535a',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: 'center',
  },
  descriptionSecond: {
    marginTop: 0,
  },
  authArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 23,
  },
  buttons: {
    gap: 16,
  },
  authButton: {
    height: 64,
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
    fontSize: 21.5,
    fontWeight: '600',
    letterSpacing: -0.62,
    lineHeight: 27,
  },
  authButtonTextSecondary: {
    fontWeight: '500',
  },
  googleMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    color: '#4285f4',
    fontSize: 33,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 36,
  },
  signInRow: {
    marginTop: 40,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  signInMuted: {
    color: '#696b72',
    fontSize: 18.5,
    fontWeight: '400',
    letterSpacing: -0.45,
  },
  signInLink: {
    color: '#111216',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.48,
  },
  softPressed: {
    opacity: 0.68,
  },
  trustLine: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trustText: {
    color: '#747780',
    fontSize: 14.5,
    fontWeight: '400',
    letterSpacing: -0.28,
  },
  legalText: {
    marginTop: 29,
    color: '#6f7179',
    fontSize: 15.5,
    fontWeight: '400',
    letterSpacing: -0.26,
    lineHeight: 20,
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
