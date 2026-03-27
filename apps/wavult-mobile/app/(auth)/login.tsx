import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { login } from '../../lib/auth'
import { useStore } from '../../lib/store'
import { theme } from '../../constants/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { setUser } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Fyll i e-post och lösenord.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await login(email.trim(), password)
      setUser(user)
      router.replace('/(tabs)')
    } catch (err: any) {
      setError(err.message || 'Inloggning misslyckades. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDemo() {
    setLoading(true)
    setError('')
    try {
      const user = await login('demo@wavult.com', 'demo')
      setUser(user)
      router.replace('/(tabs)')
    } catch (err: any) {
      setError(err.message || 'Demo-inloggning misslyckades.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>WAVULT OS</Text>
          <Text style={styles.logoSub}>Command Center</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-post"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Lösenord"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Logga in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoButton} onPress={handleDemo} disabled={loading}>
            <Text style={styles.demoButtonText}>Fortsätt i demo-läge</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Wavult Group · v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 1.5,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  logoSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    letterSpacing: 3,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  form: {
    width: '100%',
    maxWidth: 380,
    gap: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  demoButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: theme.spacing.xl * 2,
    letterSpacing: 1,
  },
})
