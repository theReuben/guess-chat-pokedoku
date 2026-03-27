"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CATEGORIES } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

interface GridData {
  id: string;
  round_id: string;
  row_categories: string;
  col_categories: string;
}

interface Participant {
  id: string;
  name: string;
}

export default function PlayPage() {
  const { id: gridId } = useParams<{ id: string }>();
  const router = useRouter();

  const [grid, setGrid] = useState<GridData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [guessedAuthorId, setGuessedAuthorId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correctCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to load the grid data. The grid comes from the round API.
    // First fetch the grid info from a simple endpoint
    fetch(`/api/grids/${gridId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setGrid(data.grid);
          setParticipants(data.participants);
        }
      })
      .catch(() => setError("Failed to load grid"))
      .finally(() => setLoading(false));
  }, [gridId]);

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function submitSolution() {
    if (answers.some(a => !a)) {
      setError("Fill in all 9 cells");
      return;
    }
    if (!guessedAuthorId) {
      setError("Pick who you think created this grid");
      return;
    }

    setSubmitting(true);
    setError("");

    const guessedAuthor = participants.find(p => p.id === guessedAuthorId);

    const res = await fetch(`/api/grids/${gridId}/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        guessedAuthorId,
        guessedAuthorName: guessedAuthor?.name || "Unknown",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
      setSubmitting(false);
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;
  if (error && !grid) return <p style={{ color: "var(--accent)" }}>{error}</p>;
  if (!grid) return <p>Grid not found</p>;

  const rowCategories = JSON.parse(grid.row_categories) as string[];
  const colCategories = JSON.parse(grid.col_categories) as string[];

  if (result) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "16px" }}>
          Solution Submitted!
        </h1>
        <div style={{ fontSize: "4rem", fontWeight: 800, color: "var(--success)", marginBottom: "8px" }}>
          {result.correctCount}/9
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          cells correct. Results will be fully revealed when the round ends!
        </p>
        <a href={`/rounds/${grid.round_id}`} className="btn btn-primary">
          Back to Round
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>
        Solve This Grid
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
        Fill each cell with a Pokémon matching both categories, then guess who made it!
      </p>

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
          <>
            <div key={`rh-${rowId}`} className="grid-header">{getCategoryLabel(rowId)}</div>
            {colCategories.map((_colId, c) => {
              const idx = r * 3 + c;
              return (
                <div key={`cell-${r}-${c}`} className={`grid-cell ${answers[idx] ? "filled" : ""}`}>
                  <PokemonAutocomplete
                    value={answers[idx]}
                    onChange={name => {
                      const newAnswers = [...answers];
                      newAnswers[idx] = name;
                      setAnswers(newAnswers);
                    }}
                  />
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Author Guess */}
      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>
          Who do you think created this grid?
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {participants.map(p => (
            <span
              key={p.id}
              className={`category-chip ${guessedAuthorId === p.id ? "selected" : ""}`}
              onClick={() => setGuessedAuthorId(p.id)}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <button
          className="btn btn-primary"
          onClick={submitSolution}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Solution"}
        </button>
      </div>
    </div>
  );
}
