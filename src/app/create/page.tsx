"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  hasValidAnswer,
  getFilteredPokemonNames,
  getLabelForCategoryId,
  getAllMoveNames,
  getAllAbilityNames,
} from "@/data/pokemon";
import PokemonAutocomplete from "@/components/PokemonAutocomplete";

// Format a PokéAPI slug like "hydro-pump" → "Hydro Pump"
function formatSlug(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CreatePage() {
  const router = useRouter();

  const [rowCategories, setRowCategories] = useState<(string | null)[]>([null, null, null]);
  const [colCategories, setColCategories] = useState<(string | null)[]>([null, null, null]);
  const [answers, setAnswers] = useState<string[]>(Array(9).fill(""));
  const [pickingSlot, setPickingSlot] = useState<{ axis: "row" | "col"; index: number } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [moveSearch, setMoveSearch] = useState("");
  const [abilitySearch, setAbilitySearch] = useState("");

  // Reset search inputs when opening a new picker slot
  useEffect(() => {
    if (pickingSlot) {
      setMoveSearch("");
      setAbilitySearch("");
    }
  }, [pickingSlot?.axis, pickingSlot?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIds = new Set([
    ...rowCategories.filter(Boolean) as string[],
    ...colCategories.filter(Boolean) as string[],
  ]);

  // All answers currently used, for excluding from other cells
  const usedAnswers = useMemo(() => new Set(answers.filter(Boolean)), [answers]);
  void usedAnswers;

  // Lazily compute move/ability lists (only populated once data is loaded)
  const allMoveNames = useMemo(() => getAllMoveNames(), []);
  const allAbilityNames = useMemo(() => getAllAbilityNames(), []);

  function getCategoryLabel(id: string | null): string {
    if (!id) return "";
    return getLabelForCategoryId(id);
  }

  function selectCategory(id: string) {
    if (!pickingSlot) return;
    const { axis, index } = pickingSlot;
    if (axis === "row") {
      const next = [...rowCategories];
      next[index] = id;
      setRowCategories(next);
      const nextAnswers = [...answers];
      for (let c = 0; c < 3; c++) nextAnswers[index * 3 + c] = "";
      setAnswers(nextAnswers);
    } else {
      const next = [...colCategories];
      next[index] = id;
      setColCategories(next);
      const nextAnswers = [...answers];
      for (let r = 0; r < 3; r++) nextAnswers[r * 3 + index] = "";
      setAnswers(nextAnswers);
    }
    setPickingSlot(null);
    setError("");
  }

  function clearCategory(axis: "row" | "col", index: number) {
    if (axis === "row") {
      const next = [...rowCategories];
      next[index] = null;
      setRowCategories(next);
      const nextAnswers = [...answers];
      for (let c = 0; c < 3; c++) nextAnswers[index * 3 + c] = "";
      setAnswers(nextAnswers);
    } else {
      const next = [...colCategories];
      next[index] = null;
      setColCategories(next);
      const nextAnswers = [...answers];
      for (let r = 0; r < 3; r++) nextAnswers[r * 3 + index] = "";
      setAnswers(nextAnswers);
    }
  }

  function getFilteredNamesForCell(row: number, col: number): string[] | undefined {
    const rowCat = rowCategories[row];
    const colCat = colCategories[col];
    if (!rowCat && !colCat) return undefined;
    const otherAnswers = new Set(
      answers.filter((a, i) => a && i !== row * 3 + col)
    );
    return getFilteredPokemonNames(rowCat || undefined, colCat || undefined, otherAnswers);
  }

  const allCategoriesSet = rowCategories.every(Boolean) && colCategories.every(Boolean);
  const allAnswersFilled = answers.every(a => a);

  function validate(): string | null {
    const rows = rowCategories as string[];
    const cols = colCategories as string[];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!hasValidAnswer(rows[r], cols[c])) {
          return `No valid Pokémon exists for ${getCategoryLabel(rows[r])} x ${getCategoryLabel(cols[c])}`;
        }
      }
    }
    return null;
  }

  async function submitGrid() {
    if (!allCategoriesSet || !allAnswersFilled) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError("");
    const res = await fetch("/api/grids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowCategories: rowCategories as string[],
        colCategories: colCategories as string[],
        exampleAnswers: answers,
      }),
    });
    if (res.ok) {
      router.push("/manage");
    } else if (res.status === 401) {
      window.location.href = "/api/auth/signin";
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
      setSubmitting(false);
    }
  }

  // Static category groups (everything except move/ability which are searchable)
  const staticCategoryGroups = CATEGORIES.reduce((acc, cat) => {
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
    weakness: "Weak to",
    resistance: "Resists",
    weight: "Weight",
    height: "Height",
  };

  // Determine if the current slot's category is a move or ability
  const currentCatId = pickingSlot
    ? (pickingSlot.axis === "row" ? rowCategories[pickingSlot.index] : colCategories[pickingSlot.index])
    : null;

  // Filtered results for the search inputs (require at least 2 chars)
  const filteredMoves = moveSearch.length >= 2
    ? allMoveNames.filter(m => m.includes(moveSearch.toLowerCase())).slice(0, 30)
    : [];
  const filteredAbilities = abilitySearch.length >= 2
    ? allAbilityNames.filter(a => a.includes(abilitySearch.toLowerCase())).slice(0, 30)
    : [];

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>Create a Grid</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
        Click the row/column headers to set categories, then fill each cell with a Pokémon matching both.
      </p>

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid var(--accent)", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "var(--accent)" }}>
          {error}
        </div>
      )}

      {/* The Grid */}
      <div className="pokedoku-grid">
        <div className="grid-corner" />

        {/* Column headers */}
        {colCategories.map((catId, c) => (
          <div
            key={`col-${c}`}
            className="grid-header grid-header-clickable"
            onClick={() => setPickingSlot({ axis: "col", index: c })}
            style={{ cursor: "pointer" }}
          >
            {catId ? (
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {getCategoryLabel(catId)}
                <button
                  onClick={(e) => { e.stopPropagation(); clearCategory("col", c); }}
                  style={{ fontSize: "0.7rem", opacity: 0.6, background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  x
                </button>
              </span>
            ) : (
              <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>+ Col {c + 1}</span>
            )}
          </div>
        ))}

        {/* Rows */}
        {rowCategories.map((rowCatId, r) => (
          <div key={`row-${r}`} style={{ display: "contents" }}>
            <div
              className="grid-header grid-header-clickable"
              onClick={() => setPickingSlot({ axis: "row", index: r })}
              style={{ cursor: "pointer" }}
            >
              {rowCatId ? (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {getCategoryLabel(rowCatId)}
                  <button
                    onClick={(e) => { e.stopPropagation(); clearCategory("row", r); }}
                    style={{ fontSize: "0.7rem", opacity: 0.6, background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}
                  >
                    x
                  </button>
                </span>
              ) : (
                <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>+ Row {r + 1}</span>
              )}
            </div>
            {colCategories.map((colCatId, c) => {
              const idx = r * 3 + c;
              const hasBothCategories = !!rowCatId && !!colCatId;
              return (
                <div key={`cell-${r}-${c}`} className={`grid-cell ${answers[idx] ? "filled" : ""}`}>
                  {hasBothCategories ? (
                    <PokemonAutocomplete
                      value={answers[idx]}
                      onChange={name => {
                        const next = [...answers];
                        next[idx] = name;
                        setAnswers(next);
                      }}
                      filteredNames={getFilteredNamesForCell(r, c)}
                    />
                  ) : (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center" }}>
                      Set categories
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Category Picker Modal */}
      {pickingSlot && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setPickingSlot(null)}>
          <div className="card" style={{ maxWidth: "540px", width: "90%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: "16px" }}>
              Pick {pickingSlot.axis === "row" ? "Row" : "Column"} {pickingSlot.index + 1} Category
            </h3>

            {/* Static groups (chips) */}
            {Object.entries(staticCategoryGroups).map(([type, cats]) => (
              <div key={type} style={{ marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                  {groupLabels[type] || type}
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {cats.map(cat => {
                    const isUsed = selectedIds.has(cat.id);
                    const isCurrent = currentCatId === cat.id;
                    return (
                      <span
                        key={cat.id}
                        className={`category-chip ${isCurrent ? "selected" : ""} ${isUsed && !isCurrent ? "disabled" : ""}`}
                        onClick={() => !isUsed || isCurrent ? selectCategory(cat.id) : undefined}
                      >
                        {cat.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Can Learn Move — searchable */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                Can Learn Move
              </h4>
              {allMoveNames.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  Run <code>npm run fetch-pokemon</code> to enable move filtering.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search moves… (e.g. surf, flamethrower)"
                    value={moveSearch}
                    onChange={e => setMoveSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      border: "1px solid var(--border)", background: "var(--bg-secondary)",
                      color: "var(--text-primary)", fontSize: "0.9rem", marginBottom: "8px",
                      boxSizing: "border-box",
                    }}
                    autoFocus={false}
                  />
                  {moveSearch.length < 2 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                      Type at least 2 characters to search.
                    </p>
                  )}
                  {moveSearch.length >= 2 && filteredMoves.length === 0 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                      No moves found.
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {filteredMoves.map(move => {
                      const catId = `move-${move}`;
                      const isUsed = selectedIds.has(catId);
                      const isCurrent = currentCatId === catId;
                      return (
                        <span
                          key={catId}
                          className={`category-chip ${isCurrent ? "selected" : ""} ${isUsed && !isCurrent ? "disabled" : ""}`}
                          onClick={() => !isUsed || isCurrent ? selectCategory(catId) : undefined}
                        >
                          {formatSlug(move)}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Has Ability — searchable */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                Has Ability
              </h4>
              {allAbilityNames.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  Run <code>npm run fetch-pokemon</code> to enable ability filtering.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search abilities… (e.g. levitate, intimidate)"
                    value={abilitySearch}
                    onChange={e => setAbilitySearch(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      border: "1px solid var(--border)", background: "var(--bg-secondary)",
                      color: "var(--text-primary)", fontSize: "0.9rem", marginBottom: "8px",
                      boxSizing: "border-box",
                    }}
                    autoFocus={false}
                  />
                  {abilitySearch.length < 2 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                      Type at least 2 characters to search.
                    </p>
                  )}
                  {abilitySearch.length >= 2 && filteredAbilities.length === 0 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                      No abilities found.
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {filteredAbilities.map(ability => {
                      const catId = `ability-${ability}`;
                      const isUsed = selectedIds.has(catId);
                      const isCurrent = currentCatId === catId;
                      return (
                        <span
                          key={catId}
                          className={`category-chip ${isCurrent ? "selected" : ""} ${isUsed && !isCurrent ? "disabled" : ""}`}
                          onClick={() => !isUsed || isCurrent ? selectCategory(catId) : undefined}
                        >
                          {formatSlug(ability)}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-secondary" style={{ marginTop: "8px" }} onClick={() => setPickingSlot(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
        <button
          className="btn btn-primary"
          onClick={submitGrid}
          disabled={submitting || !allCategoriesSet || !allAnswersFilled}
        >
          {submitting ? "Creating..." : "Create Grid"}
        </button>
      </div>
    </div>
  );
}
