export default function PublicFeedbackLoading() {
  return (
    <main className="min-h-svh bg-surface px-5 py-6 md:px-8 md:py-8 xl:px-12">
      <div className="mx-auto max-w-content animate-pulse">
        <div className="h-32 rounded-surface bg-surface-brand" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
          <div className="ui-card rounded-surface p-5 md:p-6">
            <div className="h-component-control rounded-placeholder bg-surface-hover" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div className="h-[84px] rounded-[12px] bg-surface-hover" key={item} />
              ))}
            </div>
          </div>
          <div className="ui-card h-[318px] rounded-surface bg-background" />
        </div>
      </div>
    </main>
  );
}
