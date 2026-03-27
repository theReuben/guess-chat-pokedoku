"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, findPokemon, pokemonMatchesCategory } from "@/data/pokemon";

interface Entry {
  grid_id: string;
  answers: string;
  correct_count: number;
  guessed_author_id: string | null;
  row_categories: string;
  col_categories: string;
  example_answers: string;
  created_by: string;
  actual_author_name: string;
  actual_author_avatar: string | null;
  guessed_author_name: string | null;
  order_index: number;
}

interface Session {
  id: string;
  status: string;
}

function ResultsInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1); // -1 = show summary first
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/play/guess-chat/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setSession(data.session);
          setEntries(data.entries || []);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;
  if (error) return <p style={{ color: "var(--accent)" }}>{error}</p>;
  if (!session || entries.length === 0) return <p>No results found.</p>;

  const totalCorrectCells = entries.reduce((sum, e) => sum + e.correct_count, 0);
  const totalCells = entries.length * 9;
  const correctGuesses = entries.filter(e => e.guessed_author_id === e.created_by).length;

  // Summary view
  if (revealIndex === -1) {
    return (
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "24px", textAlign: "center" }}>
          Guess Chat Results
        </h1>

        <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--success)" }}>
              {totalCorrectCells}/{totalCells}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Cells Correct</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--warning)" }}>
              {correctGuesses}/{entries.length}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Author Guesses Correct</div>
          </div>
        </div>

        <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>Grid-by-Grid Reveal</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {entries.map((entry, i) => {
            const guessCorrect = entry.guessed_author_id === entry.created_by;
            return (
              <div
                key={i}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => setRevealIndex(i)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Grid #{i + 1}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Score: <strong>{entry.correct_count}/9</strong>
                      {" — "}Created by: <strong style={{ color: "var(--accent)" }}>{entry.actual_author_name}</strong>
                      {" — "}You guessed: <strong>{entry.guessed_author_name || "—"}</strong>
                      {entry.guessed_author_id && (
                        guessCorrect
                          ? <span style={{ color: "var(--success)", marginLeft: "6px" }}>Correct!</span>
                          : <span style={{ color: "var(--accent)", marginLeft: "6px" }}>Wrong</span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: "var(--text-secondary)" }}>View</span>
                </div>
              </div>
            );
          })}
        </div>

        <a href="/play" className="btn btn-secondary">Back to Play</a>
      </div>
    );
  }

  // Individual grid reveal
  const entry = entries[revealIndex];
  const rowCategories = JSON.parse(entry.row_categories) as string[];
  const colCategories = JSON.parse(entry.col_categories) as string[];
  const playerAnswers = JSON.parse(entry.answers) as string[];
  const guessCorrect = entry.guessed_author_id === entry.created_by;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => setRevealIndex(-1)} style={{ marginBottom: "16px" }}>
        Back to Summary
      </button>

      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
        Grid #{revealIndex + 1}
      </h2>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Created by</div>
            <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.1rem" }}>{entry.actual_author_name}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>You guessed</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {entry.guessed_author_name || "—"}
              {entry.guessed_author_id && (
                guessCorrect
                  ? <span style={{ color: "var(--success)", marginLeft: "8px" }}>Correct!</span>
                  : <span style={{ color: "var(--accent)", marginLeft: "8px" }}>Wrong</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Score</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{entry.correct_count}/9</div>
          </div>
        </div>
      </div>

      <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Your Answers</h3>
      <div className="pokedoku-grid" style={{ marginBottom: "32px" }}>
        <div className="grid-corner" />
        {colCategories.map(id => (
          <div key={id} className="grid-header">{getCategoryLabel(id)}</div>
        ))}
        {rowCategories.map((rowId, r) => (
          <div key={`row-${r}`} style={{ display: "contents" }}>
            <div className="grid-header">{getCategoryLabel(rowId)}</div>
            {colCategories.map((colId, c) => {
              const idx = r * 3 + c;
              const answer = playerAnswers[idx];
              const pokemon = answer ? findPokemon(answer) : null;
              const isCorrect = pokemon &&
                pokemonMatchesCategory(pokemon, rowId) &&
                pokemonMatchesCategory(pokemon, colId);
              return (
                <div key={`cell-${r}-${c}`}
                  className={`grid-cell ${answer ? (isCorrect ? "correct" : "incorrect") : ""}`}
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                >
                  {answer || "—"}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          className="btn btn-secondary"
          disabled={revealIndex === 0}
          onClick={() => setRevealIndex(i => i - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary"
          disabled={revealIndex === entries.length - 1}
          onClick={() => setRevealIndex(i => i + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>Loading...</p>}>
      <ResultsInner />
    </Suspense>
  );
}
