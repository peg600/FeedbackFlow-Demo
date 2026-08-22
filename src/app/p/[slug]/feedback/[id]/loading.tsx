export default function FeedbackDetailLoading() {
  return (
    <main className="min-h-svh bg-surface px-5 py-6 md:px-8 md:py-8 xl:px-12">
      <div className="mx-auto max-w-content animate-pulse">
        <div className="h-4 w-52 rounded bg-surface-hover" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23.5rem]">
          <div className="ui-card rounded-surface p-5 md:p-8">
            <div className="h-6 w-20 rounded-token bg-surface-hover" />
            <div className="mt-4 h-9 max-w-xl rounded bg-surface-hover" />
            <div className="mt-4 h-6 max-w-2xl rounded bg-surface-hover" />
            <div className="my-7 border-t border-border" />
            <div className="h-20 w-28 rounded-token bg-surface-hover" />
            <div className="my-7 border-t border-border" />
            <div className="h-5 w-20 rounded bg-surface-hover" />
            <div className="mt-3 h-20 rounded bg-surface-hover" />
          </div>
          <div className="space-y-6">
            <div className="ui-card h-56 rounded-surface bg-background" />
            <div className="h-44 rounded-surface bg-surface-brand" />
          </div>
        </div>
      </div>
    </main>
  );
}
