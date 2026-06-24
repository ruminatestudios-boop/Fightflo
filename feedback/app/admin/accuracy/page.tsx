"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface ReportClip {
  clip_url: string;
  clip_type: string;
  timestamp: string;
  description: string;
}

interface MainWeakness {
  title: string;
  timestamp: string;
  what_is_happening?: string;
  root_cause?: string;
}

interface Positive {
  title: string;
  timestamp: string;
  why_it_matters?: string;
}

interface ReportRow {
  id: string;
  session_id: string;
  sport: string;
  created_at: string;
  main_weakness: MainWeakness;
  positives: Positive[];
  clips: ReportClip[];
  confirmed_events?: { weakness_type?: string }[];
}

interface Review {
  claim_id: string;
  verdict: "match" | "no_match" | "unsure";
  fail_reason: string | null;
}

const SECRET_KEY = "fightflo_admin_secret";

function frameUrl(clipUrl: string): string {
  return clipUrl.replace("/video/upload/", "/video/upload/so_1/").replace(/\.mp4($|\?)/, ".jpg$1");
}

type Claim = {
  claimId: string;
  reportId: string;
  sessionId: string;
  kind: "weakness" | "positive";
  weaknessType: string | null;
  title: string;
  detail: string;
  timestamp: string;
  sport: string;
  createdAt: string;
  clip: ReportClip | null;
};

function buildClaims(reports: ReportRow[]): Claim[] {
  const claims: Claim[] = [];
  for (const r of reports) {
    if (r.main_weakness?.title) {
      const clip = r.clips?.find((c) => c.clip_type === "weakness") ?? null;
      claims.push({
        claimId: `${r.id}:weakness`,
        reportId: r.id,
        sessionId: r.session_id,
        kind: "weakness",
        weaknessType: r.confirmed_events?.[0]?.weakness_type ?? null,
        title: r.main_weakness.title,
        detail: r.main_weakness.what_is_happening ?? r.main_weakness.root_cause ?? "",
        timestamp: r.main_weakness.timestamp,
        sport: r.sport,
        createdAt: r.created_at,
        clip,
      });
    }
    (r.positives ?? []).forEach((p, i) => {
      const clip = r.clips?.find((c) => c.clip_type === `positive_${i}`) ?? null;
      claims.push({
        claimId: `${r.id}:positive:${i}`,
        reportId: r.id,
        sessionId: r.session_id,
        kind: "positive",
        weaknessType: null,
        title: p.title,
        detail: p.why_it_matters ?? "",
        timestamp: p.timestamp,
        sport: r.sport,
        createdAt: r.created_at,
        clip,
      });
    });
  }
  return claims;
}

export default function AccuracyAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchData = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/accuracy", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      const json = (await res.json()) as { reports: ReportRow[]; reviews: Review[] };
      setReports(json.reports);
      const map: Record<string, Review> = {};
      json.reviews.forEach((r) => {
        map[r.claim_id] = r;
      });
      setReviews(map);
      setAuthed(true);
      sessionStorage.setItem(SECRET_KEY, secretValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && secret) void fetchData(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const claims = useMemo(() => buildClaims(reports), [reports]);

  const submitVerdict = useCallback(
    async (claim: Claim, verdict: Review["verdict"]) => {
      const failReason = verdict === "no_match" ? reasonDrafts[claim.claimId] ?? "" : null;
      setReviews((prev) => ({
        ...prev,
        [claim.claimId]: { claim_id: claim.claimId, verdict, fail_reason: failReason },
      }));
      try {
        await fetch("/api/admin/accuracy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({
            claimId: claim.claimId,
            reportId: claim.reportId,
            sessionId: claim.sessionId,
            claimKind: claim.kind,
            weaknessType: claim.weaknessType,
            verdict,
            failReason,
          }),
        });
      } catch {
        setError("Failed to save verdict — try again");
      }
    },
    [secret, reasonDrafts]
  );

  const stats = useMemo(() => {
    const reviewed = claims.filter((c) => reviews[c.claimId]);
    const match = reviewed.filter((c) => reviews[c.claimId].verdict === "match").length;
    const noMatch = reviewed.filter((c) => reviews[c.claimId].verdict === "no_match").length;
    const decided = match + noMatch;
    const hitRate = decided > 0 ? Math.round((match / decided) * 100) : null;

    const byType: Record<string, { match: number; noMatch: number }> = {};
    for (const c of reviewed) {
      const key = c.weaknessType ?? (c.kind === "positive" ? "positive_claims" : "unclassified");
      byType[key] = byType[key] ?? { match: 0, noMatch: 0 };
      const v = reviews[c.claimId].verdict;
      if (v === "match") byType[key].match++;
      if (v === "no_match") byType[key].noMatch++;
    }

    return { reviewedCount: reviewed.length, totalCount: claims.length, hitRate, byType };
  }, [claims, reviews]);

  if (!authed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Admin access</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchData(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchData(secret)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "720px" }}>
        <h1 style={titleStyle}>Accuracy tracker</h1>
        <p style={subStyle}>
          Look at each frame, judge if the claim matches what's actually happening, mark it.
        </p>
        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={statsBoxStyle}>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
            {stats.hitRate !== null ? `${stats.hitRate}%` : "—"}{" "}
            <span style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 400 }}>
              hit rate ({stats.reviewedCount}/{stats.totalCount} reviewed)
            </span>
          </p>
          {Object.keys(stats.byType).length > 0 ? (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {Object.entries(stats.byType).map(([type, v]) => {
                const total = v.match + v.noMatch;
                const pct = total > 0 ? Math.round((v.match / total) * 100) : 0;
                return (
                  <p key={type} style={{ fontSize: "0.78rem", opacity: 0.75, margin: 0 }}>
                    {type}: {pct}% ({v.match}/{total})
                  </p>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.25rem" }}>
          {claims.map((claim) => {
            const review = reviews[claim.claimId];
            return (
              <div key={claim.claimId} style={claimRowStyle}>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {claim.clip ? (
                    <img
                      src={frameUrl(claim.clip.clip_url)}
                      alt={claim.title}
                      style={{ width: "90px", height: "120px", objectFit: "cover", borderRadius: "0.5rem", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: "90px", height: "120px", borderRadius: "0.5rem", background: "#000", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", opacity: 0.4 }}>
                      no clip
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.5 }}>
                      {claim.kind === "weakness" ? "WEAKNESS" : "POSITIVE"} · {claim.sport} · {claim.timestamp}
                    </p>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.88rem", fontWeight: 600 }}>{claim.title}</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.7, lineHeight: 1.4 }}>{claim.detail}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => void submitVerdict(claim, "match")}
                    style={review?.verdict === "match" ? verdictBtnActiveStyle("match") : verdictBtnStyle}
                  >
                    Match
                  </button>
                  <button
                    onClick={() => void submitVerdict(claim, "no_match")}
                    style={review?.verdict === "no_match" ? verdictBtnActiveStyle("no_match") : verdictBtnStyle}
                  >
                    No match
                  </button>
                  <button
                    onClick={() => void submitVerdict(claim, "unsure")}
                    style={review?.verdict === "unsure" ? verdictBtnActiveStyle("unsure") : verdictBtnStyle}
                  >
                    Unsure
                  </button>
                </div>

                {review?.verdict === "no_match" || reasonDrafts[claim.claimId] !== undefined ? (
                  <input
                    type="text"
                    placeholder="Why? (e.g. clinch false positive, timing offset, noise)"
                    defaultValue={review?.fail_reason ?? ""}
                    onChange={(e) =>
                      setReasonDrafts((prev) => ({ ...prev, [claim.claimId]: e.target.value }))
                    }
                    onBlur={() => {
                      if (review?.verdict === "no_match") void submitVerdict(claim, "no_match");
                    }}
                    style={{ ...inputStyle, marginTop: "0.5rem", marginBottom: 0, fontSize: "0.78rem" }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "2rem 1rem",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  marginBottom: "0.5rem",
};

const subStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  opacity: 0.6,
  marginBottom: "1rem",
};

const statsBoxStyle: React.CSSProperties = {
  padding: "0.9rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: "0.6rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  marginBottom: "0.6rem",
  fontSize: "0.9rem",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.65rem",
  border: "none",
  background: "#fa4141",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const claimRowStyle: React.CSSProperties = {
  padding: "0.9rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
};

const verdictBtnStyle: React.CSSProperties = {
  padding: "0.4rem 0.8rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "0.75rem",
  cursor: "pointer",
};

function verdictBtnActiveStyle(verdict: Review["verdict"]): React.CSSProperties {
  const color = verdict === "match" ? "#3ecf6e" : verdict === "no_match" ? "#fa4141" : "#e6b34e";
  return {
    ...verdictBtnStyle,
    background: color,
    borderColor: color,
    color: "#000",
    fontWeight: 600,
  };
}

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.85rem",
  marginBottom: "0.5rem",
};
