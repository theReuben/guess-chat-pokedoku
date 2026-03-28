"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/data/pokemon";

interface Grid {
  id: string;
  row_categories: string;
  col_categories: string;
  example_answers: string;
  is_submission: number;
  created_at: string;
  updated_at: string;
}

export default function ManagePage() {
  const [grids, setGrids] = useState<Grid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchGrids() {
    fetch("/api/grids")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setGrids(data);
        else setError(data.error || "Failed to load");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchGrids(); }, []);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function deleteGrid(id: string) {
    if (!confirm("Delete this grid?")) return;
    const res = await fetch(`/api/grids/${id}`, { method: "DELETE" });
    if (res.ok) setGrids(prev => prev.filter(g => g.id !== id));
  }

  async function toggleSubmission(id: string, current: boolean) {
    const res = await fetch(`/api/grids/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSubmission: !current }),
    });
    if (res.ok) {
      setGrids(prev => prev.map(g => ({
        ...g,
        is_submission: g.id === id ? (!current ? 1 : 0) : (!current ? 0 : g.is_submission),
      })));
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>My Grids</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            Manage your grids and select one as your Guess Chat submission.
          </p>
        </div>
        <a href="/create" className="btn btn-primary">+ New Grid</a>
      </div>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
        </div>
      )}

      {grids.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>You haven&apos;t created any grids yet.</p>
          <a href="/create" className="btn btn-primary">Create Your First Grid</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {grids.map(grid => {
            const rows = JSON.parse(grid.row_categories) as string[];
            const cols = JSON.parse(grid.col_categories) as string[];
            const isSubmission = grid.is_submission === 1;

            return (
              <div key={grid.id} className="card" style={{
                borderColor: isSubmission ? "var(--accent)" : undefined,
                borderWidth: isSubmission ? "2px" : undefined,
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                    {isSubmission && <span className="badge badge-playing">Submission</span>}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    <strong>Rows:</strong> {rows.map(getCategoryLabel).join(" / ")}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <strong>Cols:</strong> {cols.map(getCategoryLabel).join(" / ")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className={`btn ${isSubmission ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.8rem", padding: "8px 14px" }}
                    onClick={() => toggleSubmission(grid.id, isSubmission)}
                  >
                    {isSubmission ? "Unmark" : "Set as Submission"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "8px 14px", color: "var(--accent)" }}
                    onClick={() => deleteGrid(grid.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
