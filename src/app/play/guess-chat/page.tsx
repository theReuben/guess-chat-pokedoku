"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getLabelForCategoryId, getFilteredPokemonNames, getPokemonSpriteUrl, findPokemon, pokemonMatchesCategory } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Entry {
  id: string;
  grid_id: string;
  answers: string;
  correct_count: number;
  guessed_author_id: string | null;
  order_index: number;
  row_categories: string;
  col_categories: string;
  example_answers: string;
}

interface GridData {
  id: string;
  row_categories: string;
  col_categories: string;
}

interface SessionData {
  id: string;
  status: string;
}

interface GridResult {
  isCorrect: boolean[];
  exampleAnswers: string[];
}

export default function GuessChatPage() {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextGrid, setNextGrid] = useState<GridData | null>(null);
  const [totalGrids, setTotalGrids] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);

  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [guessedAuthorId, setGuessedAuthorId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Result shown after submitting a grid (before moving to next)
  const [gridResult, setGridResult] = useState<GridResult | null>(null);
  const [intendedSelections, setIntendedSelections] = useState<string[]>(Array(9).fill(""));

  // Review mode: browsing through completed entries to adjust guesses
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewIntendedSelections, setReviewIntendedSelections] = useState<string[]>([]);

  const fetchSession = useCallback(() => {
    setLoading(true);
    fetch("/api/play/guess-chat")
      .then(r => {
        if (r.status === 401) {
          window.location.href = "/api/auth/discord-mobile";
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.session) {
          setSession(data.session);
          setEntries(data.entries || []);
          setNextGrid(data.nextGrid || null);
          setTotalGrids(data.totalGrids);
          setCompletedCount(data.completedCount);
          setUsers(data.users || []);

          // If session was already submitted, redirect to results
          if (data.session.status === "submitted") {
            router.push(`/play/guess-chat/results?session=${data.session.id}`);
            return;
          }
        } else {
          setSession(null);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  useEffect(() => {
    if (reviewMode && entries[reviewIndex]) {
      setReviewIntendedSelections(JSON.parse(entries[reviewIndex].example_answers) as string[]);
    }
  }, [reviewMode, reviewIndex, entries]);

  function getCategoryLabel(id: string): string {
    return getLabelForCategoryId(id);
  }

  async function submitEntry() {
    if (!nextGrid || answers.some(a => !a) || !guessedAuthorId) {
      setError("Fill all cells and pick who you think created this grid");
      return;
    }

    const nonEmpty = answers.filter(a => a);
    const unique = new Set(nonEmpty.map(a => a.toLowerCase()));
    if (unique.size < nonEmpty.length) {
      setError("You cannot use the same Pokémon more than once");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/play/guess-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gridId: nextGrid.id, answers, guessedAuthorId }),
    });

    if (res.ok) {
      const data = await res.json();
      setGridResult({ isCorrect: data.isCorrect, exampleAnswers: data.exampleAnswers });
      setIntendedSelections([...data.exampleAnswers]);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
    }
    setSubmitting(false);
  }

  function proceedToNext() {
    setGridResult(null);
    setIntendedSelections(Array(9).fill(""));
    setAnswers(Array(9).fill(""));
    setGuessedAuthorId("");
    fetchSession();
  }

  async function updateGuess(gridId: string, newGuessId: string) {
    if (!session) return;
    await fetch(`/api/play/guess-chat/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gridId, guessedAuthorId: newGuessId }),
    });
    setEntries(prev => prev.map(e =>
      e.grid_id === gridId ? { ...e, guessed_author_id: newGuessId } : e
    ));
  }

  async function submitAllGuesses() {
    if (!session) return;
    const unguessed = entries.filter(e => !e.guessed_author_id);
    if (unguessed.length > 0) {
      setError("Assign a guess to every grid before submitting");
      return;
    }

    const res = await fetch(`/api/play/guess-chat/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });

    if (res.ok) {
      router.push(`/play/guess-chat/results?session=${session.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;

  if (!session) {
    return (
      <div style={{ textAlign: "center", paddingTop: "48px" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "12px" }}>No Submissions Yet</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          Waiting for players to mark their grids as submissions.
        </p>
        <a href="/play" className="btn btn-secondary">Back</a>
      </div>
    );
  }

  const allDone = !nextGrid && entries.length > 0;

  // Review mode UI
  if (reviewMode && entries.length > 0) {
    const entry = entries[reviewIndex];
    const rowCategories = JSON.parse(entry.row_categories) as string[];
    const colCategories = JSON.parse(entry.col_categories) as string[];
    const playerAnswers = JSON.parse(entry.answers) as string[];
    const exampleAnswers = JSON.parse(entry.example_answers) as string[];

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Review Guesses</h1>
          <button className="btn btn-secondary" onClick={() => setReviewMode(false)}>
            {allDone ? "Back" : "Back to Current Grid"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "16px", color: "var(--text-secondary)" }}>
          Grid {reviewIndex + 1} of {entries.length}
        </div>

        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>Score: {entry.correct_count}/9</strong>
          </div>
          <div>
            <strong>Who created this grid?</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {users.map(u => (
                <span
                  key={u.id}
                  className={`category-chip ${entry.guessed_author_id === u.id ? "selected" : ""}`}
                  onClick={() => updateGuess(entry.grid_id, u.id)}
                  style={{ cursor: "pointer" }}
                >
                  {u.display_name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "24px" }}>
          {/* Player's answers */}
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>Your Answers</h2>
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
                    const answer = playerAnswers[idx];
                    const pokemon = answer ? findPokemon(answer) : null;
                    const correct = pokemon && pokemonMatchesCategory(pokemon, rowId) && pokemonMatchesCategory(pokemon, colId);
                    return (
                      <div key={`cell-${r}-${c}`} className={`grid-cell ${answer ? (correct ? "correct" : "incorrect") : ""}`}>
                        <div style={{ textAlign: "center", padding: "4px" }}>
                          {answer && (
                            <>
                              <img
                                src={getPokemonSpriteUrl(answer) || ""}
                                alt={answer}
                                style={{ width: "40px", height: "40px", imageRendering: "pixelated", display: "block", margin: "0 auto 2px" }}
                              />
                              <span style={{ fontSize: "0.75rem" }}>{answer}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Intended answers */}
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
                    const selectedName = reviewIntendedSelections[idx] || exampleAnswers[idx];
                    const validNames = getFilteredPokemonNames(rowId, colId);
                    return (
                      <div key={`intended-${r}-${c}`} className="grid-cell correct" style={{ flexDirection: "column", gap: "4px" }}>
                        {selectedName && (
                          <>
                            <img
                              src={getPokemonSpriteUrl(selectedName) || ""}
                              alt={selectedName}
                              style={{ width: "40px", height: "40px", imageRendering: "pixelated" }}
                            />
                            <span style={{ fontSize: "0.75rem", textAlign: "center" }}>{selectedName}</span>
                          </>
                        )}
                        <select
                          value={selectedName}
                          onChange={e => {
                            const next = [...reviewIntendedSelections];
                            next[idx] = e.target.value;
                            setReviewIntendedSelections(next);
                          }}
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
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            className="btn btn-secondary"
            disabled={reviewIndex === 0}
            onClick={() => setReviewIndex(i => i - 1)}
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            disabled={reviewIndex === entries.length - 1}
            onClick={() => setReviewIndex(i => i + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // All grids completed — review and submit
  if (allDone) {
    return (
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>All Grids Completed!</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          Review your guesses and submit when ready. You can go back and change any guess.
        </p>

        {error && (
          <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {entries.map((entry, i) => {
            const guessedUser = users.find(u => u.id === entry.guessed_author_id);
            return (
              <div key={entry.id} className="card">
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontWeight: 600 }}>Grid #{i + 1}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    Score: {entry.correct_count}/9 — Guessed: <strong>{guessedUser?.display_name || "Not set"}</strong>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "8px 14px" }}
                  onClick={() => { setReviewMode(true); setReviewIndex(i); }}
                >
                  Change Guess
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-primary" onClick={submitAllGuesses}>
            Submit All Guesses
          </button>
        </div>
      </div>
    );
  }

  // Solving a grid
  if (!nextGrid) return null;

  const rowCategories = JSON.parse(nextGrid.row_categories) as string[];
  const colCategories = JSON.parse(nextGrid.col_categories) as string[];

  // Result view after submitting current grid
  if (gridResult) {
    return (
      <div>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Guess Chat</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Grid {completedCount} of {totalGrids}
          </p>
        </div>

        <div className="card" style={{ marginBottom: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: gridResult.isCorrect.filter(Boolean).length >= 7 ? "var(--success)" : gridResult.isCorrect.filter(Boolean).length >= 4 ? "var(--warning)" : "var(--accent)" }}>
            {gridResult.isCorrect.filter(Boolean).length}/9
          </div>
          <p style={{ color: "var(--text-secondary)" }}>cells correct</p>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "24px" }}>
          {/* Player's grid */}
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>Your Answers</h2>
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
                      <div key={`cell-${r}-${c}`} className={`grid-cell ${gridResult.isCorrect[idx] ? "correct" : "incorrect"}`}>
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
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Intended answers */}
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
                    const selectedName = intendedSelections[idx] || gridResult.exampleAnswers[idx];
                    const validNames = getFilteredPokemonNames(rowId, colId);
                    return (
                      <div key={`intended-${r}-${c}`} className="grid-cell correct" style={{ flexDirection: "column", gap: "4px" }}>
                        {selectedName && (
                          <>
                            <img
                              src={getPokemonSpriteUrl(selectedName) || ""}
                              alt={selectedName}
                              style={{ width: "40px", height: "40px", imageRendering: "pixelated" }}
                            />
                            <span style={{ fontSize: "0.75rem", textAlign: "center" }}>{selectedName}</span>
                          </>
                        )}
                        <select
                          value={selectedName}
                          onChange={e => {
                            const next = [...intendedSelections];
                            next[idx] = e.target.value;
                            setIntendedSelections(next);
                          }}
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
        </div>

        <button className="btn btn-primary" onClick={proceedToNext}>
          Next Grid
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Guess Chat</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Grid {completedCount + 1} of {totalGrids}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem" }}
            onClick={() => { setReviewMode(true); setReviewIndex(entries.length - 1); }}
          >
            Review Previous ({entries.length})
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
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

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Who created this grid?</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {users.map(u => (
            <span
              key={u.id}
              className={`category-chip ${guessedAuthorId === u.id ? "selected" : ""}`}
              onClick={() => setGuessedAuthorId(u.id)}
              style={{ cursor: "pointer" }}
            >
              {u.display_name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <button
          className="btn btn-primary"
          onClick={submitEntry}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit & Next"}
        </button>
      </div>
    </div>
  );
}
