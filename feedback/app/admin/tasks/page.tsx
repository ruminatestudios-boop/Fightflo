"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Project = "fightflo" | "synclyst";

interface Task {
  id: string;
  text: string;
  bucket: "now" | "later";
  project: Project;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

const PROJECTS: { id: Project; label: string }[] = [
  { id: "fightflo", label: "Fightflo" },
  { id: "synclyst", label: "Synclyst" },
];

export default function TasksAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchItems = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      const json = (await res.json()) as { tasks: Task[] };
      setItems(json.tasks);
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
    if (authed && secret) void fetchItems(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const addTask = useCallback(
    async (project: Project, bucket: "now" | "later") => {
      const key = `${project}-${bucket}`;
      const text = drafts[key];
      if (!text?.trim()) return;
      try {
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ text, bucket, project }),
        });
        if (!res.ok) throw new Error("Failed to add");
        setDrafts((prev) => ({ ...prev, [key]: "" }));
        await fetchItems(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add");
      }
    },
    [drafts, secret, fetchItems]
  );

  const completeTask = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((t) => t.id !== id));
      try {
        const res = await fetch(`/api/admin/tasks?id=${id}`, {
          method: "DELETE",
          headers: { "x-admin-secret": secret },
        });
        if (!res.ok) throw new Error("Failed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove");
        await fetchItems(secret);
      }
    },
    [secret, fetchItems]
  );

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
              if (e.key === "Enter") void fetchItems(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchItems(secret)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "1080px" }}>
        <h1 style={titleStyle}>Task list</h1>
        {error ? <p style={errorStyle}>{error}</p> : null}

        {PROJECTS.map((proj) => {
          const projTasks = items.filter((t) => t.project === proj.id);
          return (
            <div key={proj.id} style={projectSectionStyle}>
              <h2 style={projectTitleStyle}>{proj.label}</h2>
              <div style={columnsStyle}>
                <TaskColumn
                  title="To do"
                  tasks={projTasks.filter((t) => t.bucket === "now")}
                  value={drafts[`${proj.id}-now`] ?? ""}
                  onChange={(v) => setDrafts((prev) => ({ ...prev, [`${proj.id}-now`]: v }))}
                  onAdd={() => void addTask(proj.id, "now")}
                  onComplete={completeTask}
                />
                <TaskColumn
                  title="To do later"
                  tasks={projTasks.filter((t) => t.bucket === "later")}
                  value={drafts[`${proj.id}-later`] ?? ""}
                  onChange={(v) => setDrafts((prev) => ({ ...prev, [`${proj.id}-later`]: v }))}
                  onAdd={() => void addTask(proj.id, "later")}
                  onComplete={completeTask}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  value,
  onChange,
  onAdd,
  onComplete,
}: {
  title: string;
  tasks: Task[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onComplete: (id: string) => void;
}) {
  return (
    <div style={columnStyle}>
      <h3 style={columnTitleStyle}>{title}</h3>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          placeholder="Add a task…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
        <button onClick={onAdd} style={addBtnStyle}>
          Add
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>Nothing here.</p>
        ) : (
          tasks.map((task) => (
            <label key={task.id} style={taskRowStyle}>
              <input
                type="checkbox"
                onChange={() => onComplete(task.id)}
                style={{ width: "1.05rem", height: "1.05rem", cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: "0.85rem" }}>{task.text}</span>
            </label>
          ))
        )}
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
  marginBottom: "1.5rem",
};

const projectSectionStyle: React.CSSProperties = {
  marginBottom: "1.75rem",
  padding: "1.25rem",
  borderRadius: "0.9rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.02)",
};

const projectTitleStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  marginBottom: "0.85rem",
  paddingBottom: "0.6rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  color: "#fa4141",
};

const columnsStyle: React.CSSProperties = {
  display: "flex",
  gap: "1.25rem",
  flexWrap: "wrap",
};

const columnStyle: React.CSSProperties = {
  flex: "1 1 280px",
  minWidth: "260px",
};

const columnTitleStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 600,
  marginBottom: "0.6rem",
  opacity: 0.85,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: "0.6rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem",
  borderRadius: "0.6rem",
  border: "none",
  background: "#fa4141",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
};

const addBtnStyle: React.CSSProperties = {
  padding: "0.65rem 0.9rem",
  borderRadius: "0.6rem",
  border: "none",
  background: "#fa4141",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.8rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const taskRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  padding: "0.55rem 0.7rem",
  borderRadius: "0.55rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.82rem",
  marginBottom: "0.5rem",
};
