"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/analyse",
    title: "Submit video for analysis",
    desc: "Upload a video URL and receive an AI coaching report. Analysis takes 30–120 seconds.",
    request: `{
  "video_url": "https://your-cdn.com/session.mp4",  // required
  "sport": "boxing",                                  // optional, default: boxing
  "level": "intermediate",                            // optional, default: intermediate
  "webhook_url": "https://yourapp.com/webhook"        // optional
}`,
    response: `{
  "session_id": "a1b2c3d4-...",
  "status": "processing",
  "poll_url": "https://fightflo.app/api/v1/status/a1b2c3d4-...",
  "report_url": "https://fightflo.app/api/v1/report/a1b2c3d4-..."
}`,
    curl: `curl -X POST https://fightflo.app/api/v1/analyse \\
  -H "Authorization: Bearer ff_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_url": "https://your-cdn.com/session.mp4",
    "sport": "boxing",
    "level": "intermediate"
  }'`,
  },
  {
    method: "GET",
    path: "/api/v1/status/:session_id",
    title: "Poll session status",
    desc: "Check whether analysis is complete. Poll every 10s until status is complete or failed.",
    request: null,
    response: `{
  "session_id": "a1b2c3d4-...",
  "status": "complete",         // uploading | analysing | complete | failed
  "sport": "boxing",
  "level": "intermediate",
  "created_at": "2025-01-01T12:00:00Z",
  "report_url": "https://fightflo.app/api/v1/report/a1b2c3d4-..."
}`,
    curl: `curl https://fightflo.app/api/v1/status/SESSION_ID \\
  -H "Authorization: Bearer ff_YOUR_KEY"`,
  },
  {
    method: "GET",
    path: "/api/v1/report/:session_id",
    title: "Retrieve full report",
    desc: "Returns the complete AI coaching report. Only available when status is complete.",
    request: null,
    response: `{
  "session_id": "a1b2c3d4-...",
  "sport": "boxing",
  "level": "intermediate",
  "analysed_at": "2025-01-01T12:01:30Z",
  "coach_summary": "Your jab timing is solid but your guard drops after combinations...",
  "main_weakness": "Guard drops post-combination",
  "positives": ["Strong jab", "Good footwork", "Consistent rhythm"],
  "drills": [
    { "name": "Guard drill", "description": "After each combo, return hand to cheek..." }
  ],
  "timestamps": [
    { "time": 4.2, "label": "Jab", "quality": "good" }
  ],
  "pose_quality": 0.87
}`,
    curl: `curl https://fightflo.app/api/v1/report/SESSION_ID \\
  -H "Authorization: Bearer ff_YOUR_KEY"`,
  },
];

const SPORTS = ["boxing", "muaythai", "mma", "golf", "tennis", "cricket", "football", "weightlifting"];
const LEVELS = ["beginner", "intermediate", "advanced", "pro"];

export default function DocsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <main className="docs-page">
      <div className="docs-header">
        <button className="dev-back" onClick={() => router.back()}>← Back</button>
        <div>
          <h1 className="dev-title">API Documentation</h1>
          <p className="dev-subtitle">REST API · Base URL: https://fightflo.app</p>
        </div>
        <Link href="/developer" className="dev-docs-link">Manage Keys →</Link>
      </div>

      {/* Auth */}
      <section className="docs-section">
        <h2 className="docs-section-title">Authentication</h2>
        <p className="docs-text">
          All API requests must include your API key as a Bearer token in the Authorization header.
          Create API keys on the{" "}
          <Link href="/developer" className="docs-link">Developer dashboard</Link>.
        </p>
        <div className="docs-code-wrap">
          <pre className="docs-code">{`Authorization: Bearer ff_YOUR_API_KEY`}</pre>
          <button className="docs-copy" onClick={() => copy("Authorization: Bearer ff_YOUR_API_KEY", "auth")}>
            {copied === "auth" ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {/* Endpoints */}
      <section className="docs-section">
        <h2 className="docs-section-title">Endpoints</h2>
        <div className="docs-endpoints">
          {ENDPOINTS.map((ep) => (
            <div className="docs-endpoint" key={ep.path}>
              <div className="docs-ep-header">
                <span className={`docs-method docs-method--${ep.method.toLowerCase()}`}>{ep.method}</span>
                <code className="docs-path">{ep.path}</code>
              </div>
              <h3 className="docs-ep-title">{ep.title}</h3>
              <p className="docs-text">{ep.desc}</p>

              {ep.request && (
                <>
                  <p className="docs-label">Request body</p>
                  <div className="docs-code-wrap">
                    <pre className="docs-code">{ep.request}</pre>
                    <button className="docs-copy" onClick={() => copy(ep.request!, ep.path + "-req")}>
                      {copied === ep.path + "-req" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </>
              )}

              <p className="docs-label">Response</p>
              <div className="docs-code-wrap">
                <pre className="docs-code">{ep.response}</pre>
                <button className="docs-copy" onClick={() => copy(ep.response, ep.path + "-res")}>
                  {copied === ep.path + "-res" ? "Copied!" : "Copy"}
                </button>
              </div>

              <p className="docs-label">cURL example</p>
              <div className="docs-code-wrap">
                <pre className="docs-code">{ep.curl}</pre>
                <button className="docs-copy" onClick={() => copy(ep.curl, ep.path + "-curl")}>
                  {copied === ep.path + "-curl" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Webhook */}
      <section className="docs-section">
        <h2 className="docs-section-title">Webhooks</h2>
        <p className="docs-text">
          Pass a <code className="docs-inline-code">webhook_url</code> when submitting a video.
          When analysis completes (or fails), we POST a JSON body to your URL:
        </p>
        <div className="docs-code-wrap">
          <pre className="docs-code">{`{
  "session_id": "a1b2c3d4-...",
  "status": "complete"  // or "failed"
}`}</pre>
        </div>
        <p className="docs-text">
          Your webhook endpoint must respond with a 2xx status within 10 seconds.
          We retry once on failure.
        </p>
      </section>

      {/* Reference */}
      <section className="docs-section">
        <h2 className="docs-section-title">Reference</h2>
        <div className="docs-ref-grid">
          <div>
            <p className="docs-label">Supported sports</p>
            <div className="docs-tags">
              {SPORTS.map((s) => <span className="docs-tag" key={s}>{s}</span>)}
            </div>
          </div>
          <div>
            <p className="docs-label">Skill levels</p>
            <div className="docs-tags">
              {LEVELS.map((l) => <span className="docs-tag" key={l}>{l}</span>)}
            </div>
          </div>
        </div>
        <p className="docs-label" style={{ marginTop: "1.2rem" }}>HTTP status codes</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <tbody>
              <tr><td>202</td><td>Analysis queued</td></tr>
              <tr><td>400</td><td>Invalid request body</td></tr>
              <tr><td>401</td><td>Missing or invalid API key</td></tr>
              <tr><td>402</td><td>Scan quota exceeded</td></tr>
              <tr><td>404</td><td>Session not found</td></tr>
              <tr><td>500</td><td>Server error</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Rate limits */}
      <section className="docs-section">
        <h2 className="docs-section-title">Rate limits &amp; pricing</h2>
        <p className="docs-text">
          Free tier: 3 lifetime analyses. Paid plans available — contact{" "}
          <a className="docs-link" href="mailto:hello@fightflo.app">hello@fightflo.app</a>{" "}
          for volume pricing, white-label options, or enterprise agreements.
        </p>
      </section>
    </main>
  );
}
