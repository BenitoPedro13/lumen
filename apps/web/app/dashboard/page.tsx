"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Space {
  id: number;
  name: string;
  kind: string;
  isDefault: boolean;
}

interface User {
  id: number;
  name: string;
  ntfyTopic: string | null;
}

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [userRes, spacesRes] = await Promise.all([apiGet<User>("/me"), apiGet<{ spaces: Space[] }>("/spaces")]);

      if (userRes.ok && userRes.data) {
        setUser(userRes.data);
      }
      if (spacesRes.ok && spacesRes.data) {
        setSpaces(spacesRes.data.spaces);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p className="text-small" style={{ marginTop: "0.5rem" }}>
        New here?{" "}
        <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
          See how everything works →
        </a>
      </p>

      <div className="grid" style={{ marginTop: "2rem" }}>
        <div className="card">
          <h3>Your Spaces</h3>
          {spaces.length === 0 ? (
            <p className="text-small">No spaces yet. Create one to get started.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {spaces.map((space) => (
                <li key={space.id} style={{ marginBottom: "0.5rem" }}>
                  <a href={`/dashboard/spaces/${space.id}`} style={{ color: "#0066cc", textDecoration: "underline" }}>
                    {space.name}
                  </a>{" "}
                  <span className="text-small">({space.kind})</span>
                </li>
              ))}
            </ul>
          )}
          <a href="/dashboard/spaces" style={{ color: "#0066cc", textDecoration: "underline" }}>
            Manage spaces →
          </a>
        </div>

        <div className="card">
          <h3>Quick Links</h3>
          <ul style={{ listStyle: "none" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <a href="/dashboard/setup" style={{ color: "#0066cc", textDecoration: "underline" }}>
                📱 Set up your device
              </a>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <a href="/dashboard/invites" style={{ color: "#0066cc", textDecoration: "underline" }}>
                👥 Invite others
              </a>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <a href="/dashboard/settings" style={{ color: "#0066cc", textDecoration: "underline" }}>
                ⚙️ Account settings
              </a>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
                ❓ How Lumen works
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
