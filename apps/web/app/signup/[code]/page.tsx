"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { setSessionToken } from "@/lib/session";
import { apiPost } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [name, setName] = useState("");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiPost<{ token: string }>("/signup", {
        code,
        name,
        ntfyTopic: ntfyTopic || undefined,
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error || "Signup failed");
      }

      // Set session with returned token and redirect to setup
      await setSessionToken(result.data.token);
      router.push("/dashboard/setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <h1 className="text-center">Welcome to Lumen</h1>
          <p className="text-center text-small" style={{ marginBottom: "2rem" }}>
            Create your account to get started
          </p>

          <div className="card">
            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ntfyTopic">
                  Ntfy Topic (optional)
                  <span className="text-small" style={{ display: "block", fontWeight: "normal" }}>
                    Topic for push notifications (leave empty to configure later)
                  </span>
                </label>
                <input
                  id="ntfyTopic"
                  type="text"
                  value={ntfyTopic}
                  onChange={(e) => setNtfyTopic(e.target.value)}
                  placeholder="your-ntfy-topic"
                  disabled={loading}
                />
              </div>

              <button type="submit" disabled={loading || !name}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
