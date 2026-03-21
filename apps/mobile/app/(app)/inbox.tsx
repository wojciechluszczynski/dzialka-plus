import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII, STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS } from '@de/ui'
import type { Plot, PlotStatus } from '@de/db'

const FILTER_STATUSES: PlotStatus[] = ['inbox', 'draft', 'to_analyze', 'to_visit']

export default function InboxScreen() {
  const { workspaceCtx } = useAuth()
  const router = useRouter()
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<PlotStatus | 'all'>('all')

  useEffect(() => {
    if (workspaceCtx.workspace) loadPlots()
  }, [workspaceCtx.workspace, activeFilter])

  async function loadPlots() {
    const wsId = workspaceCtx.workspace!.id
    let q = supabase
      .from('plots')
      .select('*')
      .eq('workspace_id', wsId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (activeFilter !== 'all') {
      q = q.eq('status', activeFilter)
    } else {
      q = q.in('status', FILTER_STATUSES)
    }

    const { data } = await q.limit(50)
    if (data) setPlots(data as Plot[])
    setLoading(false)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPlots()
    setRefreshing(false)
  }, [activeFilter, workspaceCtx.workspace])

  const renderPlot = ({ item }: { item: Plot }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/plot/${item.id}` as never)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? 'Nowa działka (draft)'}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.cardLocation} numberOfLines={1}>
        <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />{' '}
        {item.location_text ?? '— lokalizacja nieznana'}
      </Text>
      <View style={styles.cardFooter}>
        {item.asking_price_pln ? (
          <Text style={styles.cardPrice}>
            {new Intl.NumberFormat('pl-PL').format(item.asking_price_pln)} PLN
            {item.area_m2 && (
              <Text style={styles.cardPriceM2}>
                {' '}· {Math.round(item.asking_price_pln / item.area_m2)} PLN/m²
              </Text>
            )}
          </Text>
        ) : (
          <Text style={styles.cardPriceMissing}>Cena nieznana</Text>
        )}
        {item.source_type && (
          <Text style={styles.sourceLabel}>
            {SOURCE_LABELS[item.source_type]}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.count}>{plots.length} działek</Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filtersRow}>
        {(['all', ...FILTER_STATUSES] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterPill, activeFilter === s && styles.filterPillActive]}
            onPress={() => setActiveFilter(s)}
          >
            <Text style={[styles.filterText, activeFilter === s && styles.filterTextActive]}>
              {s === 'all' ? 'Wszystkie' : STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={plots}
          keyExtractor={(p) => p.id}
          renderItem={renderPlot}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Brak działek w tej kategorii</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.base,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  count: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.sm,
    paddingBottom: SPACING.base,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  filterText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.medium },
  filterTextActive: { color: COLORS.accent },
  list: { paddingHorizontal: SPACING['2xl'], paddingBottom: 100, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  cardTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  statusPill: { borderRadius: RADII.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: TYPOGRAPHY.weights.medium },
  cardLocation: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { color: COLORS.accent, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold },
  cardPriceM2: { color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weights.regular },
  cardPriceMissing: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  sourceLabel: { color: COLORS.textMuted, fontSize: 10 },
  empty: { paddingVertical: SPACING['3xl'], alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
})
