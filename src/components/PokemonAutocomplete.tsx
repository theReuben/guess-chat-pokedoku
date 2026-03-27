"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { getAllPokemonNames, getPokemonSpriteUrl } from "@/data/pokemon";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  /** Pre-filtered list of Pokémon names to suggest from */
  filteredNames?: string[];
}

export default function PokemonAutocomplete({ value, onChange, placeholder, filteredNames }: Props) {
  const names = useMemo(() => filteredNames || getAllPokemonNames(), [filteredNames]);
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(val: string) {
    setInput(val);
    if (val.length > 0) {
      const filtered = names.filter(n =>
        n.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
      setHighlighted(0);
    } else {
      setOpen(false);
      setSuggestions([]);
    }
  }

  function select(name: string) {
    setInput(name);
    onChange(name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlighted]) select(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const spriteUrl = value ? getPokemonSpriteUrl(value) : null;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {spriteUrl && (
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <img
            src={spriteUrl}
            alt={value}
            style={{ width: "48px", height: "48px", imageRendering: "pixelated" }}
          />
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => input.length > 0 && suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type a Pokémon..."}
        style={{ fontSize: "0.8rem", padding: "6px 8px" }}
      />
      {open && (
        <div className="autocomplete-dropdown">
          {suggestions.map((name, i) => (
            <div
              key={name}
              className={`autocomplete-item ${i === highlighted ? "highlighted" : ""}`}
              onClick={() => select(name)}
              style={{ display: "flex", alignItems: "center" }}
            >
              <img
                src={getPokemonSpriteUrl(name) || ""}
                alt=""
                style={{ width: "24px", height: "24px", marginRight: "8px", imageRendering: "pixelated" }}
              />
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
