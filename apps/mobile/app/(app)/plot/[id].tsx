import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native'
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
import type { Plot, PlotAiReport, PlotScore, Verdict } from '@de/db'
import { VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'

type Tab = 'info' | 'ai' | 'notes' | 'contacts'

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
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [advancingStatus, setAdvancingStatus] = useState(false)

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
            {(['info', 'ai', 'notes', 'contacts'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'info' ? 'Info' : tab === 'ai' ? 'AI ✨' : tab === 'notes' ? 'Notatki' : 'Kontakty'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'info' && <InfoTab plot={plot} />}
            {activeTab === 'ai' && <AITab aiReport={aiReport} isProcessing={!plot.ai_processed_at} />}
            {activeTab === 'notes' && <PlaceholderTab icon="📝" title="Notatki" subtitle="Sprint 2" />}
            {activeTab === 'contacts' && <PlaceholderTab icon="📞" title="Kontakty" subtitle="Sprint 2" />}
          </View>
        </ScrollView>

        {/* Bottom action bar */}
        {plot.status !== 'rejected' && plot.status !== 'closed' && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectPlot}>
              <Ionicons name="close" size={20} color={COLORS.error} />
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
                  <>
                    <Text style={styles.advanceBtnText}>→ {nextStatusLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
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

function AITab({ aiReport, isProcessing }: { aiReport?: PlotAiReport; isProcessing: boolean }) {
  if (isProcessing) {
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
        <Text style={styles.aiProcessingSubtitle}>Dodaj więcej danych o działce aby uruchomić AI</Text>
      </View>
    )
  }

  const risks = (aiReport.risk_flags_json as Record<string, unknown>)?.risk_flags as Array<{
    severity: string; label: string; rationale: string
  }> ?? []
  const dealBreakers = (aiReport.risk_flags_json as Record<string, unknown>)?.deal_breakers as Array<{
    key: string; label: string; triggered: boolean; rationale: string
  }> ?? []

  return (
    <View style={styles.sectionGap}>
      {/* Confidence */}
      {aiReport.extraction_confidence != null && (
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Pewność AI:</Text>
          <Text style={[styles.confidenceValue, {
            color: aiReport.extraction_confidence > 0.7 ? COLORS.success
              : aiReport.extraction_confidence > 0.4 ? COLORS.warning
              : COLORS.error,
          }]}>
            {Math.round(aiReport.extraction_confidence * 100)}%
          </Text>
        </View>
      )}

      {/* Deal breakers */}
      {dealBreakers.filter((d) => d.triggered).length > 0 && (
        <View style={styles.dealBreakerBox}>
          <View style={styles.dealBreakerHeader}>
            <Ionicons name="warning" size={18} color={COLORS.error} />
            <Text style={styles.dealBreakerTitle}>Deal breakers wykryte</Text>
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
    </View>
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
})
