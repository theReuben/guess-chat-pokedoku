"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, hasValidAnswer } from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

export default function CreatePage() {
  const router = useRouter();

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
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!hasValidAnswer(rowCategories[r], colCategories[c])) {
          setError(`No valid Pokémon exists for ${getCategoryLabel(rowCategories[r])} x ${getCategoryLabel(colCategories[c])}`);
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
      body: JSON.stringify({ rowCategories, colCategories, exampleAnswers: answers }),
    });
    if (res.ok) {
      router.push("/manage");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
      setSubmitting(false);
    }
  }

  const categoryGroups = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORIES>);

  const groupLabels: Record<string, string> = {
    type: "Types", generation: "Generations", egg_group: "Egg Groups",
    evolution: "Evolution", status: "Status",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>Create a Grid</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
        {step === "categories"
          ? "Pick 3 row and 3 column categories, then provide an example solution to prove it's solvable."
          : "Fill each cell with a Pokémon matching both its row and column category."
        }
      </p>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
        </div>
      )}

      {step === "categories" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <button className={`btn ${selecting === "row" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelecting("row")}>
              Rows ({rowCategories.length}/3)
            </button>
            <button className={`btn ${selecting === "col" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelecting("col")}>
              Columns ({colCategories.length}/3)
            </button>
          </div>

          {Object.entries(categoryGroups).map(([type, cats]) => (
            <div key={type} style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                {groupLabels[type] || type}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {cats.map(cat => {
                  const isCurrentSelection = selecting === "row" ? rowCategories.includes(cat.id) : colCategories.includes(cat.id);
                  const isOtherSelection = selecting === "row" ? colCategories.includes(cat.id) : rowCategories.includes(cat.id);
                  const isDisabled = isOtherSelection;
                  return (
                    <span
                      key={cat.id}
                      className={`category-chip ${isCurrentSelection ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                      onClick={() => !isDisabled && toggleCategory(cat.id)}
                    >
                      {cat.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {rowCategories.length > 0 || colCategories.length > 0 ? (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>Preview</h3>
              <div style={{ marginBottom: "8px" }}>
                <strong>Rows:</strong> {rowCategories.map(id => getCategoryLabel(id)).join(", ") || "—"}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong>Columns:</strong> {colCategories.map(id => getCategoryLabel(id)).join(", ") || "—"}
              </div>
              {rowCategories.length === 3 && colCategories.length === 3 && (
                <button className="btn btn-primary" onClick={proceedToAnswers}>
                  Next: Provide Example Solution
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {step === "answers" && (
        <div>
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

          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setStep("categories")}>Back</button>
            <button
              className="btn btn-primary"
              onClick={submitGrid}
              disabled={submitting || answers.some(a => !a)}
            >
              {submitting ? "Creating..." : "Create Grid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
