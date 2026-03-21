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
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuest() {
    setGuestLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    setGuestLoading(false)
    if (error) setError(error.message)
    // AuthContext listener handles routing on success
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError('Podaj adres email')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'decisionengine://login-callback',
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <LinearGradient
      colors={[COLORS.c0, COLORS.c2, COLORS.c1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>DE</Text>
            </View>
            <Text style={styles.appName}>DecisionEngine</Text>
            <Text style={styles.tagline}>Działki. Decyzje. Pewność.</Text>
          </View>

          {!sent ? (
            <View style={styles.form}>
              <Text style={styles.label}>Adres email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="wojtek@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleMagicLink}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleMagicLink}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Wyślij link logowania</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>
                Wyślemy Ci magic link na email. Bez hasła.
              </Text>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>lub</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Guest button */}
              <TouchableOpacity
                style={[styles.guestButton, guestLoading && styles.buttonDisabled]}
                onPress={handleGuest}
                disabled={guestLoading}
                activeOpacity={0.8}
              >
                {guestLoading ? (
                  <ActivityIndicator color={COLORS.accent} />
                ) : (
                  <Text style={styles.guestButtonText}>👻 Wejdź bez konta</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.guestHint}>
                Twoje dane zostaną zapisane lokalnie. Możesz dodać email później.
              </Text>
            </View>
          ) : (
            <View style={styles.sentBox}>
              <Text style={styles.sentIcon}>📨</Text>
              <Text style={styles.sentTitle}>Sprawdź skrzynkę</Text>
              <Text style={styles.sentText}>
                Link logowania wysłany na{'\n'}
                <Text style={styles.sentEmail}>{email}</Text>
              </Text>
              <TouchableOpacity onPress={() => setSent(false)} style={styles.backLink}>
                <Text style={styles.backLinkText}>Zmień email</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
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
    width: 72,
    height: 72,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.accentLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  logoText: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  appName: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.5,
  },
  form: { gap: SPACING.md },
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.base,
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
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.5,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  guestButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  guestButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  guestHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  sentBox: {
    alignItems: 'center',
    gap: SPACING.base,
  },
  sentIcon: { fontSize: 48 },
  sentTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  sentText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: 24,
  },
  sentEmail: {
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  backLink: { marginTop: SPACING.md },
  backLinkText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textDecorationLine: 'underline',
  },
})
