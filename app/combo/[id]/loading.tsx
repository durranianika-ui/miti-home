export default function ComboLoading() {
  return (
    <div className="min-h-screen bg-background pb-24" aria-busy="true" aria-label="Loading the set">
      <div className="flex flex-col items-center px-6 pb-10 pt-12 md:pt-16">
        <div className="h-3 w-32 animate-pulse bg-muted" />
        <div className="mt-5 h-10 w-3/4 max-w-2xl animate-pulse bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
        <div className="aspect-square animate-pulse bg-muted" />
        <div className="aspect-square animate-pulse bg-muted/70" />
      </div>
      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-12 px-6 md:grid-cols-2">
        {[0, 1].map((column) => (
          <div key={column} className="space-y-4">
            <div className="h-7 w-3/4 animate-pulse bg-muted" />
            <div className="h-4 w-24 animate-pulse bg-muted" />
            <div className="flex gap-2">
              <div className="h-10 w-12 animate-pulse bg-muted" />
              <div className="h-10 w-12 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
