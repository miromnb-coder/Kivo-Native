import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KivoChatScreenStreaming } from '@/components/KivoChatScreenStreaming';
import { getKivoSession, supabase } from '@/lib/supabase';
import { KivoAuthScreen, type KivoAuthMethod } from '@/screens/auth/KivoAuthScreen';

export default function Index() {
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleAuthContinue(_method: KivoAuthMethod) {
    if (authLoading) return;

    setAuthLoading(true);

    try {
      const result = await supabase.auth.signInAnonymously();

      if (result.error) {
        console.warn('Anonymous auth failed, opening Kivo locally', result.error);
      }

      setIsSignedIn(true);
    } catch (error) {
      console.warn('Anonymous auth failed, opening Kivo locally', error);
      setIsSignedIn(true);
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
