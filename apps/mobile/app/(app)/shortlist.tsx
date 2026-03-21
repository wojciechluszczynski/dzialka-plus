import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII, VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'
import type { Plot } from '@de/db'

interface PlotWithScore extends Plot {
  plot_scores: Array<{
    score_shared: number | null
    verdict: string | null
    dealbreaker_triggered: boolean
  }>
}

export default function ShortlistScreen() {
  const { workspaceCtx } = useAuth()
  const router = useRouter()
  const [plots, setPlots] = useState<PlotWithScore[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (workspaceCtx.workspace) load()
  }, [workspaceCtx.workspace])

  async function load() {
    const { data } = await supabase
      .from('plots')
      .select('*, plot_scores(*)')
      .eq('workspace_id', workspaceCtx.workspace!.id)
      .in('status', ['shortlist', 'top3'])
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })

    if (data) setPlots(data as PlotWithScore[])
  }

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Shortlista</Text>
          <Text style={styles.count}>{plots.length} działek</Text>
        </View>

        {plots.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>Shortlista jest pusta</Text>
            <Text style={styles.emptyText}>
              Zmień status działki na "Shortlista" lub "Top 3" aby zobaczyć ją tutaj
            </Text>
          </View>
        ) : (
          plots.map((plot) => {
            const score = plot.plot_scores?.[0]
            const verdict = score?.verdict as 'go' | 'maybe' | 'no' | null
            const sharedScore = score?.score_shared

            return (
              <TouchableOpacity
                key={plot.id}
                style={styles.card}
                onPress={() => router.push(`/(app)/plot/${plot.id}` as never)}
                activeOpacity={0.85}
              >
                {/* Hero image placeholder */}
                <View style={styles.heroImage}>
                  <Text style={styles.heroPlaceholder}>🏡</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {plot.title ?? 'Działka bez nazwy'}
                    </Text>
                    {verdict && (
                      <View style={[styles.verdictBadge, {
                        backgroundColor: VERDICT_COLORS[verdict] + '22',
                        borderColor: VERDICT_COLORS[verdict] + '55',
                      }]}>
                        <Text style={[styles.verdictText, { color: VERDICT_COLORS[verdict] }]}>
                          {VERDICT_LABELS[verdict]}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.location} numberOfLines={1}>
                    {plot.location_text ?? '—'}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View>
                      {plot.asking_price_pln && (
                        <Text style={styles.price}>
                          {new Intl.NumberFormat('pl-PL').format(plot.asking_price_pln)} PLN
                        </Text>
                      )}
                      {plot.area_m2 && (
                        <Text style={styles.area}>{plot.area_m2.toLocaleString('pl-PL')} m²</Text>
                      )}
                    </View>
                    {sharedScore != null && (
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>Score</Text>
                        <Text style={[styles.scoreValue, {
                          color: sharedScore >= 7.5 ? COLORS.success
                            : sharedScore >= 6 ? COLORS.warning
                            : COLORS.error
                        }]}>
                          {sharedScore.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  content: { paddingHorizontal: SPACING['2xl'], paddingBottom: 100, gap: SPACING.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  count: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  empty: { paddingVertical: 60, alignItems: 'center', gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  heroImage: {
    height: 160,
    backgroundColor: COLORS.c2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholder: { fontSize: 48, opacity: 0.3 },
  cardBody: { padding: SPACING.base, gap: SPACING.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  cardTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  verdictBadge: {
    borderRadius: RADII.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  verdictText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, letterSpacing: 1 },
  location: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { color: COLORS.accent, fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.semibold },
  area: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: COLORS.textMuted, fontSize: 10 },
  scoreValue: { fontFamily: TYPOGRAPHY.fontHeading, fontSize: TYPOGRAPHY.sizes['2xl'], fontWeight: TYPOGRAPHY.weights.bold },
})
