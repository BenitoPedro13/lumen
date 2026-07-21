"use client";

import { useRouter } from "next/navigation";
import { clearSessionToken } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await clearSessionToken();
    router.push("/");
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-content">
          <h2 style={{ margin: 0 }}>Lumen</h2>
          <div className="nav-links">
            <a href="/dashboard">Home</a>
            <a href="/dashboard/spaces">Spaces</a>
            <a href="/dashboard/setup">Setup</a>
            <a href="/dashboard/invites">Invite</a>
            <a href="/dashboard/settings">Settings</a>
            <a href="/dashboard/help">Help</a>
            <button
              onClick={handleLogout}
              style={{
                background: "#d32f2f",
                padding: "0.25rem 0.75rem",
                fontSize: "0.875rem",
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>
      <div className="page">
        <div className="container">{children}</div>
      </div>
    </>
  );
}
