import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

export default function WorkspaceSetupScreen() {
  const [name, setName] = useState('Wojtek i Sabina — Działki 2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, refreshWorkspace } = useAuth()
  const router = useRouter()

  async function handleCreate() {
    if (!name.trim()) {
      setError('Podaj nazwę workspace')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 1. Create workspace
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({ name: name.trim(), created_by: user!.id })
        .select()
        .single()

      if (wsErr) throw wsErr

      // 2. Add owner membership
      const { error: memErr } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: ws.id, user_id: user!.id, role: 'owner' })

      if (memErr) throw memErr

      // 3. Create default scoring profile
      await supabase.from('scoring_profiles').insert({ workspace_id: ws.id })

      await refreshWorkspace()
      router.replace('/(app)/')
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[COLORS.c0, COLORS.c2]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.title}>Utwórz workspace</Text>
          <Text style={styles.subtitle}>
            Workspace to współdzielona przestrzeń do zarządzania działkami dla Ciebie i Twojego partnera.
          </Text>

          <Text style={styles.label}>Nazwa workspace</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Np. Wojtek i Sabina — Działki 2026"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Utwórz workspace</Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: SPACING['2xl'],
    paddingTop: SPACING['3xl'],
    gap: SPACING.base,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  error: { color: COLORS.error, fontSize: TYPOGRAPHY.sizes.sm },
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
  },
})
