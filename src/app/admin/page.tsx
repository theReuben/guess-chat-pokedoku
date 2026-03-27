"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/data/pokemon";

interface Grid {
  id: string;
  created_by: string;
  creator_name: string;
  discord_username: string;
  row_categories: string;
  col_categories: string;
  example_answers: string;
  is_submission: number;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const [grids, setGrids] = useState<Grid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterUser, setFilterUser] = useState<string>("all");

  function fetchGrids() {
    setLoading(true);
    fetch("/api/admin/grids")
      .then(r => {
        if (r.status === 403) throw new Error("Access denied. Your Discord user ID must be in ADMIN_USER_IDS.");
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) setGrids(data);
        else setError(data.error || "Failed to load");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchGrids(); }, []);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function toggleSubmission(grid: Grid) {
    const newVal = grid.is_submission !== 1;
    const res = await fetch(`/api/admin/grids/${grid.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSubmission: newVal }),
    });
    if (res.ok) {
      const updated = await res.json() as Grid;
      setGrids(prev => prev.map(g => {
        // If setting as submission, unmark other grids by same creator
        if (newVal && g.created_by === grid.created_by && g.id !== grid.id) {
          return { ...g, is_submission: 0 };
        }
        if (g.id === grid.id) return updated;
        return g;
      }));
    }
  }

  async function deleteGrid(id: string) {
    if (!confirm("Permanently delete this grid?")) return;
    const res = await fetch(`/api/admin/grids/${id}`, { method: "DELETE" });
    if (res.ok) setGrids(prev => prev.filter(g => g.id !== id));
  }

  // Get unique creators for filter
  const creators = Array.from(new Map(grids.map(g => [g.created_by, { id: g.created_by, name: g.creator_name }])).values());
  const filtered = filterUser === "all" ? grids : grids.filter(g => g.created_by === filterUser);

  const submissionCount = grids.filter(g => g.is_submission === 1).length;
  const usersWithSubmission = new Set(grids.filter(g => g.is_submission === 1).map(g => g.created_by)).size;

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;

  if (error) {
    return (
      <div style={{ textAlign: "center", paddingTop: "48px" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--accent)" }}>Admin Access</h2>
        <p style={{ color: "var(--text-secondary)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>Admin Panel</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
        Manage all grids across all users.
      </p>

      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: "150px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{grids.length}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Total Grids</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: "150px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{creators.length}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Creators</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: "150px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{submissionCount}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Submissions</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: "150px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: creators.length > 0 && usersWithSubmission < creators.length ? "var(--warning)" : "var(--success)" }}>
            {usersWithSubmission}/{creators.length}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Users w/ Submission</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          style={{ maxWidth: "300px" }}
        >
          <option value="all">All Users ({grids.length} grids)</option>
          {creators.map(c => {
            const count = grids.filter(g => g.created_by === c.id).length;
            const hasSub = grids.some(g => g.created_by === c.id && g.is_submission === 1);
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({count} grid{count !== 1 ? "s" : ""}{hasSub ? ", has submission" : ""})
              </option>
            );
          })}
        </select>
      </div>

      {/* Grids */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.map(grid => {
          const rows = JSON.parse(grid.row_categories) as string[];
          const cols = JSON.parse(grid.col_categories) as string[];
          const answers = JSON.parse(grid.example_answers) as string[];
          const isSubmission = grid.is_submission === 1;

          return (
            <div key={grid.id} className="card" style={{
              borderColor: isSubmission ? "var(--accent)" : undefined,
              borderWidth: isSubmission ? "2px" : undefined,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <strong>{grid.creator_name}</strong>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>@{grid.discord_username}</span>
                    {isSubmission && <span className="badge badge-playing">Submission</span>}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    ID: {grid.id} — Created: {new Date(grid.created_at + "Z").toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    className={`btn ${isSubmission ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => toggleSubmission(grid)}
                  >
                    {isSubmission ? "Unmark Submission" : "Set as Submission"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "6px 12px", color: "var(--accent)" }}
                    onClick={() => deleteGrid(grid.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Mini grid preview */}
              <div style={{ fontSize: "0.8rem" }}>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Rows:</strong> {rows.map(getCategoryLabel).join(" / ")}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Cols:</strong> {cols.map(getCategoryLabel).join(" / ")}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", color: "var(--text-secondary)" }}>
                    Show example answers
                  </summary>
                  <div className="pokedoku-grid" style={{ marginTop: "8px", maxWidth: "450px" }}>
                    <div className="grid-corner" />
                    {cols.map(id => (
                      <div key={id} className="grid-header" style={{ fontSize: "0.7rem", padding: "4px 6px" }}>
                        {getCategoryLabel(id)}
                      </div>
                    ))}
                    {rows.map((rowId, r) => (
                      <div key={`row-${r}`} style={{ display: "contents" }}>
                        <div className="grid-header" style={{ fontSize: "0.7rem", padding: "4px 6px" }}>
                          {getCategoryLabel(rowId)}
                        </div>
                        {cols.map((_colId, c) => (
                          <div key={`cell-${r}-${c}`} className="grid-cell filled" style={{ fontSize: "0.75rem", minHeight: "40px", padding: "2px" }}>
                            {answers[r * 3 + c]}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px" }}>
          No grids to show.
        </p>
      )}
    </div>
  );
}
