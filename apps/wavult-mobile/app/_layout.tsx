import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import * as Linking from 'expo-linking'
import { getStoredUser } from '../lib/auth'
import { useStore } from '../lib/store'
import { theme } from '../constants/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()
  const { user, setUser } = useStore()

  useEffect(() => {
    async function checkAuth() {
      const storedUser = await getStoredUser()
      if (storedUser) {
        setUser(storedUser)
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, segments, loading])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    )
  }

  return <>{children}</>
}

// Deep link handler — "wavult://voice" och "wavult://voice?query=..."
function useDeepLink() {
  const router = useRouter()

  useEffect(() => {
    // Hantera deep links när appen öppnas från Siri/URL
    async function handleInitialURL() {
      const url = await Linking.getInitialURL()
      if (url) handleURL(url)
    }

    function handleURL(url: string) {
      const parsed = Linking.parse(url)
      if (parsed.path === 'voice') {
        const query = parsed.queryParams?.query as string | undefined
        // Navigera till AI Command Center med eventuell röstfråga
        router.push({
          pathname: '/(tabs)',
          params: query ? { berntQuery: query, voiceMode: '1' } : { voiceMode: '1' },
        })
      }
    }

    handleInitialURL()
    const sub = Linking.addEventListener('url', ({ url }: { url: string }) => handleURL(url))
    return () => sub.remove()
  }, [])
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </QueryClientProvider>
  )
}
