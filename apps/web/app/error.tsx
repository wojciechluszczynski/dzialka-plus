'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-c0 flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
          Coś poszło nie tak
        </h2>
        <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
          {error.message || 'Nieoczekiwany błąd aplikacji.'}
          {error.digest && (
            <span className="block mt-1 text-xs opacity-50">ref: {error.digest}</span>
          )}
        </p>
        <button
          onClick={reset}
          className="bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  )
}
