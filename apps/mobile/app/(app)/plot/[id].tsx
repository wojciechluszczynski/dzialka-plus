import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native'
import ScoringModal from '../../../screens/ScoringModal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import {
  COLORS, TYPOGRAPHY, SPACING, RADII,
  STATUS_LABELS, STATUS_COLORS,
  SOURCE_LABELS,
  RISK_COLORS, RISK_LABELS,
} from '@de/ui'
import type { Plot, PlotAiReport, PlotScore, PlotNote, PlotContact, ContactLog, ContactLogType, Verdict, PlotEnrichment } from '@de/db'
import { VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'

type Tab = 'info' | 'ai' | 'enrichment' | 'notes' | 'contacts'

interface FullPlot extends Plot {
  plot_scores?: PlotScore[]
  plot_ai_reports?: PlotAiReport[]
}

const NEXT_STATUS: Partial<Record<string, string>> = {
  inbox:         'draft',
  draft:         'to_analyze',
  to_analyze:    'to_visit',
  to_visit:      'visited',
  visited:       'due_diligence',
  due_diligence: 'shortlist',
  shortlist:     'top3',
}

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { workspaceCtx } = useAuth()
  const [plot, setPlot] = useState<FullPlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiReport, setAiReport] = useState<PlotAiReport | null>(null)
  const [enrichment, setEnrichment] = useState<PlotEnrichment | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [advancingStatus, setAdvancingStatus] = useState(false)
  const [showScoring, setShowScoring] = useState(false)

  useEffect(() => {
    if (id) loadPlot()
  }, [id])

  // Subscribe to real-time AI processing updates
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`plot-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'plots',
        filter: `id=eq.${id}`,
      }, () => loadPlot())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'plot_ai_reports',
        filter: `plot_id=eq.${id}`,
      }, () => {
        loadPlot()
        setActiveTab('ai')
      })

      // Load AI report
      const { data: aiData } = await supabase
        .from('plot_ai_reports')
        .select('*')
        .eq('plot_id', id as string)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setAiReport(aiData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function loadPlot() {
    const { data } = await supabase
      .from('plots')
      .select('*, plot_scores(*), plot_ai_reports(*)')
      .eq('id', id)
      .single()

    if (data) setPlot(data as FullPlot)

    // Load enrichment separately
    const { data: enrichData } = await supabase
      .from('plot_enrichments')
      .select('*')
      .eq('plot_id', id as string)
      .order('enriched_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (enrichData) setEnrichment(enrichData as PlotEnrichment)

    setLoading(false)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPlot()
    setRefreshing(false)
  }, [id])

  async function advanceStatus() {
    if (!plot) return
    const next = NEXT_STATUS[plot.status]
    if (!next) return
    setAdvancingStatus(true)
    await supabase.from('plots').update({ status: next }).eq('id', plot.id)
    setAdvancingStatus(false)
    await loadPlot()
  }

  async function rejectPlot() {
    Alert.alert(
      'Odrzuć działkę',
      'Przenieść działkę do "Odrzucone"? Możesz ją przywrócić później.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Odrzuć',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('plots').update({ status: 'rejected' }).eq('id', plot!.id)
            router.back()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    )
  }

  if (!plot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Nie znaleziono działki</Text>
      </View>
    )
  }

  const score = plot.plot_scores?.[0]
  const aiReport = plot.plot_ai_reports?.[0]
  const verdict = score?.verdict as Verdict | null
  const isAiProcessing = !plot.ai_processed_at && plot.status !== 'inbox'
  const nextStatusLabel = NEXT_STATUS[plot.status]
    ? STATUS_LABELS[NEXT_STATUS[plot.status] as keyof typeof STATUS_LABELS]
    : null

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.c0 },
          headerTintColor: COLORS.textPrimary,
          headerTitle: plot.title ? (plot.title.length > 28 ? plot.title.slice(0, 28) + '…' : plot.title) : 'Działka',
          headerRight: () => (
            <TouchableOpacity onPress={rejectPlot} style={{ marginRight: SPACING.base }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroImagePlaceholder}>
              <Text style={styles.heroEmoji}>🏡</Text>
            </View>

            {/* Status pill + AI processing */}
            <View style={styles.heroOverlay}>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[plot.status] }]}>
                <Text style={styles.statusPillText}>{STATUS_LABELS[plot.status]}</Text>
              </View>
              {isAiProcessing && (
                <View style={styles.aiProcessingBadge}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={styles.aiProcessingText}>AI analizuje...</Text>
                </View>
              )}
              {verdict && (
                <View style={[styles.verdictBadge, { backgroundColor: VERDICT_COLORS[verdict] + '22', borderColor: VERDICT_COLORS[verdict] }]}>
                  {score?.score_shared != null && (
                    <Text style={[styles.verdictScore, { color: VERDICT_COLORS[verdict] }]}>
                      {score.score_shared.toFixed(1)}
                    </Text>
                  )}
                  <Text style={[styles.verdictLabel, { color: VERDICT_COLORS[verdict] }]}>
                    {VERDICT_LABELS[verdict]}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Key facts row */}
          <View style={styles.factsRow}>
            {[
              {
                icon: 'cash-outline' as const,
                label: 'Cena',
                value: plot.asking_price_pln
                  ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(plot.asking_price_pln) + ' PLN'
                  : '—',
              },
              {
                icon: 'expand-outline' as const,
                label: 'Pow.',
                value: plot.area_m2 ? plot.area_m2.toLocaleString('pl-PL') + ' m²' : '—',
              },
              {
                icon: 'calculator-outline' as const,
                label: 'PLN/m²',
                value: plot.price_per_m2_pln ? Math.round(plot.price_per_m2_pln).toLocaleString('pl-PL') : '—',
              },
            ].map((f) => (
              <View key={f.label} style={styles.factItem}>
                <Ionicons name={f.icon} size={16} color={COLORS.textMuted} />
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factValue}>{f.value}</Text>
              </View>
            ))}
          </View>

          {/* Source + location */}
          <View style={styles.metaRow}>
            {plot.location_text && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{plot.location_text}</Text>
              </View>
            )}
            {plot.source_url && (
              <TouchableOpacity
                style={styles.metaItem}
                onPress={() => Linking.openURL(plot.source_url!)}
              >
                <Ionicons name="open-outline" size={14} color={COLORS.accent} />
                <Text style={[styles.metaText, { color: COLORS.accent }]}>
                  {plot.source_type ? SOURCE_LABELS[plot.source_type] : 'Źródło'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['info', 'ai', 'enrichment', 'notes', 'contacts'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'info' ? 'Info' : tab === 'ai' ? 'AI ✨' : tab === 'enrichment' ? 'Wycena' : tab === 'notes' ? 'Notatki' : 'Kontakty'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'info' && <InfoTab plot={plot} />}
            {activeTab === 'ai' && <AITab aiReport={aiReport} plotId={plot.id} onReportUpdated={(r) => setAiReport(r)} />}
            {activeTab === 'enrichment' && <EnrichmentTab enrichment={enrichment} plotId={plot.id} onEnrichmentUpdated={(e) => setEnrichment(e)} />}
            {activeTab === 'notes' && <NotesTab plotId={plot.id} />}
            {activeTab === 'contacts' && <ContactsTab plotId={plot.id} workspaceId={workspaceCtx.workspace!.id} />}
          </View>
        </ScrollView>

        {/* Bottom action bar */}
        {plot.status !== 'rejected' && plot.status !== 'closed' && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectPlot}>
              <Ionicons name="close" size={20} color={COLORS.error} />
            </TouchableOpacity>

            {/* Score button */}
            <TouchableOpacity
              style={styles.scoreBtn}
              onPress={() => setShowScoring(true)}
            >
              <Ionicons name="star-outline" size={16} color={COLORS.accent} />
              <Text style={styles.scoreBtnText}>
                {score?.score_shared != null ? score.score_shared.toFixed(1) : 'Oceń'}
              </Text>
            </TouchableOpacity>

            {nextStatusLabel && (
              <TouchableOpacity
                style={[styles.advanceBtn, advancingStatus && { opacity: 0.7 }]}
                onPress={advanceStatus}
                disabled={advancingStatus}
              >
                {advancingStatus ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.advanceBtnText}>→ {nextStatusLabel}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scoring Modal */}
        <ScoringModal
          plot={plot}
          visible={showScoring}
          onClose={() => setShowScoring(false)}
          onSaved={loadPlot}
        />
      </SafeAreaView>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoTab({ plot }: { plot: FullPlot }) {
  const items = [
    { label: 'Tytuł', value: plot.title },
    { label: 'Opis', value: plot.description },
    { label: 'Numer działki', value: plot.parcel_id },
    { label: 'Lokalizacja', value: plot.location_text },
    { label: 'Adres', value: plot.address_freeform },
    { label: 'Strefa', value: plot.zoning },
    { label: 'Źródło URL', value: plot.source_url },
  ]

  const utilities = [
    { label: '⚡ Prąd', value: plot.has_electricity },
    { label: '💧 Woda', value: plot.has_water },
    { label: '🚿 Kanalizacja', value: plot.has_sewage },
    { label: '🔥 Gaz', value: plot.has_gas },
    { label: '🌐 Fiber', value: plot.has_fiber },
    { label: '🛣️ Droga', value: plot.has_road_access },
  ]

  return (
    <View style={styles.sectionGap}>
      {items.filter((i) => i.value).map((item) => (
        <View key={item.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{item.label}</Text>
          <Text style={styles.infoValue} numberOfLines={3}>{item.value}</Text>
        </View>
      ))}

      <Text style={styles.sectionHeading}>Media i infrastruktura</Text>
      <View style={styles.utilitiesGrid}>
        {utilities.map((u) => (
          <View key={u.label} style={[styles.utilityItem, {
            backgroundColor: u.value === true ? COLORS.success + '15'
              : u.value === false ? COLORS.error + '15'
              : COLORS.c2,
          }]}>
            <Text style={styles.utilityLabel}>{u.label}</Text>
            <Text style={[styles.utilityValue, {
              color: u.value === true ? COLORS.success
                : u.value === false ? COLORS.error
                : COLORS.textMuted,
            }]}>
              {u.value === true ? 'TAK' : u.value === false ? 'NIE' : '?'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const AI_API_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://dzialkometr.netlify.app'

function AITab({ aiReport, plotId, onReportUpdated }: {
  aiReport?: PlotAiReport | null
  plotId: string
  onReportUpdated: (r: PlotAiReport) => void
}) {
  const [aiLoading, setAiLoading] = useState(false)

  async function runAnalysis(forceRefresh = false) {
    setAiLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nie jesteś zalogowany')
      const res = await fetch(`${AI_API_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plot_id: plotId, force_refresh: forceRefresh }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Błąd analizy AI')
      }
      const { report } = await res.json()
      onReportUpdated(report)
    } catch (err: unknown) {
      Alert.alert('Błąd AI', (err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  if (aiLoading) {
    return (
      <View style={styles.aiProcessingState}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.aiProcessingTitle}>AI analizuje działkę...</Text>
        <Text style={styles.aiProcessingSubtitle}>
          Wyciągam dane, sprawdzam ryzyka. Zajmie to ok. 30 sekund.
        </Text>
      </View>
    )
  }

  if (!aiReport) {
    return (
      <View style={styles.aiProcessingState}>
        <Text style={styles.aiEmptyIcon}>🤖</Text>
        <Text style={styles.aiProcessingTitle}>Brak analizy AI</Text>
        <Text style={styles.aiProcessingSubtitle}>
          Claude przeanalizuje ogłoszenie: wyciągnie dane, sprawdzi ryzyka i wygeneruje pytania do sprzedającego.
        </Text>
        <TouchableOpacity
          style={styles.aiAnalyzeBtn}
          onPress={() => runAnalysis(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.aiAnalyzeBtnText}>⚡ Analizuj AI</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const risks = (aiReport.risk_flags_json as Record<string, unknown>)?.risk_flags as Array<{
    severity: string; label: string; rationale: string
  }> ?? []
  const dealBreakers = (aiReport.risk_flags_json as Record<string, unknown>)?.deal_breakers as Array<{
    key: string; label: string; triggered: boolean; rationale: string
  }> ?? []
  const valuation = aiReport.valuation_json as Record<string, unknown> | null
  const questions = (aiReport.questions_json as Record<string, unknown>)?.must_ask_before_contact as Array<{
    question: string; context?: string
  }> ?? []

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiScrollContent}>
      {/* Header row */}
      <View style={styles.aiHeaderRow}>
        <Text style={styles.aiHeaderMeta}>
          {aiReport.processed_at
            ? new Date(aiReport.processed_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : ''} · {aiReport.model_used ?? 'claude'}
        </Text>
        <TouchableOpacity style={styles.aiRefreshBtn} onPress={() => runAnalysis(true)} activeOpacity={0.8}>
          <Text style={styles.aiRefreshBtnText}>↻ Odśwież</Text>
        </TouchableOpacity>
      </View>

      {/* Confidence */}
      {aiReport.extraction_confidence != null && (
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Pewność ekstrakcji:</Text>
          <Text style={[styles.confidenceValue, {
            color: aiReport.extraction_confidence > 0.7 ? COLORS.success
              : aiReport.extraction_confidence > 0.4 ? COLORS.warning
              : COLORS.error,
          }]}>
            {Math.round(aiReport.extraction_confidence * 100)}%
          </Text>
        </View>
      )}

      {/* Valuation */}
      {valuation && (
        <>
          <Text style={styles.sectionHeading}>Wycena</Text>
          <View style={styles.valuationCard}>
            <View style={[styles.valuationBadge, {
              backgroundColor: valuation.price_position === 'cheap' ? '#10B981'
                : valuation.price_position === 'fair' ? '#3B82F6'
                : valuation.price_position === 'expensive' ? '#EF4444'
                : '#6B7280',
            }]}>
              <Text style={styles.valuationBadgeText}>
                {valuation.price_position_label as string || valuation.price_position as string}
              </Text>
            </View>
            {valuation.explanation && (
              <Text style={styles.valuationExplanation}>{valuation.explanation as string}</Text>
            )}
          </View>
        </>
      )}

      {/* Deal breakers */}
      {dealBreakers.filter((d) => d.triggered).length > 0 && (
        <View style={styles.dealBreakerBox}>
          <View style={styles.dealBreakerHeader}>
            <Ionicons name="warning" size={18} color={COLORS.error} />
            <Text style={styles.dealBreakerTitle}>Deal breakery wykryte</Text>
          </View>
          {dealBreakers.filter((d) => d.triggered).map((d) => (
            <View key={d.key} style={styles.dealBreakerItem}>
              <Text style={styles.dealBreakerLabel}>• {d.label}</Text>
              <Text style={styles.dealBreakerRationale}>{d.rationale}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risk flags */}
      {risks.length > 0 && (
        <>
          <Text style={styles.sectionHeading}>Ryzyka ({risks.length})</Text>
          {risks.map((r, i) => (
            <View key={i} style={[styles.riskItem, {
              borderLeftColor: RISK_COLORS[r.severity as keyof typeof RISK_COLORS] ?? COLORS.textMuted,
            }]}>
              <View style={styles.riskHeader}>
                <Text style={[styles.riskSeverity, { color: RISK_COLORS[r.severity as keyof typeof RISK_COLORS] }]}>
                  {RISK_LABELS[r.severity as keyof typeof RISK_LABELS] ?? r.severity}
                </Text>
                <Text style={styles.riskLabel}>{r.label}</Text>
              </View>
              <Text style={styles.riskRationale}>{r.rationale}</Text>
            </View>
          ))}
        </>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <>
          <Text style={styles.sectionHeading}>Pytania do sprzedającego ({questions.length})</Text>
          {questions.map((q, i) => (
            <View key={i} style={styles.questionItem}>
              <Text style={styles.questionNum}>{i + 1}.</Text>
              <View style={styles.questionBody}>
                <Text style={styles.questionText}>{q.question}</Text>
                {q.context && <Text style={styles.questionContext}>{q.context}</Text>}
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function PlaceholderTab({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>{icon}</Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSub}>Dostępne w {subtitle}</Text>
    </View>
  )
}

// ─── NotesTab ─────────────────────────────────────────────────────────────────

function NotesTab({ plotId }: { plotId: string }) {
  const { workspaceCtx, user } = useAuth()
  const [notes, setNotes] = useState<PlotNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadNotes() }, [plotId])

  async function loadNotes() {
    setLoading(true)
    const { data } = await supabase
      .from('plot_notes')
      .select('*')
      .eq('plot_id', plotId)
      .order('created_at', { ascending: false })
    setNotes((data as PlotNote[]) ?? [])
    setLoading(false)
  }

  async function addNote() {
    if (!newText.trim()) return
    setSaving(true)
    await supabase.from('plot_notes').insert({
      plot_id: plotId,
      workspace_id: workspaceCtx.workspace!.id,
      user_id: user!.id,
      content: newText.trim(),
      is_voice: false,
    })
    setNewText('')
    setSaving(false)
    loadNotes()
  }

  async function deleteNote(id: string) {
    Alert.alert('Usuń notatkę', 'Czy na pewno usunąć tę notatkę?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń', style: 'destructive',
        onPress: async () => {
          await supabase.from('plot_notes').delete().eq('id', id)
          loadNotes()
        },
      },
    ])
  }

  if (loading) return <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />

  return (
    <View style={styles.noteContainer}>
      {/* Add note */}
      <View style={styles.noteInputRow}>
        <TextInput
          style={styles.noteInput}
          placeholder="Napisz notatkę..."
          placeholderTextColor={COLORS.textMuted}
          value={newText}
          onChangeText={setNewText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.noteAddBtn, (!newText.trim() || saving) && { opacity: 0.5 }]}
          onPress={addNote}
          disabled={!newText.trim() || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="add" size={20} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.notesEmpty}>
          <Text style={styles.notesEmptyText}>Brak notatek. Dodaj pierwszą!</Text>
        </View>
      ) : (
        notes.map(note => (
          <View key={note.id} style={styles.noteCard}>
            <Text style={styles.noteContent}>{note.content}</Text>
            <View style={styles.noteFooter}>
              <Text style={styles.noteMeta}>
                {new Date(note.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <TouchableOpacity onPress={() => deleteNote(note.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

// ─── ContactsTab ──────────────────────────────────────────────────────────────

const LOG_TYPE_ICONS: Record<ContactLogType, string> = {
  call: '📞', sms: '💬', messenger: '📘', whatsapp: '🟢',
  email: '✉️', visit: '🏡', other: '📌',
}
const LOG_TYPE_LABELS: Record<ContactLogType, string> = {
  call: 'Telefon', sms: 'SMS', messenger: 'Messenger', whatsapp: 'WhatsApp',
  email: 'Email', visit: 'Wizyta', other: 'Inne',
}

function ContactsTab({ plotId, workspaceId }: { plotId: string; workspaceId: string }) {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<(PlotContact & { contact_logs?: ContactLog[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addType, setAddType] = useState<'owner' | 'agent' | 'unknown'>('owner')
  const [savingContact, setSavingContact] = useState(false)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)
  const [logSummary, setLogSummary] = useState('')
  const [logType, setLogType] = useState<ContactLogType>('call')
  const [savingLog, setSavingLog] = useState(false)

  useEffect(() => { loadContacts() }, [plotId])

  async function loadContacts() {
    setLoading(true)
    const { data } = await supabase
      .from('plot_contacts')
      .select('*, contact_logs(*)')
      .eq('plot_id', plotId)
      .order('created_at', { ascending: true })
    setContacts((data as any) ?? [])
    setLoading(false)
  }

  async function addContact() {
    if (!addName.trim() && !addPhone.trim()) return
    setSavingContact(true)
    await supabase.from('plot_contacts').insert({
      plot_id: plotId,
      workspace_id: workspaceId,
      name: addName.trim() || null,
      phone: addPhone.trim() || null,
      contact_type: addType,
    })
    setAddName(''); setAddPhone(''); setShowAdd(false)
    setSavingContact(false)
    loadContacts()
  }

  async function addLog(contactId: string) {
    if (!logSummary.trim()) return
    setSavingLog(true)
    await supabase.from('contact_logs').insert({
      contact_id: contactId,
      plot_id: plotId,
      log_type: logType,
      summary: logSummary.trim(),
      happened_at: new Date().toISOString(),
      created_by: user!.id,
    })
    setLogSummary('')
    setSavingLog(false)
    loadContacts()
  }

  async function callPhone(phone: string) {
    const url = `tel:${phone.replace(/\s/g, '')}`
    const ok = await Linking.canOpenURL(url)
    if (ok) Linking.openURL(url)
  }

  if (loading) return <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />

  return (
    <View style={styles.contactContainer}>
      {/* Contact list */}
      {contacts.map(contact => {
        const isExpanded = expandedContact === contact.id
        const logs = (contact.contact_logs ?? []).sort((a, b) =>
          new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime()
        )
        return (
          <View key={contact.id} style={styles.contactCard}>
            <TouchableOpacity
              style={styles.contactHeader}
              onPress={() => setExpandedContact(isExpanded ? null : contact.id)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {(contact.name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name ?? 'Nieznany'}</Text>
                <Text style={styles.contactMeta}>
                  {contact.contact_type === 'owner' ? 'Właściciel' : contact.contact_type === 'agent' ? 'Agent' : 'Nieznany'}{contact.phone ? ` · ${contact.phone}` : ''}
                </Text>
              </View>
              <View style={styles.contactActions}>
                {contact.phone && (
                  <TouchableOpacity
                    onPress={() => callPhone(contact.phone!)}
                    style={styles.callBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="call" size={16} color={COLORS.success} />
                  </TouchableOpacity>
                )}
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.contactExpanded}>
                {/* Log list */}
                {logs.length > 0 && (
                  <View style={styles.logList}>
                    {logs.map(log => (
                      <View key={log.id} style={styles.logItem}>
                        <Text style={styles.logIcon}>{LOG_TYPE_ICONS[log.log_type]}</Text>
                        <View style={styles.logContent}>
                          <Text style={styles.logSummary}>{log.summary}</Text>
                          <Text style={styles.logMeta}>
                            {LOG_TYPE_LABELS[log.log_type]} · {new Date(log.happened_at).toLocaleDateString('pl-PL')}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add log */}
                <View style={styles.addLogRow}>
                  <View style={styles.logTypeRow}>
                    {(['call', 'sms', 'visit', 'email'] as ContactLogType[]).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.logTypeBtn, logType === t && styles.logTypeBtnActive]}
                        onPress={() => setLogType(t)}
                      >
                        <Text style={styles.logTypeBtnText}>{LOG_TYPE_ICONS[t]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.logInputRow}>
                    <TextInput
                      style={styles.logInput}
                      placeholder="Co ustalono..."
                      placeholderTextColor={COLORS.textMuted}
                      value={logSummary}
                      onChangeText={setLogSummary}
                    />
                    <TouchableOpacity
                      style={[styles.noteAddBtn, (!logSummary.trim() || savingLog) && { opacity: 0.5 }]}
                      onPress={() => addLog(contact.id)}
                      disabled={!logSummary.trim() || savingLog}
                    >
                      {savingLog
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="add" size={20} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )
      })}

      {/* Add contact */}
      {showAdd ? (
        <View style={styles.addContactForm}>
          <Text style={styles.addContactTitle}>Nowy kontakt</Text>
          <TextInput
            style={styles.addContactInput}
            placeholder="Imię / Nazwisko"
            placeholderTextColor={COLORS.textMuted}
            value={addName}
            onChangeText={setAddName}
          />
          <TextInput
            style={styles.addContactInput}
            placeholder="Telefon"
            placeholderTextColor={COLORS.textMuted}
            value={addPhone}
            onChangeText={setAddPhone}
            keyboardType="phone-pad"
          />
          <View style={styles.contactTypeRow}>
            {(['owner', 'agent', 'unknown'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.contactTypeBtn, addType === t && styles.contactTypeBtnActive]}
                onPress={() => setAddType(t)}
              >
                <Text style={[styles.contactTypeBtnText, addType === t && styles.contactTypeBtnTextActive]}>
                  {t === 'owner' ? 'Właściciel' : t === 'agent' ? 'Agent' : 'Inny'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addContactBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelBtnText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveContactBtn, (!addName.trim() && !addPhone.trim()) && { opacity: 0.5 }]}
              onPress={addContact}
              disabled={(!addName.trim() && !addPhone.trim()) || savingContact}
            >
              {savingContact
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveContactBtnText}>Zapisz</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="person-add-outline" size={16} color={COLORS.accent} />
          <Text style={styles.addContactBtnText}>Dodaj kontakt</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── EnrichmentTab ──────────────────────────────────────────────────────────

const AI_ENRICH_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://dzialkometr.netlify.app'

function EnrichmentTab({
  enrichment,
  plotId,
  onEnrichmentUpdated,
}: {
  enrichment: PlotEnrichment | null
  plotId: string
  onEnrichmentUpdated: (e: PlotEnrichment) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runEnrichment(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Brak sesji')
      const res = await fetch(`${AI_ENRICH_URL}/api/enrichment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plot_id: plotId, force_refresh: forceRefresh }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Błąd serwera')
      onEnrichmentUpdated(json.enrichment as PlotEnrichment)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={enrichStyles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={enrichStyles.loadingText}>Pobieranie danych wzbogacenia…</Text>
      </View>
    )
  }

  if (!enrichment) {
    return (
      <View style={enrichStyles.center}>
        <Text style={enrichStyles.emptyIcon}>📊</Text>
        <Text style={enrichStyles.emptyTitle}>Brak danych wzbogacenia</Text>
        <Text style={enrichStyles.emptySub}>Wygeneruj szacunkowe dane o cenie, ryzyku powodziowym, liniach energetycznych i czasie dojazdu.</Text>
        {error && <Text style={enrichStyles.errorText}>{error}</Text>}
        <TouchableOpacity style={enrichStyles.analyzeBtn} onPress={() => runEnrichment(false)}>
          <Text style={enrichStyles.analyzeBtnText}>📊 Wzbogać dane</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const e = enrichment

  // Price position badge
  const medM2 = e.rcn_median_price_m2
  const p25 = e.rcn_p25_price_m2
  const p75 = e.rcn_p75_price_m2

  // Flood badge
  const floodLevel = e.isok_flood_risk_level
  const floodLabel = floodLevel === 'none' ? 'Poza strefą' : floodLevel === 'medium' ? 'Strefa Q100' : 'Wysoke ryzyko'
  const floodColor = floodLevel === 'none' ? COLORS.success || '#22c55e' : floodLevel === 'medium' ? '#f59e0b' : '#ef4444'

  return (
    <View style={enrichStyles.container}>
      {/* RCN Price Stats */}
      <View style={enrichStyles.card}>
        <Text style={enrichStyles.cardTitle}>📈 Statystyki cen RCN</Text>
        <Text style={enrichStyles.cardSub}>Rejestr Cen Nieruchomości · promień {e.rcn_radius_km} km · {e.rcn_comparables_count} porównań</Text>
        <View style={enrichStyles.statsRow}>
          <View style={enrichStyles.statBox}>
            <Text style={enrichStyles.statLabel}>P25</Text>
            <Text style={enrichStyles.statValue}>{p25 ? `${p25.toLocaleString('pl-PL')} zł` : '–'}</Text>
            <Text style={enrichStyles.statSub}>za m²</Text>
          </View>
          <View style={[enrichStyles.statBox, enrichStyles.statBoxMedian]}>
            <Text style={enrichStyles.statLabel}>Mediana</Text>
            <Text style={[enrichStyles.statValue, { color: COLORS.accent }]}>{medM2 ? `${medM2.toLocaleString('pl-PL')} zł` : '–'}</Text>
            <Text style={enrichStyles.statSub}>za m²</Text>
          </View>
          <View style={enrichStyles.statBox}>
            <Text style={enrichStyles.statLabel}>P75</Text>
            <Text style={enrichStyles.statValue}>{p75 ? `${p75.toLocaleString('pl-PL')} zł` : '–'}</Text>
            <Text style={enrichStyles.statSub}>za m²</Text>
          </View>
        </View>
      </View>

      {/* ISOK Flood */}
      <View style={enrichStyles.card}>
        <View style={enrichStyles.rowBetween}>
          <Text style={enrichStyles.cardTitle}>🌊 Ryzyko powodziowe ISOK</Text>
          <View style={[enrichStyles.badge, { backgroundColor: floodColor + '22', borderColor: floodColor }]}>
            <Text style={[enrichStyles.badgeText, { color: floodColor }]}>{floodLabel}</Text>
          </View>
        </View>
        <Text style={enrichStyles.cardSub}>Strefa: {e.isok_flood_zone || 'brak danych'}</Text>
      </View>

      {/* PSE Power Lines */}
      <View style={enrichStyles.card}>
        <View style={enrichStyles.rowBetween}>
          <Text style={enrichStyles.cardTitle}>⚡ Linie energetyczne PSE</Text>
          <View style={[
            enrichStyles.badge,
            e.pse_power_line_nearby
              ? { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' }
              : { backgroundColor: '#22c55e22', borderColor: '#22c55e' },
          ]}>
            <Text style={[
              enrichStyles.badgeText,
              { color: e.pse_power_line_nearby ? '#f59e0b' : '#22c55e' },
            ]}>
              {e.pse_power_line_nearby ? `W pobliżu (~${e.pse_power_line_distance_m} m)` : 'Brak w pobliżu'}
            </Text>
          </View>
        </View>
      </View>

      {/* Travel Times */}
      {e.travel_times && e.travel_times.length > 0 && (
        <View style={enrichStyles.card}>
          <Text style={enrichStyles.cardTitle}>🚗 Czasy dojazdu</Text>
          {(e.travel_times as Array<{ target_name: string; mode: string; duration_min: number }>).map((t, i) => (
            <View key={i} style={enrichStyles.travelRow}>
              <Text style={enrichStyles.travelDest}>{t.target_name}</Text>
              <Text style={enrichStyles.travelTime}>~{t.duration_min} min</Text>
            </View>
          ))}
        </View>
      )}

      {/* POI */}
      {e.poi_data && (e.poi_data as unknown[]).length > 0 && (
        <View style={enrichStyles.card}>
          <Text style={enrichStyles.cardTitle}>📍 Punkty w pobliżu (POI)</Text>
          {(e.poi_data as Array<{ name: string; category: string; distance_m: number }>).slice(0, 5).map((p, i) => (
            <View key={i} style={enrichStyles.poiRow}>
              <Text style={enrichStyles.poiName}>{p.name}</Text>
              <Text style={enrichStyles.poiDist}>{p.distance_m < 1000 ? `${p.distance_m} m` : `${(p.distance_m / 1000).toFixed(1)} km`}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Refresh */}
      {error && <Text style={enrichStyles.errorText}>{error}</Text>}
      <TouchableOpacity style={enrichStyles.refreshBtn} onPress={() => runEnrichment(true)}>
        <Text style={enrichStyles.refreshBtnText}>↻ Odśwież dane</Text>
      </TouchableOpacity>
      <Text style={enrichStyles.disclaimer}>Dane szacunkowe na podstawie dostępnych źródeł. Nie zastępują operatu szacunkowego.</Text>
      <View style={{ height: 32 }} />
    </View>
  )
}

const enrichStyles = StyleSheet.create({
  container: { padding: SPACING.base, gap: SPACING.md },
  center: { padding: SPACING.xl, alignItems: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold },
  emptySub: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: TYPOGRAPHY.sizes.sm },
  analyzeBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    borderRadius: RADII.md,
  },
  analyzeBtnText: { color: '#fff', fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.base },
  card: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  cardTitle: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.sm },
  cardSub: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.c2,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxMedian: { borderColor: COLORS.accent + '80' },
  statLabel: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.medium },
  statValue: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.sm },
  statSub: { color: COLORS.textMuted, fontSize: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.semibold },
  travelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  travelDest: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm },
  travelTime: { color: COLORS.accent, fontWeight: TYPOGRAPHY.weights.medium, fontSize: TYPOGRAPHY.sizes.sm },
  poiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  poiName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm },
  poiDist: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  refreshBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  refreshBtnText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  disclaimer: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', paddingHorizontal: SPACING.md },
})


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.c0, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted },

  // Hero
  hero: { position: 'relative' },
  heroImagePlaceholder: {
    height: 200,
    backgroundColor: COLORS.c2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 64, opacity: 0.25 },
  heroOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.base,
    right: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADII.full,
  },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: TYPOGRAPHY.weights.bold, letterSpacing: 0.5 },
  aiProcessingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADII.full,
  },
  aiProcessingText: { color: COLORS.accent, fontSize: 11, fontWeight: TYPOGRAPHY.weights.medium },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  verdictScore: { fontFamily: TYPOGRAPHY.fontHeading, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold },
  verdictLabel: { fontSize: 11, fontWeight: TYPOGRAPHY.weights.bold, letterSpacing: 1 },

  // Facts row
  factsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.c1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  factItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  factLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase' },
  factValue: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.c1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.c1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  tabTextActive: { color: COLORS.accent },
  tabContent: { padding: SPACING['2xl'] },

  // Info tab
  sectionGap: { gap: SPACING.md },
  infoRow: { borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: SPACING.md },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.md,
  },
  utilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    minWidth: '30%',
  },
  utilityLabel: { color: COLORS.textSecondary, fontSize: 11, flex: 1 },
  utilityValue: { fontSize: 11, fontWeight: TYPOGRAPHY.weights.bold },

  // AI tab
  aiAnalyzeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  aiAnalyzeBtnText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  aiScrollContent: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm },
  aiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  aiHeaderMeta: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  aiRefreshBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.sm, paddingVertical: 4, paddingHorizontal: SPACING.sm },
  aiRefreshBtnText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs },
  valuationCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.sm, padding: SPACING.sm, gap: SPACING.xs, marginBottom: SPACING.base },
  valuationBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  valuationBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  valuationExplanation: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, lineHeight: 16 },
  questionItem: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  questionNum: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, minWidth: 24 },
  questionBody: { flex: 1, gap: 2 },
  questionText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 18 },
  questionContext: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, lineHeight: 14 },
  aiProcessingState: {
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
    gap: SPACING.md,
  },
  aiProcessingTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  aiProcessingSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  aiEmptyIcon: { fontSize: 48 },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.c2,
    borderRadius: RADII.sm,
  },
  confidenceLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  confidenceValue: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold },
  dealBreakerBox: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    borderRadius: RADII.md,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  dealBreakerHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dealBreakerTitle: { color: COLORS.error, fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.base },
  dealBreakerItem: { gap: 3 },
  dealBreakerLabel: { color: COLORS.error, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  dealBreakerRationale: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },
  riskItem: {
    borderLeftWidth: 3,
    paddingLeft: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  riskSeverity: { fontSize: 10, fontWeight: TYPOGRAPHY.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  riskLabel: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium, flex: 1 },
  riskRationale: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },

  // Placeholder
  placeholder: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  placeholderIcon: { fontSize: 40 },
  placeholderTitle: { fontFamily: TYPOGRAPHY.fontHeading, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.textPrimary },
  placeholderSub: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.base,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.c1,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  rejectBtn: {
    width: 50,
    height: 50,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.error + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceBtn: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceBtnText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.5,
  },
  scoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.base,
    height: 50,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
    backgroundColor: COLORS.accentLight,
  },
  scoreBtnText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },

  // ── Notes tab ──
  noteContainer: { gap: SPACING.md },
  noteInputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  noteInput: {
    flex: 1,
    backgroundColor: COLORS.c1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    minHeight: 44,
    maxHeight: 120,
  },
  noteAddBtn: {
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesEmpty: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  notesEmptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  noteCard: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  noteContent: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteMeta: { color: COLORS.textMuted, fontSize: 11 },

  // ── Contacts tab ──
  contactContainer: { gap: SPACING.md },
  contactCard: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    gap: SPACING.md,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  contactInfo: { flex: 1 },
  contactName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.semibold },
  contactMeta: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, marginTop: 2 },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactExpanded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.md,
  },
  logList: { gap: SPACING.sm },
  logItem: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  logIcon: { fontSize: 16, marginTop: 1 },
  logContent: { flex: 1, gap: 2 },
  logSummary: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm },
  logMeta: { color: COLORS.textMuted, fontSize: 11 },
  addLogRow: { gap: SPACING.sm },
  logTypeRow: { flexDirection: 'row', gap: SPACING.sm },
  logTypeBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.c2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTypeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  logTypeBtnText: { fontSize: 16 },
  logInputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  logInput: {
    flex: 1,
    backgroundColor: COLORS.c0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    height: 44,
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.accent + '60',
  },
  addContactBtnText: { color: COLORS.accent, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  addContactForm: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.md,
  },
  addContactTitle: {
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  addContactInput: {
    backgroundColor: COLORS.c0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    height: 44,
  },
  contactTypeRow: { flexDirection: 'row', gap: SPACING.sm },
  contactTypeBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  contactTypeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  contactTypeBtnText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  contactTypeBtnTextActive: { color: COLORS.accent, fontWeight: TYPOGRAPHY.weights.semibold },
  addContactBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  saveContactBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADII.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveContactBtnText: { color: '#fff', fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.sm },
})
