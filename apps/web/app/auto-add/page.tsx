'use client'

// /auto-add?url=<encoded_url>&text=<encoded_text>
// Called by the bookmarklet from external pages (FB, portals).
// Looks up user's workspace, then redirects to InboxView with add dialog pre-filled.

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Suspense } from 'react'

function AutoAddInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [error, setError] = useState<string | null>(null)

  const sourceUrl = searchParams.get('url') ?? ''
  const pastedText = searchParams.get('text') ?? ''

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      // 1. Check auth
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
        return
      }

      // 3. Build inbox URL with add dialog pre-filled
      const params = new URLSearchParams()
      params.set('add', '1')
      if (sourceUrl) params.set('url', sourceUrl)
      if (pastedText) params.set('text', pastedText)

      router.replace(`/app/workspace/${member.workspace_id}/inbox?${params.toString()}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">🏡</span>
            <span className="font-bold text-gray-900 text-lg">Działkometr</span>
          </div>
          <p className="text-2xl mb-3">❌</p>
          <p className="text-gray-900 font-medium text-sm mb-4">{error}</p>
          <button
            onClick={() => router.replace('/app')}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: '#F97316' }}
          >
            Wróć do aplikacji
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-2xl">🏡</span>
          <span className="font-bold text-gray-900 text-lg">Działkometr</span>
        </div>
        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 text-sm">Otwieranie formularza...</p>
      </div>
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
