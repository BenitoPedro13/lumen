"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSessionToken } from "@/lib/session";
import { apiGet } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verify token by calling GET /api/me
      const response = await fetch("http://localhost:3000/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      // Set session and redirect
      await setSessionToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <h1 className="text-center">Lumen</h1>
          <p className="text-center text-small" style={{ marginBottom: "2rem" }}>
            Your voice-first memory service
          </p>

          <div className="card">
            <h2>Log In</h2>
            <p className="text-small" style={{ marginBottom: "1rem" }}>
              Paste your bearer token to access your dashboard
            </p>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="token">Bearer Token</label>
                <textarea
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here"
                  rows={4}
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading || !token}>
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid #ddd" }} />
            <p className="text-small text-center">
              Don't have a token yet?{" "}
              <a href="#" style={{ color: "#0066cc", textDecoration: "underline" }}>
                Ask for an invite
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
