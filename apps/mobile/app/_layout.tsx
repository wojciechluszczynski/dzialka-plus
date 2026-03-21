import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ErrorBoundary } from '../components/ErrorBoundary'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, workspaceCtx, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login')
      return
    }

    if (session && !workspaceCtx.workspace) {
      router.replace('/(auth)/workspace-setup')
      return
    }

    if (session && workspaceCtx.workspace && !inAppGroup) {
      router.replace('/(app)/')
    }
  }, [session, workspaceCtx.workspace, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
