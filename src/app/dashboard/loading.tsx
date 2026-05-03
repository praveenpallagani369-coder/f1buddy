export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
        <div className="h-8 w-28 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Phase banner */}
      <div className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-7 w-7 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Deadlines skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-14 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-5 w-10 bg-gray-100 dark:bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>

        {/* Right column skeleton */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-2.5">
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3.5 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
      </div>

      {/* Tools row */}
      <div className="space-y-3">
        <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
