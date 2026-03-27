export default function Home() {
  return (
    <div style={{ textAlign: "center", paddingTop: "60px" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "16px" }}>
        Pokédoku
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", maxWidth: "500px", margin: "0 auto 48px" }}>
        Create Pokédoku grids for your friends to solve — then guess who made each one!
      </p>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <a href="/create" className="card" style={{
          textDecoration: "none", color: "inherit", width: "220px", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>+</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Create</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Build a new grid
          </div>
        </a>

        <a href="/manage" className="card" style={{
          textDecoration: "none", color: "inherit", width: "220px", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>&#9776;</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Manage</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Edit grids &amp; pick your submission
          </div>
        </a>

        <a href="/play" className="card" style={{
          textDecoration: "none", color: "inherit", width: "220px", textAlign: "center",
          transition: "border-color 0.2s", cursor: "pointer",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>&#9654;</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Play</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Solve grids &amp; guess authors
          </div>
        </a>
      </div>

      <div style={{ marginTop: "48px" }}>
        <a href="/api/auth/signin" className="btn btn-primary">
          Sign in with Discord
        </a>
      </div>
    </div>
  );
}
