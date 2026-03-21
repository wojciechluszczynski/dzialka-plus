import { createClient as _createClient } from '@supabase/supabase-js'

export function createClient(supabaseUrl: string, supabaseKey: string) {
  return _createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}
