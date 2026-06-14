"use client";

import { useState } from "react";
import {
  declinePushReminders,
  hasDeclinedPush,
  hasSubscribedPush,
  subscribeToPush,
} from "@/lib/push-client";

export function PushReminderBanner() {
  const [hidden, setHidden] = useState(
    hasSubscribedPush() || hasDeclinedPush()
  );
  const [loading, setLoading] = useState(false);

  if (hidden) return null;

  const handleYes = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    setHidden(true);
    if (!ok) declinePushReminders();
  };

  const handleNo = () => {
    declinePushReminders();
    setHidden(true);
  };

  return (
    <div className="nike-card mt-6 rounded-xl border border-white/10 p-4">
      <p className="text-sm text-white">
        Want a daily reminder to train? 👊
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleYes}
          className="rounded-xl bg-[#fa4141] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
        >
          {loading ? "Setting up…" : "Yes, remind me"}
        </button>
        <button
          type="button"
          onClick={handleNo}
          className="rounded-xl border border-white/15 px-5 py-2.5 text-xs uppercase tracking-[0.1em] text-white/50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
