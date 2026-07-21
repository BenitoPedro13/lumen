import { headers } from "next/headers";
import { getSessionToken } from "@/lib/session";
import { CopyButton } from "./CopyButton";
import { QRCode } from "./QRCode";

export default async function SetupPage() {
  const token = await getSessionToken() || "";
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3001";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const setupUrl = `${protocol}://${host}/dashboard/setup`;

  const logShortcutUrl = process.env.NEXT_PUBLIC_LOG_SHORTCUT_URL;
  const askShortcutUrl = process.env.NEXT_PUBLIC_ASK_SHORTCUT_URL;
  const apiUrl = process.env.LUMEN_API_URL || `${protocol}://${host}`;

  return (
    <div>
      <h1>📱 Set Up Your Device</h1>
      <p className="text-small" style={{ marginBottom: "1.5rem" }}>
        One-time setup for the Siri Shortcuts that let you use Lumen hands-free.{" "}
        <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
          How does this fit together?
        </a>
      </p>

      <div className="grid">
        <div className="card">
          <h3>Your Bearer Token</h3>
          <p className="text-small" style={{ marginBottom: "1rem" }}>
            This is like a personal password for the Shortcuts below — it's tied to your account only. Keep it
            secret, and never share it with anyone else; if you want to give someone else access, send them an{" "}
            <a href="/dashboard/invites" style={{ color: "#0066cc", textDecoration: "underline" }}>
              invite
            </a>{" "}
            so they get their own token instead.
          </p>
          <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "0.375rem", marginBottom: "1rem" }}>
            <code style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>{token}</code>
          </div>
          <CopyButton text={token} />
        </div>

        <div className="card">
          <h3>QR Code</h3>
          <p className="text-small" style={{ marginBottom: "1rem" }}>
            Scan to open this setup page on another device
          </p>
          <QRCode value={setupUrl} />
        </div>
      </div>

      {(logShortcutUrl || askShortcutUrl) && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <h3>📲 Add to Siri</h3>
          <p className="text-small" style={{ marginBottom: "1rem" }}>
            Tap the links below on your iPhone to add these Shortcuts to Siri. You'll be prompted to paste your token.
          </p>
          <div className="btn-group">
            {logShortcutUrl && (
              <a href={logShortcutUrl} target="_blank" rel="noopener noreferrer">
                <button>Add "Log it" Shortcut</button>
              </a>
            )}
            {askShortcutUrl && (
              <a href={askShortcutUrl} target="_blank" rel="noopener noreferrer">
                <button>Add "Ask" Shortcut</button>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>Manual Setup</h3>
        <p className="text-small" style={{ marginBottom: "1rem" }}>
          If the above links don't work, you can manually build the Shortcuts:
        </p>
        <ol>
          <li>
            Open the Shortcuts app on your iPhone
            <ul style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
              <li>
                <strong>Log Shortcut:</strong> Dictate Text → Get Contents of URL (POST to <code>/api/log</code>) →
                Speak Text
              </li>
              <li>
                <strong>Ask Shortcut:</strong> Dictate Text → Get Contents of URL (POST to <code>/api/ask</code>) →
                Speak Text
              </li>
            </ul>
          </li>
          <li>Add your token as a configurable input field in each Shortcut (see the Setup tab's "Import Question")</li>
          <li>Add a Siri phrase to each</li>
        </ol>
        <p className="text-small" style={{ marginTop: "1rem" }}>
          API URL: <code>{apiUrl}/api</code>
        </p>
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>Optional Extra Shortcuts</h3>
        <p className="text-small" style={{ marginBottom: "1rem" }}>
          Same manual-build pattern as above, not covered by the "Add to Siri" links yet:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.75rem" }}>
            <strong>Recap Shortcut:</strong> Get Contents of URL (POST to <code>/api/recap/now</code>) → Get Value
            for <code>recap</code> → Speak Text. Hear your weekly recap on demand instead of waiting for Sunday.
          </li>
          <li className="text-small" style={{ marginBottom: "0.75rem" }}>
            <strong>Undo Shortcut:</strong> Get Contents of URL (POST to <code>/api/undo</code>) → Get Value for{" "}
            <code>confirmation</code> → Speak Text. No dictation needed — it always retracts the last thing you
            logged.
          </li>
          <li className="text-small">
            <strong>What's Left Shortcut:</strong> Dictate Text → Get Contents of URL (POST to{" "}
            <code>/api/tasks/open</code>, body <code>{"{ text: <dictated> }"}</code>) → Get Value for{" "}
            <code>answer</code> → Speak Text. Reads back what's still open in a task space.
          </li>
        </ul>
        <p className="text-small" style={{ marginTop: "1rem" }}>
          <a href="/dashboard/help" style={{ color: "#0066cc", textDecoration: "underline" }}>
            What do these actually do?
          </a>
        </p>
      </div>
    </div>
  );
}
