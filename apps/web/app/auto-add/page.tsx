'use client'

// /auto-add?url=<encoded_listing_url>&text=<encoded_fb_post_text>
// Called by the FB bookmarklet. Creates plot + note + triggers AI, then redirects.

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Suspense } from 'react'

type Stage = 'auth' | 'creating' | 'noting' | 'ai' | 'done' | 'error'

function AutoAddInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [stage, setStage] = useState<Stage>('auth')
  const [error, setError] = useState<string | null>(null)
  const [plotTitle, setPlotTitle] = useState<string>('')

  const sourceUrl = searchParams.get('url') ?? ''
  const pastedText = searchParams.get('text') ?? ''

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      // 1. Check auth
      setStage('auth')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login?next=' + encodeURIComponent(window.location.href))
        return
      }

      // 2. Get workspace
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (!member) {
        setError('Nie znaleziono workspace. Zaloguj się ponownie.')
        setStage('error')
        return
      }
      const workspaceId = member.workspace_id

      // 3. Detect source + build title from URL
      const titleFromUrl = buildTitle(sourceUrl, pastedText)
      setPlotTitle(titleFromUrl)

      // 4. Create plot
      setStage('creating')
      const { data: plot, error: insertErr } = await supabase
        .from('plots')
        .insert({
          workspace_id: workspaceId,
          created_by: session.user.id,
          status: 'inbox',
          source_url: sourceUrl || null,
          source_type: detectSource(sourceUrl),
          title: titleFromUrl || null,
        })
        .select()
        .single()

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError('Ta działka już istnieje w bazie.')
        } else {
          setError('Błąd dodawania: ' + insertErr.message)
        }
        setStage('error')
        return
      }

      // 5. Save pasted FB text as note
      if (pastedText && pastedText.length > 10) {
        setStage('noting')
        await supabase.from('plot_notes').insert({
          plot_id: plot.id,
          workspace_id: workspaceId,
          user_id: session.user.id,
          content: pastedText,
          is_voice: false,
        })
      }

      // 6. Trigger AI analysis (fire-and-forget)
      setStage('ai')
      supabase.functions.invoke('process_plot', {
        body: { plot_id: plot.id },
        headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
      }).catch(console.warn)

      // Short pause so user sees the success state
      setStage('done')
      await delay(1200)

      // 7. Redirect to plot detail
      router.replace(`/app/workspace/${workspaceId}/plot/${plot.id}`)
    } catch (e) {
      setError((e as Error).message)
      setStage('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F8F9FA' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-2xl">🏡</span>
          <span className="font-bold text-gray-900 text-lg">Działkometr</span>
        </div>

        {stage !== 'error' ? (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
            </div>
            <p className="text-gray-900 font-medium text-sm mb-1">
              {stage === 'auth' && 'Sprawdzam sesję...'}
              {stage === 'creating' && 'Dodaję działkę...'}
              {stage === 'noting' && 'Zapisuję treść ogłoszenia...'}
              {stage === 'ai' && 'Uruchamiam analizę AI...'}
              {stage === 'done' && '✅ Gotowe! Przekierowuję...'}
            </p>
            {plotTitle && (
              <p className="text-gray-400 text-xs mt-2 break-all">{plotTitle}</p>
            )}
            {sourceUrl && (
              <p className="text-gray-300 text-xs mt-1 break-all truncate">{sourceUrl}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-2xl mb-3">❌</p>
            <p className="text-gray-900 font-medium text-sm mb-4">{error}</p>
            <button
              onClick={() => router.replace('/app')}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ background: '#F97316' }}
            >
              Wróć do aplikacji
            </button>
          </>
        )}
      </div>

      {pastedText && stage !== 'error' && (
        <p className="text-gray-400 text-xs mt-4 max-w-xs text-center">
          Zapisuję {pastedText.length} znaków tekstu ogłoszenia z Facebooka
        </p>
      )}
    </div>
  )
}

export default function AutoAddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
      </div>
    }>
      <AutoAddInner />
    </Suspense>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function detectSource(url: string): string {
  if (!url) return 'other'
  const u = url.toLowerCase()
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  if (u.includes('domiporta.pl')) return 'domiporta'
  if (u.includes('morizon.pl')) return 'morizon'
  return 'other'
}

function buildTitle(url: string, text: string): string {
  // Try to extract a short title from the first line of pasted text
  if (text) {
    const firstLine = (text.split('\n')[0] ?? '').trim()
    if (firstLine.length > 5 && firstLine.length < 100) return firstLine
  }
  // Fallback to domain name
  if (url) {
    try {
      const host = new URL(url).hostname.replace('www.', '')
      return `Działka z ${host}`
    } catch { /* ignore */ }
  }
  return 'Nowa działka'
}
