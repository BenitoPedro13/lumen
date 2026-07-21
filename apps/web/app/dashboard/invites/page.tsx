"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

interface Invite {
  code: string;
  expiresAt: string;
  signupUrl: string;
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateInvite = async () => {
    setLoading(true);
    const res = await apiPost<Invite>("/signup-invites", {});
    if (res.ok && res.data) {
      setInvites([res.data, ...invites]);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h1>Invite Someone</h1>

      <div className="card" style={{ maxWidth: "500px", marginBottom: "2rem" }}>
        <p className="text-small" style={{ marginBottom: "1rem" }}>
          Generate an invite link to share with someone you want to add to Lumen. The link expires in 7 days.
        </p>
        <button onClick={handleGenerateInvite} disabled={loading}>
          {loading ? "Generating..." : "Generate Invite Link"}
        </button>
      </div>

      {invites.length > 0 && (
        <div className="card">
          <h3>Recent Invites</h3>
          <ul style={{ listStyle: "none" }}>
            {invites.map((invite, i) => (
              <li key={i} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                <div className="text-small" style={{ marginBottom: "0.5rem" }}>
                  Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                </div>
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <code style={{ wordBreak: "break-all" }}>{invite.signupUrl}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(invite.signupUrl)}
                  style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
