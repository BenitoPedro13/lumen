"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

interface Badge {
  id: string;
  label: string;
}

interface Space {
  id: number;
  name: string;
  kind: string;
  inviteCode: string | null;
  members: Array<{ userId: number; userName: string }>;
  sharedStreak: number;
  combinedPoints: number;
  badges: Badge[];
}

interface Reaction {
  emoji: string;
  userId: number;
}

interface Entry {
  id: number;
  summary: string;
  category: string;
  kind: string;
  occurredAt: string;
  data: { done?: boolean; reactions?: Reaction[] };
}

interface Leaderboard {
  userId: number;
  userName: string;
  points: number;
}

const REACTION_OPTIONS = ["🎉", "👍"] as const;

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = Number(params.id);

  const [space, setSpace] = useState<Space | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const loadData = async () => {
    const [spaceRes, entriesRes, meRes] = await Promise.all([
      apiGet<Space>(`/spaces/${spaceId}`),
      apiGet<{ entries: Entry[]; leaderboard: Leaderboard[] }>(`/spaces/${spaceId}/entries`),
      apiGet<{ id: number }>("/me"),
    ]);

    if (spaceRes.ok && spaceRes.data) {
      setSpace(spaceRes.data);
    }
    if (entriesRes.ok && entriesRes.data) {
      setEntries(entriesRes.data.entries);
      setLeaderboard(entriesRes.data.leaderboard);
    }
    if (meRes.ok && meRes.data) {
      setMeId(meRes.data.id);
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

  const handleReact = async (entryId: number, emoji: string) => {
    const res = await apiPost<{ reactions: Reaction[] }>(`/spaces/${spaceId}/entries/${entryId}/react`, { emoji });
    if (res.ok && res.data) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, data: { ...e.data, reactions: res.data!.reactions } } : e)),
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !space) return <div>Loading...</div>;

  const joinUrl = space.inviteCode ? `${window.location.origin}/dashboard/spaces/join/${space.inviteCode}` : "";
  const isSharedTaskSpace = space.kind === "tasks" && space.members.length > 1;

  return (
    <div>
      <h1>{space.name}</h1>
      <p className="text-small" style={{ marginBottom: "1rem" }}>
        {space.kind} space • {space.members.length} member{space.members.length !== 1 ? "s" : ""}
      </p>

      {isSharedTaskSpace && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>🔥 Shared Streak</h3>
          <p style={{ fontSize: "2rem", margin: "0.5rem 0" }}>
            {space.sharedStreak} day{space.sharedStreak === 1 ? "" : "s"}
          </p>
          <p className="text-small" style={{ marginBottom: space.badges.length > 0 ? "1rem" : 0 }}>
            Keeps going as long as <strong>everyone</strong> in this space logs or completes something each day —
            like a Duolingo streak, one missed person breaks it for the whole space.
          </p>
          {space.badges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {space.badges.map((badge) => (
                <span
                  key={badge.id}
                  className="text-small"
                  style={{ background: "#f5f5f5", padding: "0.25rem 0.6rem", borderRadius: "1rem" }}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid">
        {space.inviteCode && (
          <div className="card">
            <h3>Share This Space</h3>
            <p className="text-small" style={{ marginBottom: "1rem" }}>
              Share this link with someone who <strong>already has a Lumen account</strong> to add them to this
              space. For someone brand new, use{" "}
              <a href="/dashboard/invites" style={{ color: "#0066cc", textDecoration: "underline" }}>
                Invite
              </a>{" "}
              instead — that creates them an account first.
            </p>
            <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "0.375rem", marginBottom: "1rem" }}>
              <code style={{ wordBreak: "break-all" }}>{joinUrl}</code>
              <button
                onClick={() => copyToClipboard(joinUrl)}
                style={{ marginLeft: "0.5rem", fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <button onClick={handleRotateCode} style={{ background: "#f44336", fontSize: "0.875rem" }}>
              Rotate Code
            </button>
            <span className="text-small" style={{ display: "block", marginTop: "0.5rem" }}>
              Rotating invalidates the link above — anyone who hasn't joined yet will need the new one.
            </span>
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
                {i === 0 && "👑 "}
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
            {entries.slice(0, 10).map((entry) => {
              const isCompletedTask = entry.kind === "task" && entry.data?.done;
              const reactions = entry.data?.reactions ?? [];
              return (
                <li key={entry.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                  <strong>{entry.summary}</strong>
                  <div className="text-small">
                    {entry.category} • {new Date(entry.occurredAt).toLocaleDateString()}
                  </div>
                  {isCompletedTask && (
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                      {REACTION_OPTIONS.map((emoji) => {
                        const count = reactions.filter((r) => r.emoji === emoji).length;
                        const mine = meId !== null && reactions.some((r) => r.emoji === emoji && r.userId === meId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(entry.id, emoji)}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.15rem 0.5rem",
                              background: mine ? "#e3f2fd" : "#f5f5f5",
                              border: mine ? "1px solid #0066cc" : "1px solid #ddd",
                            }}
                          >
                            {emoji} {count > 0 ? count : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
