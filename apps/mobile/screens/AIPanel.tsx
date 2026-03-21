import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { supabase } from '../app/lib/supabase'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'
import type { PlotAiReport } from '@de/db'

const API_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://dzialkometr.netlify.app'

interface AIPanelProps {
  plotId: string
  workspaceId: string
  report: PlotAiReport | null
  onReportUpdated: (report: PlotAiReport) => void
}

type RiskFlag = {
  type: string
  severity: 'low' | 'med' | 'high'
  label: string
  rationale?: string
  confidence: number
  evidence?: string
  is_inference: boolean
}

type DealBreaker = {
  key: string
  label: string
  triggered: boolean
  rationale: string
}

export function AIPanel({ plotId, report, onReportUpdated }: AIPanelProps) {
  const [loading, setLoading] = useState(false)

  const runAnalysis = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nie jesteś zalogowany')

      const res = await fetch(`${API_URL}/api/ai/analyze`, {
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

      const { report: newReport } = await res.json()
      onReportUpdated(newReport)
    } catch (err: unknown) {
      Alert.alert('Błąd AI', (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [plotId, onReportUpdated])

  if (!report) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={styles.emptyTitle}>Brak analizy AI</Text>
        <Text style={styles.emptySubtitle}>
          Kliknij poniżej, aby Claude przeanalizował tę działkę: wyciągnął dane, oznaczył ryzyka i wygenerował pytania do sprzedającego.
        </Text>
        <TouchableOpacity
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          onPress={() => runAnalysis(false)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeBtnText}>⚡ Analizuj AI</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  const extraction = report.extraction_json as Record<string, unknown> | null
  const risks = report.risk_flags_json as { risk_flags?: RiskFlag[]; deal_breakers?: DealBreaker[] } | null
  const valuation = report.valuation_json as Record<string, unknown> | null
  const questions = report.questions_json as Record<string, unknown> | null

  const confidence = report.extraction_confidence ?? 0
  const processedAt = report.processed_at
    ? new Date(report.processed_at).toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🤖 Analiza AI</Text>
          <Text style={styles.headerMeta}>{processedAt} · {report.model_used ?? 'claude'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
          onPress={() => runAnalysis(true)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.accent} size="small" />
            : <Text style={styles.refreshBtnText}>↻ Odśwież</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Confidence bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pewność ekstrakcji</Text>
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceBar}>
            <View style={[
              styles.confidenceFill,
              {
                width: `${Math.round(confidence * 100)}%` as unknown as number,
                backgroundColor: confidence > 0.7 ? COLORS.success : confidence > 0.4 ? COLORS.warning : COLORS.error,
              },
            ]} />
          </View>
          <Text style={styles.confidenceLabel}>{Math.round(confidence * 100)}%</Text>
        </View>
      </View>

      {/* Extracted data */}
      {extraction && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane z ogłoszenia</Text>
          <View style={styles.card}>
            {extraction.asking_price_pln != null && (
              <DataRow label="Cena" value={`${Number(extraction.asking_price_pln).toLocaleString('pl-PL')} zł`} />
            )}
            {extraction.area_m2 != null && (
              <DataRow label="Powierzchnia" value={`${extraction.area_m2} m²`} />
            )}
            {extraction.price_per_m2_pln != null && (
              <DataRow label="Cena/m²" value={`${Number(extraction.price_per_m2_pln).toLocaleString('pl-PL')} zł/m²`} />
            )}
            {extraction.location_text && (
              <DataRow label="Lokalizacja" value={String(extraction.location_text)} />
            )}
            {extraction.zoning && (
              <DataRow label="MPZP" value={String(extraction.zoning)} />
            )}
            {extraction.road_access != null && (
              <DataRow label="Dostęp do drogi" value={extraction.road_access ? '✓ Tak' : '✗ Nie'} />
            )}
            {extraction.contact_type && (
              <DataRow label="Kontakt" value={String(extraction.contact_type)} />
            )}
          </View>
        </View>
      )}

      {/* Valuation */}
      {valuation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wycena</Text>
          <View style={styles.card}>
            <View style={styles.valuationRow}>
              <PricePositionBadge
                position={valuation.price_position as string}
                label={valuation.price_position_label as string}
              />
              <Text style={styles.valuationConf}>
                Pewność: {Math.round(Number(valuation.confidence) * 100)}%
              </Text>
            </View>
            {valuation.explanation && (
              <Text style={styles.valuationExplanation}>{String(valuation.explanation)}</Text>
            )}
            {Array.isArray(valuation.caveats) && (valuation.caveats as string[]).length > 0 && (
              <View style={styles.caveats}>
                {(valuation.caveats as string[]).map((c, i) => (
                  <Text key={i} style={styles.caveat}>⚠️ {c}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Risk flags */}
      {risks?.risk_flags && risks.risk_flags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ryzyka ({risks.risk_flags.length})</Text>
          {risks.risk_flags.map((flag, i) => (
            <View key={i} style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <SeverityBadge severity={flag.severity} />
                <Text style={styles.riskLabel}>{flag.label}</Text>
              </View>
              {flag.rationale && (
                <Text style={styles.riskRationale}>{flag.rationale}</Text>
              )}
              {flag.is_inference && (
                <Text style={styles.inferenceTag}>🧠 Wnioskowane</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Deal breakers */}
      {risks?.deal_breakers && risks.deal_breakers.some(d => d.triggered) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>🚫 Deal breakery</Text>
          {risks.deal_breakers.filter(d => d.triggered).map((db, i) => (
            <View key={i} style={styles.dealBreakerCard}>
              <Text style={styles.dealBreakerLabel}>{db.label}</Text>
              <Text style={styles.dealBreakerRationale}>{db.rationale}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Questions */}
      {questions && Array.isArray((questions as Record<string, unknown>).must_ask_before_contact) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Pytania do sprzedającego</Text>
          <View style={styles.card}>
            {((questions as Record<string, unknown[]>).must_ask_before_contact as Array<{
              question: string
              context?: string
            }>).map((q, i) => (
              <View key={i} style={styles.questionItem}>
                <Text style={styles.questionNum}>{i + 1}.</Text>
                <View style={styles.questionBody}>
                  <Text style={styles.questionText}>{q.question}</Text>
                  {q.context && <Text style={styles.questionContext}>{q.context}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = { low: '#6B7280', med: '#F59E0B', high: '#EF4444' }
  const labels: Record<string, string> = { low: 'niskie', med: 'średn', high: 'wysokie' }
  return (
    <View style={[styles.badge, { backgroundColor: colors[severity] ?? '#6B7280' }]}>
      <Text style={styles.badgeText}>{labels[severity] ?? severity}</Text>
    </View>
  )
}

function PricePositionBadge({ position, label }: { position: string; label: string }) {
  const colors: Record<string, string> = {
    cheap: '#10B981', fair: '#3B82F6', expensive: '#EF4444', unknown: '#6B7280',
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors[position] ?? '#6B7280' }]}>
      <Text style={styles.badgeText}>{label || position}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base },
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.md,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  analyzeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    marginTop: SPACING.md,
    minWidth: 160,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeBtnText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontHeading,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  headerMeta: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, marginTop: 2 },
  refreshBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADII.sm,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnText: { color: COLORS.accent, fontSize: TYPOGRAPHY.sizes.sm },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: { height: '100%', borderRadius: 4 },
  confidenceLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, minWidth: 32 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  dataLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, flex: 1 },
  dataValue: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, flex: 2, textAlign: 'right' },
  valuationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valuationConf: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  valuationExplanation: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  caveats: { gap: 2, marginTop: SPACING.xs },
  caveat: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, lineHeight: 16 },
  riskCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    gap: 4,
  },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  riskLabel: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, flex: 1 },
  riskRationale: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, lineHeight: 16 },
  inferenceTag: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  dealBreakerCard: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dealBreakerLabel: {
    color: '#EF4444',
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  dealBreakerRationale: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, marginTop: 2 },
  questionItem: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  questionNum: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, minWidth: 20 },
  questionBody: { flex: 1, gap: 2 },
  questionText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 18 },
  questionContext: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, lineHeight: 15 },
})
