export default function Home() {
  return (
    <div style={{ textAlign: "center", paddingTop: "40px" }}>
      <h1 style={{ fontSize: "clamp(2rem, 8vw, 3rem)", fontWeight: 800, marginBottom: "16px" }}>
        Pokédoku
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "clamp(1rem, 3vw, 1.2rem)", maxWidth: "500px", margin: "0 auto 40px" }}>
        Create Pokédoku grids for your friends to solve — then guess who made each one!
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", maxWidth: "720px", margin: "0 auto" }}>
        <a href="/create" className="card" style={{
          textDecoration: "none", color: "inherit", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>+</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Create</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Build a new grid
          </div>
        </a>

        <a href="/manage" className="card" style={{
          textDecoration: "none", color: "inherit", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>&#9776;</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Manage</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Edit grids &amp; pick your submission
          </div>
        </a>

        <a href="/play" className="card" style={{
          textDecoration: "none", color: "inherit", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>&#9654;</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Play</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Solve grids &amp; guess authors
          </div>
        </a>
      </div>

      <div style={{ marginTop: "40px" }}>
        <a
          href="/api/auth/discord-mobile"
          className="btn btn-primary"
          style={{ padding: "14px 32px", fontSize: "1.05rem", borderRadius: "10px" }}
        >
          Sign in with Discord
        </a>
      </div>
    </div>
  );
}
