import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII, VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'
import { computeIndividualScore, computeVerdict } from '@de/scoring'
import type { Plot, ScoringProfile, PlotAssessment } from '@de/db'

const DEFAULT_CRITERIA = [
  { key: 'location',    label: 'Lokalizacja',      weight: 2.0 },
  { key: 'price',       label: 'Cena / m²',         weight: 2.0 },
  { key: 'size',        label: 'Powierzchnia',       weight: 1.5 },
  { key: 'shape',       label: 'Kształt działki',    weight: 1.0 },
  { key: 'access',      label: 'Dojazd / droga',     weight: 1.5 },
  { key: 'utilities',   label: 'Media (prąd/woda)',  weight: 1.5 },
  { key: 'zoning',      label: 'MPZP / warunki',     weight: 2.0 },
  { key: 'neighbors',   label: 'Sąsiedztwo',         weight: 1.0 },
  { key: 'commute',     label: 'Dojazd do pracy',    weight: 1.5 },
  { key: 'potential',   label: 'Potencjał wzrostu',  weight: 1.0 },
]

interface Props {
  plot: Plot
  visible: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function ScoringModal({ plot, visible, onClose, onSaved }: Props) {
  const { workspaceCtx, user } = useAuth()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [dealBreakers, setDealBreakers] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) loadExisting()
  }, [visible, plot.id])

  async function loadExisting() {
    setLoading(true)
    const { data } = await supabase
      .from('plot_assessments')
      .select('*')
      .eq('plot_id', plot.id)
      .eq('user_id', user?.id)
      .maybeSingle()

    if (data) {
      const scoresObj = data.scores as Record<string, number> ?? {}
      const dbObj     = data.deal_breakers as Record<string, boolean> ?? {}
      const notesObj  = data.notes_per_criterion as Record<string, string> ?? {}
      setRatings(scoresObj)
      setDealBreakers(dbObj)
      setNotes(notesObj)
    } else {
      const init: Record<string, number> = {}
      DEFAULT_CRITERIA.forEach(c => { init[c.key] = 5 })
      setRatings(init)
      setDealBreakers({})
      setNotes({})
    }
    setLoading(false)
  }

  function computeLiveScore() {
    const scores = DEFAULT_CRITERIA.map(c => ({
      criterionKey: c.key,
      weight: c.weight,
      rating: ratings[c.key] ?? 5,
      isDealBreaker: dealBreakers[c.key] ?? false,
    }))
    return computeIndividualScore(scores)
  }

  async function handleSave() {
    setSaving(true)
    const wsId = workspaceCtx.workspace!.id
    const score = computeLiveScore()

    // Upsert assessment
    await supabase.from('plot_assessments').upsert({
      plot_id: plot.id,
      workspace_id: wsId,
      user_id: user!.id,
      scores: ratings,
      deal_breakers: dealBreakers,
      notes_per_criterion: notes,
      total_score: score,
    }, { onConflict: 'plot_id,user_id' })

    // Upsert plot score
    await supabase.from('plot_scores').upsert({
      plot_id: plot.id,
      workspace_id: wsId,
      score_shared: score,
      verdict: computeVerdict(score),
    }, { onConflict: 'plot_id' })

    setSaving(false)
    onSaved?.()
    onClose()
  }

  const liveScore  = computeLiveScore()
  const verdict    = computeVerdict(liveScore)
  const verdictCol = VERDICT_COLORS[verdict] ?? COLORS.accent

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Oceń działkę</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={COLORS.accent} />
              : <Text style={styles.saveBtn}>Zapisz</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Score banner */}
        <View style={[styles.scoreBanner, { borderColor: verdictCol + '44', backgroundColor: verdictCol + '11' }]}>
          <Text style={[styles.scoreBig, { color: verdictCol }]}>
            {liveScore.toFixed(1)}
          </Text>
          <View>
            <Text style={[styles.verdictLabel, { color: verdictCol }]}>
              {VERDICT_LABELS[verdict]}
            </Text>
            <Text style={styles.scoreSubtitle}>{plot.title ?? 'Działka'}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {DEFAULT_CRITERIA.map(crit => {
              const val = ratings[crit.key] ?? 5
              const isDB = dealBreakers[crit.key] ?? false
              return (
                <View key={crit.key} style={[styles.criterion, isDB && styles.criterionDB]}>
                  <View style={styles.critHeader}>
                    <Text style={styles.critLabel}>{crit.label}</Text>
                    <View style={styles.critRight}>
                      {/* Deal-breaker toggle */}
                      <TouchableOpacity
                        onPress={() => setDealBreakers(prev => ({ ...prev, [crit.key]: !isDB }))}
                        style={[styles.dbBadge, isDB && styles.dbBadgeActive]}
                      >
                        <Text style={[styles.dbText, isDB && styles.dbTextActive]}>
                          {isDB ? '🚫 deal-breaker' : 'DB?'}
                        </Text>
                      </TouchableOpacity>
                      {/* Score */}
                      <View style={styles.scoreChip}>
                        <Text style={styles.scoreChipText}>{val.toFixed(0)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>1</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={10}
                      step={1}
                      value={val}
                      onValueChange={v => setRatings(prev => ({ ...prev, [crit.key]: v }))}
                      minimumTrackTintColor={isDB ? COLORS.danger ?? '#EF4444' : COLORS.accent}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={isDB ? COLORS.danger ?? '#EF4444' : COLORS.accent}
                    />
                    <Text style={styles.sliderLabel}>10</Text>
                  </View>
                  <Text style={styles.weightLabel}>waga: ×{crit.weight}</Text>
                </View>
              )
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  saveBtn: { color: COLORS.accent, fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.sm },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    margin: SPACING['2xl'],
    padding: SPACING.base,
    borderRadius: RADII.lg,
    borderWidth: 1,
  },
  scoreBig: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: 52,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 56,
  },
  verdictLabel: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoreSubtitle: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, marginTop: 2 },
  list: { paddingHorizontal: SPACING['2xl'], gap: SPACING.md },
  criterion: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: 6,
  },
  criterionDB: { borderColor: (COLORS.danger ?? '#EF4444') + '55' },
  critHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  critLabel: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  critRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dbBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dbBadgeActive: { backgroundColor: (COLORS.danger ?? '#EF4444') + '22', borderColor: COLORS.danger ?? '#EF4444' },
  dbText: { fontSize: 10, color: COLORS.textMuted },
  dbTextActive: { color: COLORS.danger ?? '#EF4444' },
  scoreChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipText: { color: COLORS.accent, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  slider: { flex: 1, height: 32 },
  sliderLabel: { color: COLORS.textMuted, fontSize: 10, width: 12, textAlign: 'center' },
  weightLabel: { color: COLORS.textMuted, fontSize: 9, textAlign: 'right' },
})
