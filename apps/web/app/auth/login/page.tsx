'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/app'
  const supabase = createClientComponentClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-c0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border-2 border-accent mb-4">
            <span className="font-heading text-2xl font-bold text-accent tracking-wider">DE</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-wide">
            DecisionEngine
          </h1>
          <p className="text-text-secondary text-sm mt-1">Działki. Decyzje. Pewność.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                Adres email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wojtek@example.com"
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-heading font-semibold rounded-lg py-3 transition-colors mt-2"
            >
              {loading ? 'Wysyłanie...' : 'Wyślij link logowania'}
            </button>

            <p className="text-text-muted text-xs text-center">
              Wyślemy Ci magic link na email. Bez hasła.
            </p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">📨</div>
            <h2 className="font-heading text-2xl font-bold text-text-primary">Sprawdź skrzynkę</h2>
            <p className="text-text-secondary">
              Link logowania wysłany na{' '}
              <span className="text-accent font-medium">{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-text-secondary text-sm underline"
            >
              Zmień email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
