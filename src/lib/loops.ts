export interface LoopsContactResult {
  ok: boolean;
  skipped?: boolean;
  duplicate?: boolean;
}

export async function createLoopsContact(
  email: string,
  capturedFrom: string
): Promise<LoopsContactResult> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        source: `timer_${capturedFrom}`,
        userGroup: "fighter",
        subscribed: true,
        mailingLists: {},
      }),
    });

    if (res.ok) return { ok: true };

    const body = await res.text();
    if (res.status === 409 || /already exists|duplicate/i.test(body)) {
      return { ok: true, duplicate: true };
    }

    console.error("[loops] contact create failed:", res.status, body);
    return { ok: false };
  } catch (err) {
    console.error("[loops] contact create error:", err);
    return { ok: false };
  }
}
