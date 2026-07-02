"use client";

import { useState } from "react";

const BOOKMARKLET = `javascript:(function(){window.open('https://fightflo.app/tasks/share-target?popup=1&title='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(location.href),'_blank');})();`;
const RECORD_URL = "https://fightflo.app/tasks?record=1";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="h-11 rounded-full bg-[var(--accent-red)] text-white text-sm font-medium hover:brightness-110"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function BookmarkletPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Quick shortcuts</h1>

      <div className="surface-card p-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
          Record a task instantly
        </p>
        <p className="text-sm text-[var(--foreground)]">
          A plain bookmark to this URL jumps straight into listening — no taps needed once it
          opens.
        </p>
        <p className="text-xs font-mono break-all text-[var(--foreground)] bg-[var(--surface-pill)] rounded-lg p-3 border border-[var(--border)]">
          {RECORD_URL}
        </p>
        <CopyButton text={RECORD_URL} />
        <ol className="text-sm text-[var(--foreground)] flex flex-col gap-2 list-decimal list-inside">
          <li>Copy the URL above.</li>
          <li>
            Try Chrome&apos;s ⋮ menu → &quot;Add to Home screen&quot; on this page, then edit the new
            icon&apos;s URL to the copied link — or bookmark it (⭐) and rename it &quot;Record
            Task&quot;.
          </li>
          <li>Tap that bookmark/icon any time to start recording immediately.</li>
        </ol>
      </div>

      <div className="surface-card p-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
          Add any page to Tasks
        </p>
        <p className="text-sm text-[var(--foreground)]">
          Save this as a bookmark, then tap it on any page to send that page straight to your task
          list — no app switching, no install needed.
        </p>
        <p className="text-xs font-mono break-all text-[var(--foreground)] bg-[var(--surface-pill)] rounded-lg p-3 border border-[var(--border)]">
          {BOOKMARKLET}
        </p>
        <CopyButton text={BOOKMARKLET} />
        <ol className="text-sm text-[var(--foreground)] flex flex-col gap-2 list-decimal list-inside">
          <li>Bookmark this page (tap the ⭐ in the address bar).</li>
          <li>Open Chrome&apos;s ⋮ menu → Bookmarks, find the bookmark you just made.</li>
          <li>Tap its ⋮ menu → Edit.</li>
          <li>Change the Name to something like &quot;+ Add to Tasks&quot;.</li>
          <li>Replace the URL field with the copied code above, then Save.</li>
        </ol>
      </div>

      <div className="surface-card p-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">To use either one</p>
        <p className="text-sm text-[var(--foreground)]">
          On any page, tap the address bar and start typing the bookmark&apos;s name — Chrome will
          suggest it. Tap the suggestion to run it immediately.
        </p>
      </div>
    </div>
  );
}
