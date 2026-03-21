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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII, STATUS_LABELS, STATUS_COLORS } from '@de/ui'
import type { Plot } from '@de/db'

export default function HomeScreen() {
  const { workspaceCtx, user } = useAuth()
  const router = useRouter()
  const [recentPlots, setRecentPlots] = useState<Plot[]>([])
  const [stats, setStats] = useState({ total: 0, shortlist: 0, inbox: 0 })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (workspaceCtx.workspace) loadData()
  }, [workspaceCtx.workspace])

  async function loadData() {
    const wsId = workspaceCtx.workspace!.id

    const [plotsRes, statsRes] = await Promise.all([
      supabase
        .from('plots')
        .select('*')
        .eq('workspace_id', wsId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('plots')
        .select('status', { count: 'exact', head: false })
        .eq('workspace_id', wsId)
        .eq('is_deleted', false),
    ])

    if (plotsRes.data) setRecentPlots(plotsRes.data as Plot[])

    if (statsRes.data) {
      const all = statsRes.data as Array<{ status: string }>
      setStats({
        total: all.length,
        shortlist: all.filter((p) => p.status === 'shortlist' || p.status === 'top3').length,
        inbox: all.filter((p) => p.status === 'inbox').length,
      })
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dzień dobry 👋</Text>
            <Text style={styles.wsName}>{workspaceCtx.workspace?.name}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <Text style={styles.avatarText}>
              {user?.email?.[0]?.toUpperCase() ?? 'W'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Łącznie', value: stats.total, color: COLORS.accent },
            { label: 'Inbox', value: stats.inbox, color: COLORS.warning },
            { label: 'Shortlista', value: stats.shortlist, color: COLORS.success },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Ostatnio aktywne</Text>

        {recentPlots.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏡</Text>
            <Text style={styles.emptyTitle}>Brak działek</Text>
            <Text style={styles.emptyText}>
              Kliknij + aby dodać pierwszą działkę
            </Text>
          </View>
        ) : (
          recentPlots.map((plot) => (
            <TouchableOpacity
              key={plot.id}
              style={styles.plotCard}
              onPress={() => router.push(`/(app)/plot/${plot.id}` as never)}
              activeOpacity={0.8}
            >
              <View style={styles.plotCardInner}>
                <View style={styles.plotCardLeft}>
                  <Text style={styles.plotTitle} numberOfLines={1}>
                    {plot.title ?? 'Nowa działka'}
                  </Text>
                  <Text style={styles.plotMeta}>
                    {plot.location_text ?? '— lokalizacja nieznana'}
                  </Text>
                  {plot.asking_price_pln && (
                    <Text style={styles.plotPrice}>
                      {new Intl.NumberFormat('pl-PL').format(plot.asking_price_pln)} PLN
                      {plot.area_m2 && (
                        <Text style={styles.plotPriceM2}>
                          {' '}· {Math.round(plot.asking_price_pln / plot.area_m2)} PLN/m²
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
                <View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[plot.status] + '22' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[plot.status] }]}>
                      {STATUS_LABELS[plot.status]}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  scroll: { flex: 1 },
  content: { padding: SPACING['2xl'], paddingBottom: 80, gap: SPACING.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  greeting: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  wsName: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.md,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
    gap: SPACING.sm,
  },
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
  },
  plotCard: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  plotCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
    gap: SPACING.md,
  },
  plotCardLeft: { flex: 1, gap: 3 },
  plotTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  plotMeta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  plotPrice: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  plotPriceM2: {
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  statusBadge: {
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
})
