"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Space {
  id: number;
  name: string;
  kind: string;
}

export default function JoinSpacePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [status, setStatus] = useState<"joining" | "error">("joining");
  const [error, setError] = useState("");

  useEffect(() => {
    const join = async () => {
      const res = await apiPost<Space>("/spaces/join", { code });
      if (res.ok && res.data) {
        router.push(`/dashboard/spaces/${res.data.id}`);
      } else {
        setError(res.error || "Invite code not found");
        setStatus("error");
      }
    };

    join();
  }, [code, router]);

  return (
    <div>
      <h1>Join Space</h1>

      <div className="card" style={{ maxWidth: "500px" }}>
        {status === "joining" && <p>Joining space…</p>}
        {status === "error" && (
          <>
            <div className="error">{error}</div>
            <p className="text-small" style={{ marginTop: "1rem" }}>
              <a href="/dashboard/spaces" style={{ color: "#0066cc", textDecoration: "underline" }}>
                ← Back to your spaces
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
