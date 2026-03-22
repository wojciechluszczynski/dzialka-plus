import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

const SHARED_EMAIL = 'app@dzialka.plus'

export default function LoginScreen() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!password.trim()) {
      setError('Podaj hasło')
      return
    }
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: SHARED_EMAIL,
      password: password,
    })

    setLoading(false)
    if (signInError) {
      setError('Nieprawidłowe hasło')
    }
    // AuthContext listener handles routing on success
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🏠</Text>
            </View>
            <Text style={styles.appName}>Działkometr</Text>
            <Text style={styles.tagline}>Od linku do decyzji.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Hasło</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null) }}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              autoFocus
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, (!password || loading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!password || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Wejdź</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2B3C',
  },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.accentLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  logoEmoji: {
    fontSize: 28,
  },
  appName: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: TYPOGRAPHY.fontBody,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#94A3B8',
    marginTop: SPACING.xs,
  },
  form: { gap: SPACING.md },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#94A3B8',
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.sizes.base,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.5,
  },
})
