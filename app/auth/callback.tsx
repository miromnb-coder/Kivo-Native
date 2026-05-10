import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type MaybeParam = string | string[] | undefined;

type AuthRedirectParams = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorDescription: string | null;
};

function firstParam(value: MaybeParam) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getAuthParamsFromUrl(url: string): AuthRedirectParams {
  const params = new URLSearchParams();

  function appendParams(rawParams?: string) {
    if (!rawParams) return;

    const cleanParams = rawParams.startsWith('?') || rawParams.startsWith('#') ? rawParams.slice(1) : rawParams;
    const searchParams = new URLSearchParams(cleanParams);

    searchParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  try {
    const parsed = new URL(url);
    appendParams(parsed.search);
    appendParams(parsed.hash);
  } catch {
    const [, queryAndHash = ''] = url.split('?');
    const [query = '', hash = ''] = queryAndHash.split('#');
    appendParams(query);
    appendParams(hash);
  }

  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    errorDescription: params.get('error_description') ?? params.get('error'),
  };
}

export default function AuthCallbackScreen() {
  const searchParams = useLocalSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const urlParams = initialUrl ? getAuthParamsFromUrl(initialUrl) : null;

        const errorDescription =
          firstParam(searchParams.error_description as MaybeParam) ??
          firstParam(searchParams.error as MaybeParam) ??
          urlParams?.errorDescription ??
          null;

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const accessToken = firstParam(searchParams.access_token as MaybeParam) ?? urlParams?.accessToken ?? null;
        const refreshToken = firstParam(searchParams.refresh_token as MaybeParam) ?? urlParams?.refreshToken ?? null;
        const code = firstParam(searchParams.code as MaybeParam) ?? urlParams?.code ?? null;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (!cancelled) {
          router.replace('/');
        }
      } catch (error) {
        console.warn('Failed to complete auth callback', error);

        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Sign-in could not be completed.');
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <View style={styles.screen}>
      {errorMessage ? (
        <>
          <Text style={styles.title}>Sign-in failed</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.button}>
            <Text style={styles.buttonText}>Back to Kivo</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="small" color="#202024" />
          <Text style={styles.message}>Completing sign-in…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#f5f5f6',
  },
  title: {
    color: '#111216',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  message: {
    marginTop: 14,
    color: '#747780',
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.25,
    textAlign: 'center',
  },
  button: {
    height: 48,
    marginTop: 22,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111216',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
});
