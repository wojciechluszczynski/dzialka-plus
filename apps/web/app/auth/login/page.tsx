'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const SHARED_EMAIL = 'app@dzialka.plus'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: SHARED_EMAIL,
      password: password,
    })

    setLoading(false)
    if (signInError) {
      setError('Nieprawidłowe hasło')
    } else {
      router.push('/app')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#1E2B3C' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-80 p-10" style={{ background: '#1A2535' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F97316' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Działkometr</span>
          </div>
          <h2 className="text-white text-2xl font-semibold leading-snug mb-4">
            Od linku<br />do decyzji.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
            Scoring, ryzyka i cena w jednym miejscu.
          </p>
        </div>
        <div className="space-y-3">
          {['Szybki intake z Facebooka i portali', 'Scoring działek: Wojtek + Sabina', 'AI werdykty: warto / ostrożnie / odpuść'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.2)' }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xs" style={{ color: '#94A3B8' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F97316' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <span className="text-white font-semibold text-xl">Działkometr</span>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-white mb-1">Zaloguj się</h1>
          <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>Podaj hasło dostępu do aplikacji</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-white placeholder-white/25 text-base focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: error ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.12)',
                }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full font-semibold rounded-lg py-3 text-white text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#F97316' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Wchodzę...
                </span>
              ) : 'Wejdź'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
