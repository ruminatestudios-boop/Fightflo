export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center px-8">
      <p className="text-[var(--foreground)] text-base">No tasks yet</p>
      <p className="text-[var(--muted)] text-sm">Tap the record button to add one by voice.</p>
    </div>
  );
}
