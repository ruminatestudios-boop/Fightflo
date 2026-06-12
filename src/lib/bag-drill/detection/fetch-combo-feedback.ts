import type { CompletedCombo } from "./combo-sequencer";

export interface ComboFeedback {
  tip: string;
  hype: string;
}

export async function fetchComboFeedback(payload: {
  combo: CompletedCombo;
  confidence: number;
  guardDrops: string[];
  stance: string;
}): Promise<ComboFeedback | null> {
  try {
    const res = await fetch("/api/bag-drill/combo-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        combo: payload.combo.key,
        comboName: payload.combo.name,
        confidence: payload.confidence,
        avgVelocity: "Sharp",
        guardDrops: payload.guardDrops,
        stance: payload.stance,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ComboFeedback;
  } catch {
    return null;
  }
}
