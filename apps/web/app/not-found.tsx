import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-c0 flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
          404 — Nie znaleziono
        </h2>
        <p className="text-text-muted text-sm mb-6">
          Ta strona nie istnieje lub została przeniesiona.
        </p>
        <Link
          href="/app"
          className="bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors inline-block"
        >
          Wróć do aplikacji
        </Link>
      </div>
    </div>
  )
}
