"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CATEGORIES, hasValidAnswer } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";
import { Suspense } from "react";

function CreateGridInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roundId = searchParams.get("roundId");

  const [step, setStep] = useState<"categories" | "answers">("categories");
  const [rowCategories, setRowCategories] = useState<string[]>([]);
  const [colCategories, setColCategories] = useState<string[]>([]);
  const [selecting, setSelecting] = useState<"row" | "col">("row");
  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = new Set([...rowCategories, ...colCategories]);

  function toggleCategory(id: string) {
    if (selecting === "row") {
      if (rowCategories.includes(id)) {
        setRowCategories(prev => prev.filter(c => c !== id));
      } else if (rowCategories.length < 3) {
        setRowCategories(prev => [...prev, id]);
      }
    } else {
      if (colCategories.includes(id)) {
        setColCategories(prev => prev.filter(c => c !== id));
      } else if (colCategories.length < 3) {
        setColCategories(prev => [...prev, id]);
      }
    }
  }

  function proceedToAnswers() {
    // Validate that each cell has at least one valid answer
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!hasValidAnswer(rowCategories[r], colCategories[c])) {
          setError(`No valid Pokémon exists for ${getCategoryLabel(rowCategories[r])} × ${getCategoryLabel(colCategories[c])}`);
          return;
        }
      }
    }
    setError("");
    setStep("answers");
  }

  function getCategoryLabel(id: string): string {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  async function submitGrid() {
    if (answers.some(a => !a)) {
      setError("Fill in all 9 cells");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/grids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, rowCategories, colCategories, answers }),
    });
    if (res.ok) {
      router.push(`/rounds/${roundId}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
      setSubmitting(false);
    }
  }

  if (!roundId) {
    return <p style={{ color: "var(--accent)" }}>Missing roundId parameter</p>;
  }

  // Group categories by type for display
  const categoryGroups = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORIES>);

  const groupLabels: Record<string, string> = {
    type: "Types",
    generation: "Generations",
    egg_group: "Egg Groups",
    evolution: "Evolution",
    status: "Status",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "24px" }}>
        Create Your Grid
      </h1>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
        </div>
      )}

      {step === "categories" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <button
              className={`btn ${selecting === "row" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelecting("row")}
            >
              Row Categories ({rowCategories.length}/3)
            </button>
            <button
              className={`btn ${selecting === "col" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelecting("col")}
            >
              Column Categories ({colCategories.length}/3)
            </button>
          </div>

          {Object.entries(categoryGroups).map(([type, cats]) => (
            <div key={type} style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                {groupLabels[type] || type}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {cats.map(cat => {
                  const isSelected = rowCategories.includes(cat.id) || colCategories.includes(cat.id);
                  const isDisabled = selectedIds.has(cat.id) && !((selecting === "row" && rowCategories.includes(cat.id)) || (selecting === "col" && colCategories.includes(cat.id)));
                  const isCurrentSelection = selecting === "row" ? rowCategories.includes(cat.id) : colCategories.includes(cat.id);
                  return (
                    <span
                      key={cat.id}
                      className={`category-chip ${isCurrentSelection ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                      onClick={() => !isDisabled && toggleCategory(cat.id)}
                    >
                      {cat.label}
                      {isSelected && !isCurrentSelection && " ✓"}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Preview */}
          {(rowCategories.length > 0 || colCategories.length > 0) && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Preview</h3>
              <div style={{ marginBottom: "8px" }}>
                <strong>Rows:</strong>{" "}
                {rowCategories.map(id => getCategoryLabel(id)).join(", ") || "—"}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong>Columns:</strong>{" "}
                {colCategories.map(id => getCategoryLabel(id)).join(", ") || "—"}
              </div>
              {rowCategories.length === 3 && colCategories.length === 3 && (
                <button className="btn btn-primary" onClick={proceedToAnswers}>
                  Continue to Fill Answers
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {step === "answers" && (
        <div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Fill each cell with a Pokémon that matches both the row and column category.
          </p>

          <div className="pokedoku-grid">
            {/* Corner */}
            <div className="grid-corner" />
            {/* Column headers */}
            {colCategories.map(id => (
              <div key={id} className="grid-header">{getCategoryLabel(id)}</div>
            ))}

            {/* Rows */}
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

          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setStep("categories")}>
              Back to Categories
            </button>
            <button
              className="btn btn-primary"
              onClick={submitGrid}
              disabled={submitting || answers.some(a => !a)}
            >
              {submitting ? "Submitting..." : "Submit Grid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>Loading...</p>}>
      <CreateGridInner />
    </Suspense>
  );
}
