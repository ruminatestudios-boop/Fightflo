export function TranscriptPreview({ transcript }: { transcript: string }) {
  if (!transcript) {
    return <p className="text-[var(--muted)] text-sm text-center px-8">Listening…</p>;
  }
  return <p className="text-[var(--foreground)] text-base text-center px-8">{transcript}</p>;
}
