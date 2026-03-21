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
  ScrollView,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { notifyWorkspace } from '../lib/pushNotifications'
import { COLORS, TYPOGRAPHY, SPACING, RADII, SOURCE_LABELS } from '@de/ui'

interface Props {
  onClose: () => void
  prefillUrl?: string  // from share extension
}

type AddMode = 'url' | 'manual' | 'screenshot'

export default function QuickAddModal({ onClose, prefillUrl }: Props) {
  const [mode, setMode] = useState<AddMode>(prefillUrl ? 'url' : 'url')
  const [url, setUrl] = useState(prefillUrl ?? '')
  const [rawText, setRawText] = useState('')
  const [note, setNote] = useState('')
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, workspaceCtx } = useAuth()
  const router = useRouter()

  async function pickScreenshot() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Brak dostępu', 'Potrzebujemy dostępu do galerii aby dodać screenshot.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri)
    }
  }

  async function handleAdd() {
    const hasContent = url.trim() || rawText.trim() || note.trim() || screenshotUri
    if (!hasContent) {
      setError('Dodaj URL, tekst lub screenshot działki')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const sourceType = detectSourceType(url)

      // 0. Pre-flight duplicate check (only for URL submissions)
      if (url.trim()) {
        const { data: existing } = await supabase
          .from('plots')
          .select('id, title, status')
          .eq('workspace_id', workspaceCtx.workspace!.id)
          .eq('source_url', url.trim())
          .eq('is_deleted', false)
          .maybeSingle()

        if (existing) {
          setLoading(false)
          Alert.alert(
            'Duplikat',
            `Ta działka jest już w workspace jako "${existing.title ?? 'Bez nazwy'}". Otworzyć?`,
            [
              { text: 'Anuluj', style: 'cancel' },
              {
                text: 'Otwórz',
                onPress: () => {
                  onClose()
                  router.push(`/(app)/plot/${existing.id}` as never)
                },
              },
            ]
          )
          return
        }
      }

      // 1. Create plot
      const { data: plot, error: plotErr } = await supabase
        .from('plots')
        .insert({
          workspace_id: workspaceCtx.workspace!.id,
          created_by: user!.id,
          status: 'inbox',
          source_url: url.trim() || null,
          source_type: sourceType,
          title: note.trim() || null,
        })
        .select()
        .single()

      if (plotErr) {
        if (plotErr.code === '23505') {
          setError('Ta działka jest już w Twoim workspace (duplikat URL)')
          return
        }
        throw plotErr
      }

      // 2. Save source details
      if (rawText.trim() || url.trim()) {
        await supabase.from('plot_sources').insert({
          plot_id: plot.id,
          source_type: sourceType,
          source_url: url.trim() || null,
          raw_text: rawText.trim() || null,
          scraped_at: new Date().toISOString(),
        })
      }

      // 3. Upload screenshot if provided
      if (screenshotUri) {
        await uploadScreenshot(plot.id, plot.workspace_id, screenshotUri)
      }

      // 4. Log activity
      await supabase.rpc('log_plot_activity', {
        p_workspace_id: workspaceCtx.workspace!.id,
        p_plot_id: plot.id,
        p_user_id: user!.id,
        p_action: 'plot_added',
        p_metadata: { source_type: sourceType },
      })

      // 5. Trigger AI processing (fire-and-forget)
      triggerAIProcessing(plot.id)

      // 6. Notify workspace partner (fire-and-forget)
      notifyWorkspace(
        workspaceCtx.workspace!.id,
        '📍 Nowa działka dodana',
        plot.title ?? 'Działka bez tytułu',
        { plot_id: plot.id }
      )

      // 7. Navigate to draft screen
      onClose()
      router.push(`/(app)/plot/${plot.id}` as never)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function uploadScreenshot(plotId: string, workspaceId: string, uri: string) {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileName = `${plotId}/screenshot_${Date.now()}.jpg`

      const { data: uploaded } = await supabase.storage
        .from('plot-media')
        .upload(fileName, blob, { contentType: 'image/jpeg' })

      if (uploaded) {
        await supabase.from('plot_media').insert({
          plot_id: plotId,
          workspace_id: workspaceId,
          storage_path: uploaded.path,
          media_type: 'screenshot',
          sort_order: 0,
          uploaded_by: user!.id,
        })
      }
    } catch (e) {
      console.warn('Screenshot upload failed:', e)
    }
  }

  function triggerAIProcessing(plotId: string) {
    supabase.functions.invoke('process_plot', { body: { plot_id: plotId } })
      .then(({ error }) => {
        if (error) console.warn('AI processing failed:', error)
      })
      .catch((e) => console.warn('AI trigger error:', e))
  }

  const sourceType = detectSourceType(url)

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
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

          {/* Mode tabs */}
          <View style={styles.modeTabs}>
            {([
              { key: 'url', label: '🔗 Link', icon: 'link' },
              { key: 'manual', label: '✏️ Tekst', icon: 'text' },
              { key: 'screenshot', label: '📷 Screenshot', icon: 'image' },
            ] as const).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.modeTab, mode === tab.key && styles.modeTabActive]}
                onPress={() => setMode(tab.key)}
              >
                <Text style={[styles.modeTabText, mode === tab.key && styles.modeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {/* URL mode */}
            {(mode === 'url' || mode === 'manual') && (
              <>
                {mode === 'url' && (
                  <>
                    <Text style={styles.label}>Link do ogłoszenia</Text>
                    <TextInput
                      style={styles.input}
                      value={url}
                      onChangeText={setUrl}
                      placeholder="https://facebook.com/groups/... lub otodom.pl/..."
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus={!prefillUrl}
                    />
                    {url.length > 0 && (
                      <View style={styles.sourceBadge}>
                        <View style={[styles.sourceDot, { backgroundColor: getSourceColor(sourceType) }]} />
                        <Text style={[styles.sourceBadgeText, { color: getSourceColor(sourceType) }]}>
                          {SOURCE_LABELS[sourceType as keyof typeof SOURCE_LABELS] ?? 'Inne'}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {mode === 'manual' && (
                  <>
                    <Text style={styles.label}>Wklej treść ogłoszenia</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaLarge]}
                      value={rawText}
                      onChangeText={setRawText}
                      placeholder="Wklej tu pełną treść ogłoszenia z Facebooka, Otodomu itp. AI wyciągnie wszystkie dane..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                      autoFocus
                    />
                  </>
                )}
              </>
            )}

            {/* Screenshot mode */}
            {mode === 'screenshot' && (
              <>
                <Text style={styles.label}>Screenshot ogłoszenia</Text>
                <TouchableOpacity style={styles.screenshotPicker} onPress={pickScreenshot}>
                  {screenshotUri ? (
                    <View style={styles.screenshotPreview}>
                      <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                      <Text style={styles.screenshotDone}>Screenshot dodany</Text>
                      <Text style={styles.screenshotChange}>Dotknij aby zmienić</Text>
                    </View>
                  ) : (
                    <View style={styles.screenshotEmpty}>
                      <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
                      <Text style={styles.screenshotText}>Wybierz screenshot z galerii</Text>
                      <Text style={styles.screenshotHint}>AI odczyta dane z obrazka</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Note — always visible */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>Notatka (opcjonalnie)</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              value={note}
              onChangeText={setNote}
              placeholder="Działka widziana na FB, okolica Rzeszowa, pytać o dostęp..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* AI hint */}
            <View style={styles.aiHint}>
              <Ionicons name="sparkles" size={14} color={COLORS.accent} />
              <Text style={styles.aiHintText}>
                AI automatycznie wyciągnie cenę, powierzchnię, lokalizację i ryzyka
              </Text>
            </View>
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Dodaję...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Dodaj do Inbox →</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getSourceColor(type: string): string {
  const colors: Record<string, string> = {
    facebook_group: '#1877F2',
    facebook_marketplace: '#1877F2',
    otodom: '#EC6B2D',
    olx: '#00A14A',
    gratka: '#C0392B',
    adresowo: '#27AE60',
  }
  return colors[type] ?? COLORS.accent
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.c1,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginBottom: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  closeBtn: { padding: SPACING.sm },
  modeTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  modeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  modeTabText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  modeTabTextActive: { color: COLORS.accent },
  form: { maxHeight: 320 },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  textAreaLarge: { minHeight: 140, paddingTop: SPACING.md },
  textAreaSmall: { minHeight: 72, paddingTop: SPACING.md },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  sourceDot: { width: 8, height: 8, borderRadius: 4 },
  sourceBadgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.medium },
  screenshotPicker: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADII.md,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotPreview: { alignItems: 'center', gap: SPACING.sm },
  screenshotDone: { color: COLORS.success, fontWeight: TYPOGRAPHY.weights.semibold },
  screenshotChange: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  screenshotEmpty: { alignItems: 'center', gap: SPACING.sm },
  screenshotText: { color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weights.medium },
  screenshotHint: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.base,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.sm,
  },
  aiHintText: { color: COLORS.accent, fontSize: 11, flex: 1, lineHeight: 16 },
  error: { color: COLORS.error, fontSize: TYPOGRAPHY.sizes.sm, marginBottom: SPACING.sm },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLoading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  buttonText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.5,
  },
})
