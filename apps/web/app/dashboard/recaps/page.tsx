"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Recap {
  id: number;
  kind: "weekly" | "daily" | "nudge";
  text: string;
  sentAt: string;
}

interface RecapsResponse {
  recaps: Recap[];
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
}

const KIND_LABELS: Record<Recap["kind"], string> = {
  weekly: "📬 Weekly recap",
  daily: "📝 Daily note",
  nudge: "👋 Check-in",
};

export default function RecapsPage() {
  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadPage(0, false);
  }, []);

  const loadPage = async (pageToLoad: number, append: boolean) => {
    if (append) setLoadingMore(true);
    const res = await apiGet<RecapsResponse>(`/me/recaps?page=${pageToLoad}`);
    if (res.ok && res.data) {
      setRecaps((prev) => (append ? [...prev, ...res.data!.recaps] : res.data!.recaps));
      setHasMore(res.data.pagination.hasMore);
      setPage(pageToLoad);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Recap History</h1>
      <p className="text-small" style={{ marginBottom: "1.5rem" }}>
        Every weekly recap, daily note, and check-in Lumen has sent you, in one place.{" "}
        <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
          Learn more
        </a>
      </p>

      {recaps.length === 0 ? (
        <div className="card">
          <p className="text-small">
            Nothing here yet — these show up once you've set an Ntfy Topic in{" "}
            <a href="/dashboard/settings" style={{ color: "#0066cc", textDecoration: "underline" }}>
              Settings
            </a>{" "}
            and Lumen has sent you at least one.
          </p>
        </div>
      ) : (
        <>
          <ul style={{ listStyle: "none" }}>
            {recaps.map((recap) => (
              <li key={recap.id} className="card" style={{ marginBottom: "1rem" }}>
                <div
                  className="text-small"
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
                >
                  <strong>{KIND_LABELS[recap.kind]}</strong>
                  <span>{new Date(recap.sentAt).toLocaleString()}</span>
                </div>
                <p>{recap.text}</p>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button onClick={() => loadPage(page + 1, true)} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
