/**
 * Lightweight plots cache backed by expo-secure-store.
 * Stores up to ~1.8 KB of serialised plot data per workspace (SecureStore limit).
 * For larger datasets the write is silently skipped — stale cache is served instead.
 */
import * as SecureStore from 'expo-secure-store'

const KEY_PREFIX = 'plots_cache_'
const STATS_PREFIX = 'stats_cache_'

function key(wsId: string) {
  // SecureStore keys must be alphanumeric + dots/dashes/underscores
  return KEY_PREFIX + wsId.replace(/-/g, '_')
}

function statsKey(wsId: string) {
  return STATS_PREFIX + wsId.replace(/-/g, '_')
}

export async function cachePlots<T>(wsId: string, plots: T[]): Promise<void> {
  try {
    const payload = JSON.stringify(plots)
    if (payload.length > 1800) return // SecureStore has ~2 KB limit
    await SecureStore.setItemAsync(key(wsId), payload)
  } catch {
    // ignore – cache is best-effort
  }
}

export async function getCachedPlots<T>(wsId: string): Promise<T[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(key(wsId))
    if (!raw) return null
    return JSON.parse(raw) as T[]
  } catch {
    return null
  }
}

export async function cacheStats(
  wsId: string,
  stats: { total: number; shortlist: number; inbox: number }
): Promise<void> {
  try {
    await SecureStore.setItemAsync(statsKey(wsId), JSON.stringify(stats))
  } catch {
    // ignore
  }
}

export async function getCachedStats(
  wsId: string
): Promise<{ total: number; shortlist: number; inbox: number } | null> {
  try {
    const raw = await SecureStore.getItemAsync(statsKey(wsId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Returns true when a network call throws a typical connectivity error. */
export function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const msg = (err as { message?: string }).message ?? ''
  return (
    msg.includes('Network request failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connection')
  )
}
