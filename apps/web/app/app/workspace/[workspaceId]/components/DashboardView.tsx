'use client'

import Link from 'next/link'
import { VERDICT_COLORS, VERDICT_LABELS, STATUS_LABELS, STATUS_COLORS } from '@de/ui'
import type { Verdict, PlotStatus, SourceType } from '@de/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashPlot = any

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M'
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

function mapsUrl(plot: DashPlot): string | null {
  if (plot.lat && plot.lng) return `https://maps.google.com/?q=${plot.lat},${plot.lng}`
  if (plot.location_text) return `https://maps.google.com/?q=${encodeURIComponent(plot.location_text)}`
  return null
}

interface Props {
  plots: DashPlot[]
  workspaceId: string
}

export default function DashboardView({ plots, workspaceId }: Props) {
  const total = plots.length

  // Count by verdict
  const byVerdict = { go: 0, maybe: 0, no: 0, none: 0 }
  for (const p of plots) {
    const v = p.plot_scores?.[0]?.verdict as Verdict | null
    if (v === 'go') byVerdict.go++
    else if (v === 'maybe') byVerdict.maybe++
    else if (v === 'no') byVerdict.no++
    else byVerdict.none++
  }

  // Count by status (top 4)
  const statusCounts: Partial<Record<PlotStatus, number>> = {}
  for (const p of plots) {
    statusCounts[p.status as PlotStatus] = (statusCounts[p.status as PlotStatus] ?? 0) + 1
  }

  const aiProcessed = plots.filter(p => p.ai_processed_at).length

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
          <span className="text-base leading-none">+</span>
          Dodaj działkę
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Łącznie</div>
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-gray-400 text-xs mt-1">działek</div>
        </div>

        {/* Go */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: VERDICT_COLORS.go }}>
            ✓ {VERDICT_LABELS.go}
          </div>
          <div className="text-3xl font-bold" style={{ color: VERDICT_COLORS.go }}>{byVerdict.go}</div>
          <div className="text-gray-400 text-xs mt-1">
            {byVerdict.maybe > 0 ? `+ ${byVerdict.maybe} ${VERDICT_LABELS.maybe}` : 'kandydatów'}
          </div>
        </div>

        {/* AI processed */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">AI gotowe</div>
          <div className="text-3xl font-bold text-gray-900">{aiProcessed}</div>
          <div className="text-gray-400 text-xs mt-1">
            {total > 0 ? `z ${total} (${Math.round(aiProcessed / total * 100)}%)` : ''}
          </div>
        </div>

        {/* No / dealbreakers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: VERDICT_COLORS.no }}>
            ✗ {VERDICT_LABELS.no}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80"
                style={{
                  background: STATUS_COLORS[status] + '14',
                  color: STATUS_COLORS[status],
                  borderColor: STATUS_COLORS[status] + '30',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[status] }}
                />
                {STATUS_LABELS[status]}: {count}
              </Link>
            ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: '📥', label: 'Skrzynka', href: `/app/workspace/${workspaceId}/inbox`, desc: 'Przeglądaj i dodawaj' },
          { icon: '⭐', label: 'Shortlista', href: `/app/workspace/${workspaceId}/shortlist`, desc: 'Top kandydaci' },
          { icon: '⚖️', label: 'Porównaj', href: `/app/workspace/${workspaceId}/compare`, desc: 'Zestawienie' },
          { icon: '🔖', label: 'Zakładka FB', href: '/bookmarklet.html', desc: 'Dodaj przez bookmarklet' },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <span className="text-2xl flex-shrink-0">{a.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">{a.label}</div>
              <div className="text-xs text-gray-400 truncate">{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent plots */}
      {recentPlots.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ostatnio dodane</h2>
            <Link href={`/app/workspace/${workspaceId}/inbox`}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium">
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {recentPlots.map((plot, i) => {
              const score = plot.plot_scores?.[0]
              const verdict = score?.verdict as Verdict | null
              const maps = mapsUrl(plot)
              return (
                <div
                  key={plot.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : undefined }}
                >
                  {/* Verdict dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: verdict ? VERDICT_COLORS[verdict] : '#E5E7EB',
                    }}
                  />

                  {/* Title + location */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/app/workspace/${workspaceId}/plot/${plot.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-orange-500 transition-colors truncate block"
                    >
                      {plot.title ?? <span className="text-gray-400 italic font-normal">Analizuję...</span>}
                    </Link>
                    {plot.location_text && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-gray-400 text-xs truncate">{plot.location_text}</span>
                        {maps && (
                          <a
                            href={maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-blue-400 hover:text-blue-600 text-xs flex-shrink-0 transition-colors"
                            title="Otwórz w Google Maps"
                          >
                            🗺
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-sm font-medium text-gray-700 flex-shrink-0 hidden sm:block">
                    {plot.asking_price_pln ? fmtPrice(plot.asking_price_pln) : '—'}
                  </div>

                  {/* Verdict badge */}
                  <div className="flex-shrink-0 w-16 text-right">
                    {verdict ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ background: VERDICT_COLORS[verdict] }}>
                        {VERDICT_LABELS[verdict]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-400 flex-shrink-0 hidden md:block w-20 text-right">
                    {timeAgo(plot.created_at)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏡</div>
          <p className="text-gray-700 font-semibold text-lg mb-1">Zacznij budować zestawienie</p>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Dodaj działki z linku, wklejając tekst ogłoszenia lub uploadując screenshota z telefonu.
            AI automatycznie wyciągnie dane i oceni każdą działkę.
          </p>
          <Link
            href={`/app/workspace/${workspaceId}/inbox?add=1`}
            className="inline-flex items-center gap-2 text-white font-semibold rounded-xl px-6 py-3 transition-opacity hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            + Dodaj pierwszą działkę
          </Link>
        </div>
      )}
    </div>
  )
}
