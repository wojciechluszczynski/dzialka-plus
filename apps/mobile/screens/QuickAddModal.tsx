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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

interface Props {
  onClose: () => void
}

export default function QuickAddModal({ onClose }: Props) {
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, workspaceCtx } = useAuth()

  async function handleAdd() {
    if (!url.trim() && !note.trim()) {
      setError('Podaj URL lub opis działki')
      return
    }

    setLoading(true)
    setError(null)

    const sourceType = detectSourceType(url)

    const { error: plotErr } = await supabase
      .from('plots')
      .insert({
        workspace_id: workspaceCtx.workspace!.id,
        created_by: user!.id,
        status: 'inbox',
        source_url: url.trim() || null,
        source_type: sourceType,
        title: note.trim() || null,
      })

    setLoading(false)
    if (plotErr) {
      if (plotErr.code === '23505') {
        setError('Ta działka jest już w Twoim workspace (duplikat URL)')
        return
      }
      setError(plotErr.message)
      return
    }

    onClose()
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Dodaj działkę</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* URL field */}
          <Text style={styles.label}>Link do ogłoszenia</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://facebook.com/... lub otodom.pl/..."
            placeholderTextColor={COLORS.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {/* Source type badge */}
          {url.length > 0 && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {getSourceLabel(detectSourceType(url))}
              </Text>
            </View>
          )}

          {/* Notes field */}
          <Text style={styles.label}>Notatka (opcjonalnie)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Działka widziana na FB, okolica Rzeszowa..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Dodaj do Inbox</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

function detectSourceType(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('facebook.com/groups') || u.includes('fb.com/groups')) return 'facebook_group'
  if (u.includes('facebook.com/marketplace') || u.includes('fb.com/marketplace')) return 'facebook_marketplace'
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  return 'other'
}

function getSourceLabel(type: string): string {
  const labels: Record<string, string> = {
    facebook_group: 'Facebook Grupa',
    facebook_marketplace: 'Facebook Marketplace',
    otodom: 'Otodom',
    olx: 'OLX',
    gratka: 'Gratka',
    adresowo: 'Adresowo',
    other: 'Inne',
  }
  return labels[type] ?? 'Inne'
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.c1,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
    gap: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  closeBtn: { padding: SPACING.sm },
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
  textArea: {
    minHeight: 80,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  sourceBadgeText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
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
