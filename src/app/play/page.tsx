export default function PlayPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>Play</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
        Choose a game mode.
      </p>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <a href="/play/all" className="card" style={{
          textDecoration: "none", color: "inherit", flex: "1", minWidth: "280px",
          cursor: "pointer", transition: "border-color 0.2s",
        }}>
          <h2 style={{ fontWeight: 700, marginBottom: "8px" }}>All Grids</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Play through random grids from other users. You&apos;ll see who created each one.
            Great for practice and fun!
          </p>
        </a>

        <a href="/play/guess-chat" className="card" style={{
          textDecoration: "none", color: "inherit", flex: "1", minWidth: "280px",
          cursor: "pointer", transition: "border-color 0.2s",
          borderColor: "var(--accent)",
        }}>
          <h2 style={{ fontWeight: 700, marginBottom: "8px", color: "var(--accent)" }}>Guess Chat</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Solve each player&apos;s submission and guess who created it.
            Review your guesses, then submit to see the reveal!
          </p>
        </a>
      </div>
    </div>
  );
}
