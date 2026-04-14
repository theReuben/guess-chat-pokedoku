"use client";

import { useEffect, useState } from "react";
import { getLabelForCategoryId, getFilteredPokemonNames, getPokemonSpriteUrl } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

interface GridData {
  id: string;
  row_categories: string;
  col_categories: string;
  creator_name: string;
  creator_avatar: string | null;
}

interface SolveResult {
  correctCount: number;
  exampleAnswers: string[];
  isCorrect: boolean[];
}

export default function PlayAllPage() {
  const [grid, setGrid] = useState<GridData | null>(null);
  const [noMore, setNoMore] = useState(false);
  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [result, setResult] = useState<SolveResult | null>(null);
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
          window.location.href = "/api/auth/discord-mobile";
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
    return getLabelForCategoryId(id);
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

      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Player's submitted grid */}
        <div>
          {result && (
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>Your Answers</h2>
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
                  const cellClass = result
                    ? result.isCorrect[idx] ? "correct" : "incorrect"
                    : answers[idx] ? "filled" : "";
                  return (
                    <div key={`cell-${r}-${c}`} className={`grid-cell ${cellClass}`}>
                      {result ? (
                        <div style={{ textAlign: "center", padding: "4px" }}>
                          {answers[idx] && (
                            <>
                              <img
                                src={getPokemonSpriteUrl(answers[idx]) || ""}
                                alt={answers[idx]}
                                style={{ width: "40px", height: "40px", imageRendering: "pixelated", display: "block", margin: "0 auto 2px" }}
                              />
                              <span style={{ fontSize: "0.75rem" }}>{answers[idx]}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <PokemonAutocomplete
                          value={answers[idx]}
                          onChange={name => {
                            const next = [...answers];
                            next[idx] = name;
                            setAnswers(next);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Intended answers grid (shown after submission) */}
        {result && (
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>Intended Answers</h2>
            <div className="pokedoku-grid">
              <div className="grid-corner" />
              {colCategories.map(id => (
                <div key={id} className="grid-header">{getCategoryLabel(id)}</div>
              ))}
              {rowCategories.map((rowId, r) => (
                <div key={`row-${r}`} style={{ display: "contents" }}>
                  <div className="grid-header">{getCategoryLabel(rowId)}</div>
                  {colCategories.map((colId, c) => {
                    const idx = r * 3 + c;
                    const exampleAnswer = result.exampleAnswers[idx];
                    const validNames = getFilteredPokemonNames(rowId, colId);
                    return (
                      <div key={`intended-${r}-${c}`} className="grid-cell correct" style={{ flexDirection: "column", gap: "4px" }}>
                        {exampleAnswer && (
                          <>
                            <img
                              src={getPokemonSpriteUrl(exampleAnswer) || ""}
                              alt={exampleAnswer}
                              style={{ width: "40px", height: "40px", imageRendering: "pixelated" }}
                            />
                            <span style={{ fontSize: "0.75rem", textAlign: "center" }}>{exampleAnswer}</span>
                          </>
                        )}
                        <select
                          defaultValue={exampleAnswer}
                          style={{ fontSize: "0.7rem", padding: "2px 4px", marginTop: "2px", width: "100%" }}
                          aria-label={`Valid answers for row ${r + 1}, column ${c + 1}`}
                        >
                          {validNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
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
