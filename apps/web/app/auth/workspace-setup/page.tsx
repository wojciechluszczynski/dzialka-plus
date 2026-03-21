'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function WorkspaceSetupPage() {
  const [name, setName] = useState('Działki 2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // 1. Create workspace
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single()

    if (wsErr) { setError(wsErr.message); setLoading(false); return }

    // 2. Add owner membership
    const { error: memErr } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' })

    if (memErr) { setError(memErr.message); setLoading(false); return }

    // 3. Create default scoring profile
    await supabase.from('scoring_profiles').insert({ workspace_id: ws.id })

    router.push(`/app/workspace/${ws.id}/plots`)
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
            Utwórz workspace
          </h1>
          <p className="text-text-secondary text-sm mt-2 leading-relaxed">
            Workspace to współdzielona przestrzeń<br />do zarządzania działkami.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
              Nazwa workspace
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wojtek i Sabina — Działki 2026"
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-heading font-semibold rounded-lg py-3 transition-colors mt-2"
          >
            {loading ? 'Tworzę...' : 'Utwórz workspace →'}
          </button>
        </form>
      </div>
    </div>
  )
}
