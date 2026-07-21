export default function HelpPage() {
  return (
    <div>
      <h1>How Lumen Works</h1>
      <p className="text-small" style={{ marginBottom: "2rem" }}>
        A quick tour of every feature on this dashboard, and how the Siri side fits together with it.
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🎙️ Logging and asking, via Siri</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          Lumen's everyday interface isn't this website — it's two Siri Shortcuts on your phone, set up once from
          the <a href="/dashboard/setup" style={{ color: "#0066cc", textDecoration: "underline" }}>Setup</a> page:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>"Hey Siri, log it"</strong> — dictate a sentence, Lumen figures out what kind of thing it is
            (a workout, an expense, a task, whatever) and remembers it.
          </li>
          <li className="text-small">
            <strong>"Hey Siri, ask"</strong> — ask a question about what you've logged, out loud, and get a
            spoken answer back — no app opens, nothing to read.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>📬 Weekly recap</h3>
        <p className="text-small">
          A summary of the week's entries is pushed to your phone automatically (via a push notification) — no
          action needed on your end. This only works if you've set an <strong>Ntfy Topic</strong> in{" "}
          <a href="/dashboard/settings" style={{ color: "#0066cc", textDecoration: "underline" }}>Settings</a>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🗂️ Spaces</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          A space is where entries live. Every account gets a private default space automatically. From{" "}
          <a href="/dashboard/spaces" style={{ color: "#0066cc", textDecoration: "underline" }}>Spaces</a> you can
          create more:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Journal spaces</strong> — a running memory log you can ask questions about later.
          </li>
          <li className="text-small">
            <strong>Task spaces</strong> — a shared to-do list with points and a leaderboard, useful when a space
            has more than one member.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🤝 Two different ways to invite someone</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          These look similar but do different things — worth keeping straight:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>
              <a href="/dashboard/invites" style={{ color: "#0066cc", textDecoration: "underline" }}>Invite</a>
            </strong>{" "}
            page — creates a brand-new Lumen <em>account</em> for someone who doesn't have one yet. They get their
            own login, their own private space, and their own device setup.
          </li>
          <li className="text-small">
            <strong>A space's invite link</strong> (on any space's page, under "Share This Space") — lets someone
            who <em>already has</em> a Lumen account join <em>that specific space</em> alongside you, e.g. a shared
            task list.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>📱 Device setup</h3>
        <p className="text-small">
          The <a href="/dashboard/setup" style={{ color: "#0066cc", textDecoration: "underline" }}>Setup</a> page
          holds your personal bearer token — think of it like a password for the Siri Shortcuts, not something to
          share directly. If you want someone else to use Lumen, send them an{" "}
          <a href="/dashboard/invites" style={{ color: "#0066cc", textDecoration: "underline" }}>invite link</a>{" "}
          instead so they get their own token, not yours.
        </p>
      </div>

      <div className="card">
        <h3>⚙️ Settings</h3>
        <p className="text-small">
          Change your display name, and set an <strong>Ntfy Topic</strong> to receive push notifications (weekly
          recaps, daily notes) on your phone — install the free{" "}
          <a
            href="https://ntfy.sh"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc", textDecoration: "underline" }}
          >
            ntfy app
          </a>{" "}
          and subscribe to whatever topic name you choose here.
        </p>
      </div>
    </div>
  );
}
