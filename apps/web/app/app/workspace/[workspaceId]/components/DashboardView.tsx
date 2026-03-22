'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { MapPin, Map, Plus, Inbox, Star, BarChart2, Bookmark, TrendingUp, Check, X, Minus } from 'lucide-react'
import { VERDICT_COLORS, VERDICT_LABELS, STATUS_LABELS, STATUS_COLORS } from '@de/ui'
import type { Verdict, PlotStatus } from '@de/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashPlot = any

interface Props {
  workspaceId: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M PLN'
  return new Intl.NumberFormat('pl-PL').format(n) + ' PLN'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'dzisiaj'
  if (days === 1) return 'wczoraj'
  if (days < 7) return `${days} dni temu`
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`
  return `${Math.floor(days / 30)} mies. temu`
}

// ─── Quick action card ────────────────────────────────────────────────────────
function QuickAction({ icon, label, desc, href, gradient }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  label: string
  desc: string
  href: string
  gradient: string
}) {
  const Icon = icon
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3 group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: gradient }}
      >
        <Icon size={18} color="white" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{label}</div>
        <div className="text-xs text-gray-400 truncate">{desc}</div>
      </div>
    </Link>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="min-h-screen p-6 animate-pulse" style={{ background: '#F8F9FA' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-36 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 rounded-xl" style={{ background: '#F9731640' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="h-3 w-14 bg-gray-200 rounded mb-3" />
            <div className="h-9 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-16 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <div className="flex-1 h-4 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded hidden sm:block" />
            <div className="h-5 w-12 bg-gray-100 rounded-full" />
            <div className="h-3 w-14 bg-gray-100 rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardView({ workspaceId }: Props) {
  const [plots, setPlots] = useState<DashPlot[] | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    supabase
      .from('plots')
      .select('id, title, location_text, asking_price_pln, area_m2, status, source_type, created_at, ai_processed_at, lat, lng, plot_scores(verdict, score_shared, dealbreaker_triggered)')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setPlots(data ?? []))
  }, [workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (plots === null) return <DashSkeleton />

  const total = plots.length
  const byVerdict = { go: 0, maybe: 0, no: 0, none: 0 }
  for (const p of plots) {
    const v = p.plot_scores?.[0]?.verdict as Verdict | null
    if (v === 'go') byVerdict.go++
    else if (v === 'maybe') byVerdict.maybe++
    else if (v === 'no') byVerdict.no++
    else byVerdict.none++
  }
  const statusCounts: Partial<Record<PlotStatus, number>> = {}
  for (const p of plots) {
    statusCounts[p.status as PlotStatus] = (statusCounts[p.status as PlotStatus] ?? 0) + 1
  }
  const aiProcessed = plots.filter((p: DashPlot) => p.ai_processed_at).length
  const recentPlots = plots.slice(0, 8)

  return (
    <div className="min-h-screen p-6" style={{ background: '#F8F9FA' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {total === 0 ? 'Brak działek — dodaj pierwszą' : `${total} działek w zestawieniu`}
          </p>
        </div>
        <Link
          href={`/app/workspace/${workspaceId}/inbox?add=1`}
          className="text-white font-semibold text-sm rounded-xl px-5 py-2.5 transition-opacity hover:opacity-90 flex items-center gap-2"
          style={{ background: '#F97316' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Dodaj działkę
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Łącznie</div>
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-gray-400 text-xs mt-1">działek</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Check size={12} strokeWidth={2.5} style={{ color: VERDICT_COLORS.go }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: VERDICT_COLORS.go }}>
              {VERDICT_LABELS.go}
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: VERDICT_COLORS.go }}>{byVerdict.go}</div>
          <div className="text-gray-400 text-xs mt-1">
            {byVerdict.maybe > 0 ? `+ ${byVerdict.maybe} ${VERDICT_LABELS.maybe}` : 'kandydatów'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} strokeWidth={2} className="text-gray-400" />
            <span className="text-gray-400 text-xs uppercase tracking-wide">AI gotowe</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{aiProcessed}</div>
          <div className="text-gray-400 text-xs mt-1">
            {total > 0 ? `z ${total} (${Math.round(aiProcessed / total * 100)}%)` : ''}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <X size={12} strokeWidth={2.5} style={{ color: VERDICT_COLORS.no }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: VERDICT_COLORS.no }}>
              {VERDICT_LABELS.no}
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: byVerdict.no > 0 ? VERDICT_COLORS.no : '#D1D5DB' }}>
            {byVerdict.no}
          </div>
          <div className="text-gray-400 text-xs mt-1">odrzuconych</div>
        </div>
      </div>

      {/* Status pills */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.entries(statusCounts) as [PlotStatus, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <Link
                key={status}
                href={`/app/workspace/${workspaceId}/inbox`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-75"
                style={{
                  background: STATUS_COLORS[status] + '14',
                  color: STATUS_COLORS[status],
                  borderColor: STATUS_COLORS[status] + '30',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[status] }} />
                {STATUS_LABELS[status]}: {count}
              </Link>
            ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <QuickAction
          icon={Inbox}
          label="Skrzynka"
          desc="Przeglądaj i dodawaj"
          href={`/app/workspace/${workspaceId}/inbox`}
          gradient="linear-gradient(135deg, #3B82F6, #6366F1)"
        />
        <QuickAction
          icon={Star}
          label="Shortlista"
          desc="Top kandydaci"
          href={`/app/workspace/${workspaceId}/shortlist`}
          gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
        />
        <QuickAction
          icon={BarChart2}
          label="Porównaj"
          desc="Zestawienie side-by-side"
          href={`/app/workspace/${workspaceId}/compare`}
          gradient="linear-gradient(135deg, #14B8A6, #3B82F6)"
        />
        <QuickAction
          icon={Bookmark}
          label="Zakładka FB"
          desc="Instalacja bookmarkletu"
          href="/bookmarklet.html"
          gradient="linear-gradient(135deg, #1E2B3C, #2D4060)"
        />
      </div>

      {/* Recent plots */}
      {recentPlots.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ostatnio dodane</h2>
            <Link href={`/app/workspace/${workspaceId}/inbox`}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {recentPlots.map((plot: DashPlot, i: number) => {
              const score = plot.plot_scores?.[0]
              const verdict = score?.verdict as Verdict | null
              const mapsHref = plot.lat && plot.lng
                ? `https://maps.google.com/?q=${plot.lat},${plot.lng}`
                : plot.location_text
                  ? `https://maps.google.com/?q=${encodeURIComponent(plot.location_text)}`
                  : null

              return (
                <div
                  key={plot.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : undefined }}
                >
                  {/* Verdict dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: verdict ? VERDICT_COLORS[verdict] : '#E5E7EB' }} />

                  {/* Title + location */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/app/workspace/${workspaceId}/plot/${plot.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-orange-500 transition-colors truncate block"
                    >
                      {plot.title ?? <span className="text-gray-400 italic font-normal text-xs">Analizuję...</span>}
                    </Link>
                    {plot.location_text && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                        <span className="text-gray-400 text-xs truncate">{plot.location_text}</span>
                        {mapsHref && (
                          <a href={mapsHref} target="_blank" rel="noopener noreferrer"
                            className="text-blue-300 hover:text-blue-500 transition-colors flex-shrink-0">
                            <Map size={10} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-sm font-medium text-gray-600 flex-shrink-0 hidden sm:block min-w-[100px] text-right">
                    {plot.asking_price_pln ? fmtPrice(plot.asking_price_pln) : <span className="text-gray-300">—</span>}
                  </div>

                  {/* Verdict badge */}
                  <div className="flex-shrink-0 w-16 text-right">
                    {verdict ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1"
                        style={{ background: VERDICT_COLORS[verdict] }}>
                        {verdict === 'go' && <Check size={9} strokeWidth={3} />}
                        {verdict === 'no' && <X size={9} strokeWidth={3} />}
                        {verdict === 'maybe' && <Minus size={9} strokeWidth={3} />}
                        {VERDICT_LABELS[verdict]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-200">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-300 flex-shrink-0 hidden md:block w-20 text-right">
                    {timeAgo(plot.created_at)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(249,115,22,0.1)' }}>
            <Inbox size={28} style={{ color: '#F97316' }} />
          </div>
          <p className="text-gray-700 font-semibold text-lg mb-1">Zacznij budować zestawienie</p>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Dodaj działki z linku, wklejając tekst ogłoszenia lub uploadując screenshot z telefonu.
            AI automatycznie wyciągnie dane i oceni każdą działkę.
          </p>
          <Link
            href={`/app/workspace/${workspaceId}/inbox?add=1`}
            className="inline-flex items-center gap-2 text-white font-semibold rounded-xl px-6 py-3 transition-opacity hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Dodaj pierwszą działkę
          </Link>
        </div>
      )}
    </div>
  )
}
