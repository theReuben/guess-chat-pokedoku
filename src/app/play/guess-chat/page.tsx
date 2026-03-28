"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/data/pokemon";
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

export default function GuessChatPage() {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextGrid, setNextGrid] = useState<GridData | null>(null);
  const [totalGrids, setTotalGrids] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [hasOwnSubmission, setHasOwnSubmission] = useState(false);

  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [guessedAuthorId, setGuessedAuthorId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Review mode: browsing through completed entries to adjust guesses
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

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
          setHasOwnSubmission(false);

          // If session was already submitted, redirect to results
          if (data.session.status === "submitted") {
            router.push(`/play/guess-chat/results?session=${data.session.id}`);
            return;
          }
        } else {
          setSession(null);
          setHasOwnSubmission(!!data.hasOwnSubmission);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function submitEntry() {
    if (!nextGrid || answers.some(a => !a) || !guessedAuthorId) {
      setError("Fill all cells and pick who you think created this grid");
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
      setAnswers(Array(9).fill(""));
      setGuessedAuthorId("");
      fetchSession();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
    }
    setSubmitting(false);
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
        <h2 style={{ fontWeight: 700, marginBottom: "12px" }}>
          {hasOwnSubmission ? "Your grid is submitted!" : "No Submissions Yet"}
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          {hasOwnSubmission
            ? "You can't play your own submission — waiting for other players to submit their grids."
            : "Waiting for players to mark their grids as submissions."}
        </p>
        <a href="/play" className="btn btn-secondary">Back</a>
      </div>
    );
  }

  const allDone = !nextGrid && entries.length > 0;

  // Review mode UI
  if (reviewMode && entries.length > 0) {
    const entry = entries[reviewIndex];
    // We need grid data for review — we stored it in the entry from the API
    // Actually we don't have row/col categories in entries. Let me show a simpler review.
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Review Guesses</h1>
          <button className="btn btn-secondary" onClick={() => setReviewMode(false)}>
            Back
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "16px", color: "var(--text-secondary)" }}>
          Grid {reviewIndex + 1} of {entries.length}
        </div>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>Your score:</strong> {entry.correct_count}/9
          </div>
          <div>
            <strong>Your guess:</strong>
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

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Guess Chat</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Grid {completedCount + 1} of {totalGrids}
        </p>
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
