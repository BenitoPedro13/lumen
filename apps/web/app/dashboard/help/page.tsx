export default function HelpPage() {
  return (
    <div>
      <h1>How Lumen Works</h1>
      <p className="text-small" style={{ marginBottom: "2rem" }}>
        Everything below is the actual logic running behind the scenes — not just the buttons on this dashboard.
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🎙️ Logging something</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          "Hey Siri, log it" and dictate a sentence. Lumen reads it and works out what kind of thing it is —{" "}
          <em>fitness, spending, mood, food, errand, work,</em> or <em>other</em> — automatically. You never pick a
          category yourself.
        </p>
        <p className="text-small">
          <strong>Fixing a mistake:</strong> if you log again within about 15 minutes and it sounds like a
          correction — "actually...", "wait, I meant...", "no, make that..." — Lumen updates the entry you just
          made instead of creating a new one. Wait longer than that, or say something unrelated, and it's treated
          as a brand-new entry.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>❓ Asking a question</h3>
        <p className="text-small">
          "Hey Siri, ask" works in two steps you never see: first Lumen guesses a date range from how you phrased
          the question ("last week", "in March", or no range at all if you didn't imply one), then it looks only
          at entries in that window and reasons over them to give a short spoken answer. If nothing in your log
          actually answers the question, it says so instead of guessing.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🎛️ Three more voice commands</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          Beyond Log and Ask, there are three more Shortcuts you can optionally build yourself — see "Optional
          Extra Shortcuts" on the{" "}
          <a href="/dashboard/setup" style={{ color: "#0066cc", textDecoration: "underline" }}>Setup</a> page for
          the exact recipe:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Recap</strong> — hear your weekly recap right now instead of waiting for Sunday evening. Same
            recap logic, just on demand and spoken back immediately rather than pushed.
          </li>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Undo</strong> — retracts the last thing you logged, in any space. No dictation needed, and no
            time limit like the correction window above — it always means "undo the last thing," however old it
            is.
          </li>
          <li className="text-small">
            <strong>What's Left</strong> — a fast, direct read-out of what's still open in a task space, rather
            than going through the fuller reasoning "ask" does. Useful when you just want the list, not a
            conversation.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🔥 Streaks and milestones</h3>
        <p className="text-small">
          Every day you log at least one thing counts toward a streak — it's about the habit of using Lumen, not
          about the day the thing itself happened. Miss a full day and the streak resets. Occasionally, when a log
          happens to land on a milestone (a round number of entries, or a streak like 7 or 30 days), Lumen will
          mention it warmly in its spoken confirmation — but only sometimes, by design, so it doesn't turn into a
          notification every single time.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>🗂️ Spaces, and how Lumen knows which one you mean</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          A space is where entries live. Everyone gets a private default space automatically; you can create more
          from <a href="/dashboard/spaces" style={{ color: "#0066cc", textDecoration: "underline" }}>Spaces</a>:
        </p>
        <ul style={{ marginLeft: "1rem", marginBottom: "0.75rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Journal spaces</strong> — a running memory log, included in your weekly recap and daily notes.
          </li>
          <li className="text-small">
            <strong>Task spaces</strong> — a shared to-do list with points and a leaderboard.
          </li>
        </ul>
        <p className="text-small">
          If you only have one space, Lumen skips straight to it. With more than one, it reads your sentence and
          picks the space it thinks you mean — falling back to your default space if it's ambiguous. You never
          have to name the space explicitly, though giving spaces distinct names helps it guess correctly.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>✅ Task spaces — adding, completing, and points</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          Task spaces are managed entirely by voice right now — there's no "add task" button on this site yet.
        </p>
        <ul style={{ marginLeft: "1rem", marginBottom: "0.75rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Adding one:</strong> "log it" → <em>"add buy milk, worth 5 points, due tomorrow"</em>. Points
            default to 10 if you don't mention any.
          </li>
          <li className="text-small">
            <strong>Completing one:</strong> "log it" → <em>"I bought the milk"</em>. Lumen matches your sentence
            against the space's currently-open tasks and marks the closest match done, crediting the points to
            whoever said it — not necessarily whoever created it.
          </li>
        </ul>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          The <strong>Leaderboard</strong> on each task space's page is already sorted highest-points-first — the
          👑 marks whoever's ahead.
        </p>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          <strong>Shared Streak</strong> (spaces with 2+ members only) — like a Duolingo shared streak: the day
          only counts if <em>every</em> member logs or completes something in that space. One person going quiet
          breaks it for everyone, not just for them.
        </p>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          <strong>Badges</strong> — shown once earned: first task completed together, shared-streak milestones (3,
          7, 14, 30... days), and combined-points milestones (50, 100, 250... points across everyone in the space).
          They're computed from your existing history, not something you unlock separately.
        </p>
        <p className="text-small">
          <strong>Reactions</strong> — tap 🎉 or 👍 under any completed task in "Recent Entries" to react to what
          someone else finished. Purely a small nudge between members, nothing gets notified.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>📬 Weekly recap, daily notes, and check-ins</h3>
        <p className="text-small" style={{ marginBottom: "0.75rem" }}>
          These only run over your <strong>journal</strong> spaces, and only if you've set an Ntfy Topic in{" "}
          <a href="/dashboard/settings" style={{ color: "#0066cc", textDecoration: "underline" }}>Settings</a>. All
          three are pushed as one notification, never combined — every one you've ever received is kept on the{" "}
          <a href="/dashboard/recaps" style={{ color: "#0066cc", textDecoration: "underline" }}>Recaps</a> page:
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Weekly recap</strong> — Sunday evening, a few warm sentences about the last 7 days. Might
            mention your streak or entry count if it's actually interesting, and occasionally a nostalgic nod to
            what you logged around this time last month or last year, once you have that much history.
          </li>
          <li className="text-small" style={{ marginBottom: "0.5rem" }}>
            <strong>Daily note</strong> — every other evening (Mon–Sat), one short sentence about just that day, if
            you logged anything.
          </li>
          <li className="text-small">
            <strong>Check-in nudge</strong> — if you go quiet for 2–3 days, a single gentle "haven't heard from
            you" message instead of a daily note — sent once per quiet stretch, not repeated every day you stay
            silent.
          </li>
        </ul>
        <p className="text-small" style={{ marginTop: "0.75rem" }}>
          If you're in a shared task space with someone, the weekly recap will also occasionally mention who's
          ahead that week — but only when it's actually a close race or a notable week, never as a mechanical
          leaderboard readout.
        </p>
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
          recaps, daily notes, check-ins) on your phone — install the free{" "}
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
