// ntfy.sh push delivery — see docs/architecture/overview.md §6.3/§9. Shared by
// the weekly recap, daily note, and check-in nudge cron jobs.
export async function pushNotification(text: string, title: string): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("NTFY_TOPIC not set — skipping push");
    return;
  }

  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: text,
    headers: { Title: title },
  });

  if (!res.ok) {
    console.error("ntfy push failed", res.status, await res.text().catch(() => ""));
  }
}
