"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CATEGORIES, findPokemon, pokemonMatchesCategory } from "@/data/pokemon";

interface GridData {
  id: string;
  round_id: string;
  row_categories: string;
  col_categories: string;
  created_by_name: string;
  created_by: string;
  answers: string;
}

interface SolutionData {
  player_name: string;
  player_id: string;
  answers: string;
  correct_count: number;
  guessed_author_id: string;
  guessed_author_name: string;
}

export default function ResultsPage() {
  const { id: gridId } = useParams<{ id: string }>();
  const [grid, setGrid] = useState<GridData | null>(null);
  const [solutions, setSolutions] = useState<SolutionData[]>([]);
  const [roundName, setRoundName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/grids/${gridId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setGrid(data.grid as GridData);
          setSolutions(data.solutions || []);
          setRoundName(data.round?.name || "");
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [gridId]);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;
  if (error) return <p style={{ color: "var(--accent)" }}>{error}</p>;
  if (!grid) return <p>Grid not found</p>;

  const rowCategories = JSON.parse(grid.row_categories) as string[];
  const colCategories = JSON.parse(grid.col_categories) as string[];
  const creatorAnswers = JSON.parse(grid.answers) as string[];

  return (
    <div>
      <a href={`/rounds/${grid.round_id}`} style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.85rem" }}>
        ← Back to {roundName}
      </a>

      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "16px 0 8px" }}>
        Grid Results
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
        Created by <strong style={{ color: "var(--accent)" }}>{grid.created_by_name}</strong>
      </p>

      {/* Creator's Grid with Answers */}
      <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Creator&apos;s Answers</h3>
      <div className="pokedoku-grid" style={{ marginBottom: "32px" }}>
        <div className="grid-corner" />
        {colCategories.map(id => (
          <div key={id} className="grid-header">{getCategoryLabel(id)}</div>
        ))}
        {rowCategories.map((rowId, r) => (
          <>
            <div key={`rh-${rowId}`} className="grid-header">{getCategoryLabel(rowId)}</div>
            {colCategories.map((_colId, c) => {
              const idx = r * 3 + c;
              return (
                <div key={`cell-${r}-${c}`} className="grid-cell filled" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {creatorAnswers[idx]}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Solutions */}
      <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
        Player Solutions ({solutions.length})
      </h3>

      {solutions.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No one solved this grid yet.</p>
      ) : (
        solutions.map((sol, si) => {
          const solAnswers = JSON.parse(sol.answers) as string[];
          const authorGuessCorrect = sol.guessed_author_id === grid.created_by;
          return (
            <div key={si} className="card" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <strong>{sol.player_name}</strong>
                  <span style={{ color: "var(--text-secondary)", marginLeft: "12px" }}>
                    Score: <strong style={{ color: "var(--success)" }}>{sol.correct_count}/9</strong>
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem" }}>
                  Guessed: <strong>{sol.guessed_author_name || "—"}</strong>
                  {sol.guessed_author_id && (
                    authorGuessCorrect
                      ? <span style={{ color: "var(--success)", marginLeft: "8px" }}>✓ Correct!</span>
                      : <span style={{ color: "var(--accent)", marginLeft: "8px" }}>✗ Wrong</span>
                  )}
                </div>
              </div>

              <div className="pokedoku-grid">
                <div className="grid-corner" />
                {colCategories.map(id => (
                  <div key={id} className="grid-header" style={{ fontSize: "0.7rem" }}>{getCategoryLabel(id)}</div>
                ))}
                {rowCategories.map((rowId, r) => (
                  <>
                    <div key={`rh-${rowId}`} className="grid-header" style={{ fontSize: "0.7rem" }}>{getCategoryLabel(rowId)}</div>
                    {colCategories.map((colId, c) => {
                      const idx = r * 3 + c;
                      const answer = solAnswers[idx];
                      const pokemon = answer ? findPokemon(answer) : null;
                      const isCorrect = pokemon &&
                        pokemonMatchesCategory(pokemon, rowId) &&
                        pokemonMatchesCategory(pokemon, colId);
                      return (
                        <div
                          key={`cell-${r}-${c}`}
                          className={`grid-cell ${answer ? (isCorrect ? "correct" : "incorrect") : ""}`}
                          style={{ fontSize: "0.8rem" }}
                        >
                          {answer || "—"}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
