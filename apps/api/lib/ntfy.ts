// ntfy.sh push delivery for the weekly recap — see docs/architecture/overview.md §6.3/§9.
export async function pushRecap(text: string): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("NTFY_TOPIC not set — skipping recap push");
    return;
  }

  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: text,
    headers: { Title: "Weekly recap" },
  });

  if (!res.ok) {
    console.error("ntfy push failed", res.status, await res.text().catch(() => ""));
  }
}
