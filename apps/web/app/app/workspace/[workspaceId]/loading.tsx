export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-c0 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto">
          <div className="h-8 w-36 bg-white/8 rounded-lg mb-2" />
          <div className="h-3.5 w-24 bg-white/5 rounded" />
        </div>
        <div className="h-9 w-48 bg-white/5 rounded-lg" />
        <div className="h-9 w-36 bg-white/5 rounded-lg" />
        <div className="h-9 w-36 bg-white/5 rounded-lg" />
        <div className="h-9 w-20 bg-white/5 rounded-lg" />
        <div className="h-9 w-32 bg-white/8 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="glass rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b border-white/8">
          <div className="h-4 w-4 bg-white/8 rounded" />
          {[180, 140, 100, 80, 80, 90, 70, 80].map((w, i) => (
            <div key={i} className={`h-3.5 bg-white/8 rounded`} style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 items-center px-4 py-3 border-b border-white/5"
            style={{ opacity: 1 - i * 0.07 }}
          >
            <div className="h-4 w-4 bg-white/5 rounded" />
            <div className="h-4 w-40 bg-white/5 rounded" />
            <div className="h-4 w-32 bg-white/5 rounded" />
            <div className="h-4 w-24 bg-white/5 rounded" />
            <div className="h-4 w-16 bg-white/5 rounded" />
            <div className="h-4 w-16 bg-white/5 rounded" />
            <div className="h-6 w-20 bg-white/5 rounded-full" />
            <div className="h-4 w-16 bg-white/5 rounded" />
            <div className="h-6 w-14 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="mt-3 flex gap-6 px-1">
        <div className="h-3 w-40 bg-white/5 rounded" />
        <div className="h-3 w-36 bg-white/5 rounded" />
        <div className="h-3 w-28 bg-white/5 rounded" />
      </div>
    </div>
  )
}
