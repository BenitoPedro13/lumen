"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

interface Space {
  id: number;
  name: string;
  kind: string;
  inviteCode: string | null;
  members: Array<{ userId: number; userName: string }>;
}

interface Entry {
  id: number;
  summary: string;
  category: string;
  kind: string;
  occurredAt: string;
}

interface Leaderboard {
  userId: number;
  userName: string;
  points: number;
}

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = Number(params.id);

  const [space, setSpace] = useState<Space | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const loadData = async () => {
    const [spaceRes, entriesRes] = await Promise.all([
      apiGet<Space>(`/spaces/${spaceId}`),
      apiGet<{ entries: Entry[]; leaderboard: Leaderboard[] }>(`/spaces/${spaceId}/entries`),
    ]);

    if (spaceRes.ok && spaceRes.data) {
      setSpace(spaceRes.data);
    }
    if (entriesRes.ok && entriesRes.data) {
      setEntries(entriesRes.data.entries);
      setLeaderboard(entriesRes.data.leaderboard);
    }
    setLoading(false);
  };

  const handleRotateCode = async () => {
    if (!space) return;
    const res = await apiPost(`/spaces/${spaceId}/rotate-invite`, {});
    if (res.ok) {
      await loadData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !space) return <div>Loading...</div>;

  const joinUrl = space.inviteCode ? `${window.location.origin}/dashboard/spaces/join/${space.inviteCode}` : "";

  return (
    <div>
      <h1>{space.name}</h1>
      <p className="text-small" style={{ marginBottom: "1rem" }}>
        {space.kind} space • {space.members.length} member{space.members.length !== 1 ? "s" : ""}
      </p>

      <div className="grid">
        {space.inviteCode && (
          <div className="card">
            <h3>Share This Space</h3>
            <p className="text-small" style={{ marginBottom: "1rem" }}>
              Share the invite code with others to let them join this space
            </p>
            <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "0.375rem", marginBottom: "1rem" }}>
              <code style={{ wordBreak: "break-all" }}>{space.inviteCode}</code>
              <button
                onClick={() => copyToClipboard(space.inviteCode!)}
                style={{ marginLeft: "0.5rem", fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button onClick={handleRotateCode} style={{ background: "#f44336", fontSize: "0.875rem" }}>
              Rotate Code
            </button>
          </div>
        )}

        <div className="card">
          <h3>Members</h3>
          <ul style={{ listStyle: "none" }}>
            {space.members.map((member) => (
              <li key={member.userId} className="text-small" style={{ marginBottom: "0.5rem" }}>
                {member.userName}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <h3>Leaderboard</h3>
          <ol style={{ paddingLeft: "1rem" }}>
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} style={{ marginBottom: "0.5rem" }}>
                <strong>{entry.userName}</strong> — {entry.points} points
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>Recent Entries</h3>
        {entries.length === 0 ? (
          <p className="text-small">No entries yet</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {entries.slice(0, 10).map((entry) => (
              <li key={entry.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                <strong>{entry.summary}</strong>
                <div className="text-small">
                  {entry.category} • {new Date(entry.occurredAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
