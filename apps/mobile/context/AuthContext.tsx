import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Workspace, WorkspaceMember, MemberRole } from '@de/db'

interface WorkspaceContext {
  workspace: Workspace | null
  role: MemberRole | null
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  workspaceCtx: WorkspaceContext
  loading: boolean
  signOut: () => Promise<void>
  refreshWorkspace: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [workspaceCtx, setWorkspaceCtx] = useState<WorkspaceContext>({ workspace: null, role: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadWorkspace(session.user.id)
      setLoading(false)
    })

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadWorkspace(session.user.id)
      } else {
        setWorkspaceCtx({ workspace: null, role: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadWorkspace(userId: string) {
    const { data } = await supabase
      .from('workspace_members')
      .select('role, workspaces(*)')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (data) {
      setWorkspaceCtx({
        workspace: (data as unknown as { workspaces: Workspace; role: MemberRole }).workspaces,
        role: (data as unknown as { role: MemberRole }).role,
      })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setWorkspaceCtx({ workspace: null, role: null })
  }

  async function refreshWorkspace() {
    if (user) await loadWorkspace(user.id)
  }

  return (
    <AuthContext.Provider value={{ session, user, workspaceCtx, loading, signOut, refreshWorkspace }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useWorkspace() {
  const { workspaceCtx } = useAuth()
  return workspaceCtx
}
