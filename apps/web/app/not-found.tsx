import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          404 — Nie znaleziono
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Ta strona nie istnieje lub została przeniesiona.
        </p>
        <Link
          href="/app"
          className="text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity hover:opacity-90 inline-block"
          style={{ background: '#F97316' }}
        >
          Wróć do aplikacji
        </Link>
      </div>
    </div>
  )
}
