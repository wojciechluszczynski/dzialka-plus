'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function InvitePartnerPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [deeplink, setDeeplink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClientComponentClient()

  async function generateInvite() {
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('generate_invite', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    setInviteLink(data.invite_url)
    setDeeplink(data.deeplink)
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-c0 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">Zaproś partnera</h1>
          <p className="text-text-secondary mt-2">
            Wygeneruj link zaproszenia do workspace. Ważny przez 7 dni.
          </p>
        </div>

        {!inviteLink ? (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              {[
                ['✏️', 'Partner dołącza jako Editor'],
                ['🏡', 'Widzi wszystkie działki w workspace'],
                ['⭐', 'Może oceniać i dodawać notatki'],
                ['🔒', 'Nie może zmieniać ustawień workspace'],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-3">
                  <span>{icon}</span>
                  <span className="text-text-secondary text-sm">{label}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button
              onClick={generateInvite}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-heading font-semibold rounded-xl py-3 transition-colors"
            >
              {loading ? 'Generuję link...' : 'Wygeneruj link zaproszenia'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-text-muted text-xs uppercase tracking-wide">Link do zaproszenia (web)</p>
              <div className="flex items-center gap-2">
                <p className="text-text-primary text-sm font-mono flex-1 break-all">{inviteLink}</p>
                <button
                  onClick={copyLink}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors"
                >
                  {copied ? '✓ Skopiowano' : 'Kopiuj'}
                </button>
              </div>
            </div>

            {deeplink && (
              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-text-muted text-xs uppercase tracking-wide">Deeplink (aplikacja mobilna)</p>
                <p className="text-text-secondary text-sm font-mono break-all">{deeplink}</p>
              </div>
            )}

            <div className="bg-success/10 border border-success/30 rounded-xl p-4">
              <p className="text-success text-sm">
                ✅ Link wygenerowany. Wyślij go partnerowi przez WhatsApp, SMS lub email.
              </p>
            </div>

            <button
              onClick={() => { setInviteLink(null); setDeeplink(null) }}
              className="w-full border border-white/10 text-text-secondary font-medium rounded-xl py-3 hover:bg-white/5 transition-colors text-sm"
            >
              Wygeneruj nowy link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
