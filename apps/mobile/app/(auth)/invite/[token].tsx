import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

interface InviteInfo {
  workspace_name: string
  invited_by_name: string
  expires_at: string
}

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { session, refreshWorkspace } = useAuth()
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    checkInvite()
  }, [token])

  async function checkInvite() {
    setLoading(true)
    const { data, error } = await supabase
      .from('workspace_invites')
      .select(`
        expires_at,
        workspaces(name),
        invited_by_user:invited_by(raw_user_meta_data)
      `)
      .eq('invite_token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    setLoading(false)
    if (error || !data) {
      setError('Nieprawidłowy lub wygasły token zaproszenia')
      return
    }

    setInvite({
      workspace_name: (data as unknown as { workspaces: { name: string } }).workspaces?.name ?? 'Workspace',
      invited_by_name: 'Partner',
      expires_at: (data as { expires_at: string }).expires_at,
    })
  }

  async function handleAccept() {
    if (!session) {
      router.push({ pathname: '/(auth)/login', params: { next: `/(auth)/invite/${token}` } })
      return
    }

    setAccepting(true)
    setError(null)

    // Call edge function to accept invite
    const { data, error } = await supabase.functions.invoke('accept_invite', {
      body: { invite_token: token },
    })

    setAccepting(false)
    if (error) {
      setError(error.message)
      return
    }

    await refreshWorkspace()
    router.replace('/(app)/')
  }

  const daysLeft = invite
    ? Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 86_400_000)
    : 0

  return (
    <LinearGradient colors={[COLORS.c0, COLORS.c2]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} size="large" />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Problem z zaproszeniem</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : invite ? (
            <>
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>DE</Text>
              </View>

              <Text style={styles.inviteFrom}>{invite.invited_by_name} zaprasza Cię do:</Text>

              <View style={styles.workspaceBox}>
                <Text style={styles.workspaceName}>{invite.workspace_name}</Text>
              </View>

              <View style={styles.features}>
                {[
                  ['🗺️', 'Współdzielony workspace'],
                  ['🏡', 'Zarządzanie działkami'],
                  ['⭐', 'Wspólna ocena i decyzje'],
                ].map(([icon, label]) => (
                  <View key={label} style={styles.feature}>
                    <Text style={styles.featureIcon}>{icon}</Text>
                    <Text style={styles.featureLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, accepting && styles.buttonDisabled]}
                onPress={handleAccept}
                disabled={accepting}
                activeOpacity={0.8}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {session ? 'DOŁĄCZ DO WORKSPACE' : 'ZALOGUJ SIĘ I DOŁĄCZ'}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.expires}>
                Zaproszenie wygasa za: {daysLeft} {daysLeft === 1 ? 'dzień' : 'dni'}
              </Text>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.lg,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.accentLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  inviteFrom: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  workspaceBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.base,
    width: '100%',
    alignItems: 'center',
  },
  workspaceName: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  features: { gap: SPACING.sm, width: '100%' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: { fontSize: 20 },
  featureLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.base },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1,
  },
  expires: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  errorBox: { alignItems: 'center', gap: SPACING.base },
  errorIcon: { fontSize: 48 },
  errorTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.base,
  },
})
