"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

interface User {
  id: number;
  name: string;
  ntfyTopic: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const res = await apiGet<User>("/me");
    if (res.ok && res.data) {
      setUser(res.data);
      setName(res.data.name);
      setNtfyTopic(res.data.ntfyTopic || "");
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    const res = await apiPatch<User>("/me", {
      name,
      ntfyTopic: ntfyTopic || undefined,
    });

    if (res.ok) {
      setMessage("Settings saved!");
      await loadUser();
    } else {
      setMessage(`Error: ${res.error}`);
    }

    setSaving(false);
  };

  if (loading || !user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Account Settings</h1>

      <div className="card" style={{ maxWidth: "500px" }}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>

          <div className="form-group">
            <label htmlFor="ntfyTopic">Ntfy Topic (for push notifications)</label>
            <input
              id="ntfyTopic"
              type="text"
              value={ntfyTopic}
              onChange={(e) => setNtfyTopic(e.target.value)}
              placeholder="your-ntfy-topic"
              disabled={saving}
            />
            <span className="text-small" style={{ display: "block", marginTop: "0.25rem" }}>
              Used to deliver your weekly recap and daily notes as a push notification. Pick any topic name and
              subscribe to it in the free{" "}
              <a
                href="https://ntfy.sh"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0066cc", textDecoration: "underline" }}
              >
                ntfy app
              </a>
              . Leave empty to disable.
            </span>
          </div>

          {message && (message.startsWith("Error") ? <div className="error">{message}</div> : <div className="success">{message}</div>)}

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
