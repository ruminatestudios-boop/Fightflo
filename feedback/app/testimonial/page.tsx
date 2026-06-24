"use client";

import { useCallback, useState } from "react";

export default function TestimonialPage() {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError("Please add your name");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, rating }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong — try again");
      setStatus("error");
    }
  }, [name, body, rating]);

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Thank you 🙏</h1>
          <p style={subStyle}>Your feedback means a lot — appreciate you taking the time.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Got a sec?</h1>
        <p style={subStyle}>
          Tell us what you think of Fightflo in a sentence or two — it really helps.
        </p>

        <label style={labelStyle}>
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            style={inputStyle}
            required
            maxLength={80}
          />
        </label>

        <label style={labelStyle}>
          Your testimonial
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Fightflo caught a guard drop I didn't even know I had..."
            style={textareaStyle}
            maxLength={600}
            rows={4}
          />
        </label>

        <label style={labelStyle}>
          Rating
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                style={{
                  ...starBtnStyle,
                  color: n <= rating ? "#fa4141" : "rgba(255,255,255,0.25)",
                }}
                aria-label={`${n} star`}
              >
                ★
              </button>
            ))}
          </div>
        </label>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={status === "submitting"}
          style={primaryBtnStyle}
        >
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
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
  alignItems: "center",
  padding: "2rem 1.25rem",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "380px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 700,
  marginBottom: "0.4rem",
};

const subStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "rgba(255,255,255,0.6)",
  marginBottom: "1.5rem",
  lineHeight: 1.4,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "rgba(255,255,255,0.6)",
  marginBottom: "1rem",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.4rem",
  padding: "0.7rem 0.9rem",
  borderRadius: "0.65rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: "0.9rem",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  fontFamily: "inherit",
};

const starBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "1.6rem",
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem",
  borderRadius: "0.65rem",
  border: "none",
  background: "#fa4141",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
  marginTop: "0.5rem",
};

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.85rem",
  marginBottom: "0.75rem",
};
