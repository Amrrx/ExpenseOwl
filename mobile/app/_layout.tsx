import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../theme';
import { ToastContainer } from '../components';
import { useAuthStore } from '../stores/authStore';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (hasShareIntent && shareIntent?.files && shareIntent.files.length > 0) {
      const imageFile = shareIntent.files[0];
      if (imageFile?.mimeType?.startsWith('image/') && imageFile.path) {
        const sharedData = JSON.stringify({
          path: imageFile.path,
          mimeType: imageFile.mimeType,
        });
        AsyncStorage.setItem('shared_image', sharedData).then(() => {
          resetShareIntent();
        });
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments, router]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack>
      <ToastContainer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareIntentProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}
