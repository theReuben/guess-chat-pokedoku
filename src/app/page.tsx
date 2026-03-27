"use client";

import { useEffect, useState } from "react";

interface Round {
  id: string;
  name: string;
  status: string;
  grid_count: number;
  created_at: string;
}

export default function Home() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [newRoundName, setNewRoundName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rounds")
      .then(r => r.json())
      .then(setRounds)
      .finally(() => setLoading(false));
  }, []);

  async function createRound() {
    if (!newRoundName.trim()) return;
    const res = await fetch("/api/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoundName.trim() }),
    });
    if (res.ok) {
      const round = await res.json();
      setRounds(prev => [{ ...round, grid_count: 0 }, ...prev]);
      setNewRoundName("");
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      submissions_open: { class: "badge-open", label: "Accepting Grids" },
      playing: { class: "badge-playing", label: "Playing" },
      revealed: { class: "badge-revealed", label: "Revealed" },
    };
    const s = map[status] || { class: "", label: status };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "8px" }}>
          Pokédoku
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Create grids for your friends to solve — then guess who made each one!
        </p>
      </div>

      {/* Create Round */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "12px" }}>
          Start a New Round
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder="Round name (e.g. 'Friday Night Pokédoku')"
            value={newRoundName}
            onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createRound()}
          />
          <button className="btn btn-primary" onClick={createRound} style={{ whiteSpace: "nowrap" }}>
            Create Round
          </button>
        </div>
      </div>

      {/* Rounds List */}
      <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px" }}>
        Rounds
      </h2>
      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      ) : rounds.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No rounds yet. Create one to get started!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rounds.map(round => (
            <a
              key={round.id}
              href={`/rounds/${round.id}`}
              className="card"
              style={{ textDecoration: "none", color: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{round.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {round.grid_count} grid{round.grid_count !== 1 ? "s" : ""} submitted
                </div>
              </div>
              {statusBadge(round.status)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
