export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen p-6 animate-pulse" style={{ background: '#F8F9FA' }}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-5">
        <div className="mr-auto">
          <div className="h-7 w-28 bg-gray-200 rounded-lg mb-2" />
          <div className="h-3.5 w-20 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-48 bg-gray-200 rounded-lg" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
        <div className="h-9 w-16 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 rounded-lg" style={{ background: '#F97316', opacity: 0.3 }} />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="h-4 w-4 bg-gray-200 rounded" />
          {[180, 140, 100, 80, 80, 90, 70, 80].map((w, i) => (
            <div key={i} className="h-3.5 bg-gray-200 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 items-center px-4 py-3 border-b border-gray-50"
            style={{ opacity: 1 - i * 0.07 }}
          >
            <div className="h-4 w-4 bg-gray-100 rounded" />
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-14 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="mt-3 flex gap-6 px-1">
        <div className="h-3 w-40 bg-gray-100 rounded" />
        <div className="h-3 w-36 bg-gray-100 rounded" />
        <div className="h-3 w-28 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
