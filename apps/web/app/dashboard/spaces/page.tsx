"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface Space {
  id: number;
  name: string;
  kind: string;
  isDefault: boolean;
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"journal" | "tasks">("journal");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    const res = await apiGet<{ spaces: Space[] }>("/spaces");
    if (res.ok && res.data) {
      setSpaces(res.data.spaces);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    const res = await apiPost<Space>("/spaces", { name, kind });
    if (res.ok) {
      setName("");
      setKind("journal");
      await loadSpaces();
    } else {
      setError(res.error || "Failed to create space");
    }

    setCreating(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Spaces</h1>
      <p className="text-small" style={{ marginBottom: "1.5rem" }}>
        A space is where entries live. You already have a private one by default — create more here if you want a
        separate journal, or a shared task list with someone else.{" "}
        <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
          Learn more
        </a>
      </p>

      <div className="grid">
        <div className="card">
          <h3>Create New Space</h3>
          {error && <div className="error">{error}</div>}

          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="name">Space Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My space"
                required
                disabled={creating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="kind">Type</label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as "journal" | "tasks")}
                disabled={creating}
                style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #ddd" }}
              >
                <option value="journal">Journal (memory log)</option>
                <option value="tasks">Tasks (todo + points)</option>
              </select>
              <span className="text-small" style={{ display: "block", marginTop: "0.25rem" }}>
                Journal: a running log you can ask questions about later. Tasks: a shared to-do list with points
                and a leaderboard.
              </span>
            </div>

            <button type="submit" disabled={creating || !name}>
              {creating ? "Creating..." : "Create Space"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Your Spaces</h3>
          {spaces.length === 0 ? (
            <p className="text-small">No spaces yet.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {spaces.map((space) => (
                <li
                  key={space.id}
                  style={{
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    background: "#f5f5f5",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div>
                    <strong>{space.name}</strong>
                    <span className="text-small" style={{ display: "block" }}>
                      {space.kind} {space.isDefault && "• Your private space"}
                    </span>
                  </div>
                  <a href={`/dashboard/spaces/${space.id}`} style={{ color: "#0066cc", textDecoration: "underline" }}>
                    View →
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
