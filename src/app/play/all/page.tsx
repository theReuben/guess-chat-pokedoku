"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

interface GridData {
  id: string;
  row_categories: string;
  col_categories: string;
  creator_name: string;
  creator_avatar: string | null;
}

export default function PlayAllPage() {
  const [grid, setGrid] = useState<GridData | null>(null);
  const [noMore, setNoMore] = useState(false);
  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [result, setResult] = useState<{ correctCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function fetchNextGrid() {
    setLoading(true);
    setResult(null);
    setAnswers(Array(9).fill(""));
    setError("");
    fetch("/api/play/all")
      .then(r => {
        if (r.status === 401) {
          window.location.href = "/api/auth/signin";
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.grid) {
          setGrid(data.grid);
          setNoMore(false);
        } else {
          setGrid(null);
          setNoMore(true);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchNextGrid(); }, []);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function submitSolution() {
    if (!grid || answers.some(a => !a)) return;
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/grids/${grid.id}/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
    }
    setSubmitting(false);
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;

  if (noMore) {
    return (
      <div style={{ textAlign: "center", paddingTop: "48px" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "12px" }}>All caught up!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          You&apos;ve played all available grids. Check back later for new ones!
        </p>
        <a href="/play" className="btn btn-secondary">Back to Play</a>
      </div>
    );
  }

  if (!grid) return null;

  const rowCategories = JSON.parse(grid.row_categories) as string[];
  const colCategories = JSON.parse(grid.col_categories) as string[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Play - All Grids</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Created by <strong style={{ color: "var(--text-primary)" }}>{grid.creator_name}</strong>
          </p>
        </div>
        {result && (
          <button className="btn btn-primary" onClick={fetchNextGrid}>
            Next Grid
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: result.correctCount >= 7 ? "var(--success)" : result.correctCount >= 4 ? "var(--warning)" : "var(--accent)" }}>
            {result.correctCount}/9
          </div>
          <p style={{ color: "var(--text-secondary)" }}>cells correct</p>
        </div>
      )}

      <div className="pokedoku-grid">
        <div className="grid-corner" />
        {colCategories.map(id => (
          <div key={id} className="grid-header">{getCategoryLabel(id)}</div>
        ))}
        {rowCategories.map((rowId, r) => (
          <div key={`row-${r}`} style={{ display: "contents" }}>
            <div className="grid-header">{getCategoryLabel(rowId)}</div>
            {colCategories.map((_colId, c) => {
              const idx = r * 3 + c;
              return (
                <div key={`cell-${r}-${c}`} className={`grid-cell ${answers[idx] ? "filled" : ""}`}>
                  <PokemonAutocomplete
                    value={answers[idx]}
                    onChange={name => {
                      const next = [...answers];
                      next[idx] = name;
                      setAnswers(next);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!result && (
        <div style={{ marginTop: "24px" }}>
          <button
            className="btn btn-primary"
            onClick={submitSolution}
            disabled={submitting || answers.some(a => !a)}
          >
            {submitting ? "Checking..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
