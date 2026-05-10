import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { KivoChatScreenStreaming } from '@/components/KivoChatScreenStreaming';
import { getKivoSession, supabase } from '@/lib/supabase';
import { KivoAuthScreen, type KivoAuthMethod } from '@/screens/auth/KivoAuthScreen';

const KIVO_NATIVE_AUTH_REDIRECT_TO = 'kivonative://auth/callback';

function getAuthCodeFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code');
  } catch {
    const codeMatch = url.match(/[?&]code=([^&]+)/);
    return codeMatch ? decodeURIComponent(codeMatch[1]) : null;
  }
}

export default function Index() {
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) await handleIncomingAuthUrl(initialUrl);

        const session = await getKivoSession();
        if (mounted) setIsSignedIn(Boolean(session));
      } catch (error) {
        console.warn('Failed to load Kivo session', error);
        if (mounted) setIsSignedIn(false);
      } finally {
        if (mounted) setBooting(false);
      }
    }

    loadSession();

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingAuthUrl(url).catch((error) => {
        console.warn('Failed to complete Kivo auth redirect', error);
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      urlSubscription.remove();
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleIncomingAuthUrl(url: string) {
    const code = getAuthCodeFromUrl(url);
    if (!code) return;

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    setIsSignedIn(Boolean(data.session));
  }

  async function handleGoogleAuth() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: KIVO_NATIVE_AUTH_REDIRECT_TO,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (!data.url) {
      throw new Error('Google sign-in did not return an authorization URL.');
    }

    const supported = await Linking.canOpenURL(data.url);
    if (!supported) {
      throw new Error('This device cannot open the Google sign-in page.');
    }

    await Linking.openURL(data.url);
  }

  async function handleEmailAuth(email?: string) {
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Email required', 'Enter your email address first.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: KIVO_NATIVE_AUTH_REDIRECT_TO,
      },
    });

    if (error) throw error;

    Alert.alert('Check your email', 'Kivo sent you a secure sign-in link. Open it on this phone to continue.');
  }

  async function handleAuthContinue(method: KivoAuthMethod, email?: string) {
    if (authLoading) return;

    if (method === 'skip') {
      setIsSignedIn(true);
      return;
    }

    if (method === 'apple') {
      Alert.alert('Apple sign-in is not ready yet', 'Apple sign-in needs Apple Developer setup first. Use Google or email for now.');
      return;
    }

    setAuthLoading(true);

    try {
      if (method === 'google') {
        await handleGoogleAuth();
      } else {
        await handleEmailAuth(email);
      }
    } catch (error) {
      console.warn('Kivo auth failed', error);
      Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  if (booting) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="small" color="#202024" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <KivoAuthScreen loading={authLoading} onContinue={handleAuthContinue} />;
  }

  return <KivoChatScreenStreaming />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f6',
  },
});
