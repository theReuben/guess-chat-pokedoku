"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Round {
  id: string;
  name: string;
  status: string;
  created_by: string;
  grids: Grid[];
  userSolutions: Solution[];
  participants: { id: string; name: string }[];
  hasSubmitted: boolean;
}

interface Grid {
  id: string;
  row_categories: string;
  col_categories: string;
  created_by?: string;
  created_by_name?: string;
  answers?: string;
}

interface Solution {
  grid_id: string;
  correct_count: number;
  guessed_author_id: string;
  guessed_author_name: string;
  answers: string;
}

export default function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchRound() {
    fetch(`/api/rounds/${id}`)
      .then(r => r.json())
      .then(setRound)
      .catch(() => setError("Failed to load round"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRound(); }, [id]);

  async function advanceStatus(newStatus: string) {
    const res = await fetch(`/api/rounds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchRound();
    else {
      const data = await res.json();
      setError(data.error || "Failed to update");
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;
  if (error) return <p style={{ color: "var(--accent)" }}>{error}</p>;
  if (!round) return <p>Round not found</p>;

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      submissions_open: { cls: "badge-open", label: "Accepting Grids" },
      playing: { cls: "badge-playing", label: "Playing" },
      revealed: { cls: "badge-revealed", label: "Revealed" },
    };
    const s = map[status] || { cls: "", label: status };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const solvedGridIds = new Set(round.userSolutions.map(s => s.grid_id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>{round.name}</h1>
          <div style={{ marginTop: "8px" }}>{statusBadge(round.status)}</div>
        </div>
      </div>

      {/* Admin controls */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Round Controls</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {round.status === "submissions_open" && (
            <>
              <a href={`/create?roundId=${round.id}`} className="btn btn-primary">
                {round.hasSubmitted ? "Already Submitted" : "Create Your Grid"}
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => advanceStatus("playing")}
                disabled={round.grids.length < 2}
              >
                Start Playing ({round.grids.length} grids)
              </button>
            </>
          )}
          {round.status === "playing" && (
            <button className="btn btn-secondary" onClick={() => advanceStatus("revealed")}>
              Reveal Results
            </button>
          )}
        </div>
      </div>

      {/* Participants */}
      {round.participants.length > 0 && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>
            Participants ({round.participants.length})
          </h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {round.participants.map(p => (
              <span key={p.id} className="category-chip">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Grids */}
      {(round.status === "playing" || round.status === "revealed") && (
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
            Grids to Solve
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {round.grids.map((grid, i) => {
              const solved = solvedGridIds.has(grid.id);
              const solution = round.userSolutions.find(s => s.grid_id === grid.id);
              return (
                <div key={grid.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Grid #{i + 1}</div>
                    {round.status === "revealed" && grid.created_by_name && (
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                        Created by: <strong>{grid.created_by_name}</strong>
                      </div>
                    )}
                    {solution && (
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                        Score: {solution.correct_count}/9
                        {round.status === "revealed" && solution.guessed_author_name && (
                          <>
                            {" · "}You guessed: <strong>{solution.guessed_author_name}</strong>
                            {solution.guessed_author_id === grid.created_by
                              ? <span style={{ color: "var(--success)" }}> ✓ Correct!</span>
                              : <span style={{ color: "var(--accent)" }}> ✗ Wrong</span>
                            }
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    {round.status === "playing" && !solved && (
                      <a href={`/play/${grid.id}`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                        Solve
                      </a>
                    )}
                    {solved && round.status === "playing" && (
                      <span className="badge badge-open">Completed</span>
                    )}
                    {round.status === "revealed" && (
                      <a href={`/results/${grid.id}`} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                        View Results
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reveal Summary */}
      {round.status === "revealed" && round.userSolutions.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Your Results Summary</h3>
          {(() => {
            const totalCells = round.userSolutions.reduce((sum, s) => sum + s.correct_count, 0);
            const maxCells = round.userSolutions.length * 9;
            const correctGuesses = round.userSolutions.filter(s => {
              const grid = round.grids.find(g => g.id === s.grid_id);
              return grid && s.guessed_author_id === grid.created_by;
            }).length;
            return (
              <div style={{ display: "flex", gap: "32px" }}>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>
                    {totalCells}/{maxCells}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Cells Correct</div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--warning)" }}>
                    {correctGuesses}/{round.userSolutions.length}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Author Guesses Correct</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
