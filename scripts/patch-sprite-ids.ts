/**
 * Patches pokemon-data.json to add spriteId for alternate-form entries.
 * For base Pokémon, dexNumber == PokeAPI ID so no spriteId is needed.
 * For forms (regional variants, Mega evolutions, etc.), PokeAPI uses IDs in
 * the 10000+ range — we fetch just those IDs and patch them in.
 *
 * Run with: npx tsx scripts/patch-sprite-ids.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "src", "data", "pokemon-data.json");

// Use the PokeAPI static data mirror on GitHub (doesn't require pokeapi.co access)
const POKEAPI_STATIC =
  "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/pokemon/index.json";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Overrides for stored names whose slugs don't follow the default lowercasing rule
const SLUG_OVERRIDES: Record<string, string> = {
  // Tauros Paldean forms use "-breed" suffix in PokeAPI
  "Tauros-Paldea-Combat": "tauros-paldea-combat-breed",
  "Tauros-Paldea-Blaze":  "tauros-paldea-blaze-breed",
  "Tauros-Paldea-Aqua":   "tauros-paldea-aqua-breed",
  // Darmanitan Galar uses "-standard" for the non-zen form
  "Darmanitan-Galar": "darmanitan-galar-standard",
  // Female-form names use "-female" in PokeAPI
  "Meowstic-F":    "meowstic-female",
  "Indeedee-F":    "indeedee-female",
  "Basculegion-F": "basculegion-female",
  "Oinkologne-F":  "oinkologne-female",
  // Oricorio: Pom-Pom has a double-hyphen in PokeAPI
  "Oricorio-Pompom": "oricorio-pom-pom",
  // Minior core form - use the red core as canonical sprite
  "Minior-Core": "minior-red",
  // Necrozma fusions: shorter names in PokeAPI
  "Necrozma-Dawn-Wings": "necrozma-dawn",
  "Necrozma-Dusk-Mane":  "necrozma-dusk",
  // Calyrex fusions: shorter names in PokeAPI
  "Calyrex-Ice-Rider":    "calyrex-ice",
  "Calyrex-Shadow-Rider": "calyrex-shadow",
};

// Convert a stored display name back to a PokeAPI Pokemon slug.
// Examples:
//   "Mega-Venusaur"    → "venusaur-mega"
//   "Mega-Charizard-X" → "charizard-mega-x"
//   "Primal-Kyogre"    → "kyogre-primal"
//   "Vulpix-Alola"     → "vulpix-alola"
//   "Deoxys-Attack"    → "deoxys-attack"
function nameToSlug(name: string): string {
  if (name in SLUG_OVERRIDES) return SLUG_OVERRIDES[name];

  if (name.startsWith("Mega-")) {
    const rest = name.slice(5).toLowerCase(); // e.g. "venusaur" or "charizard-x"
    const parts = rest.split("-");
    if (parts.length === 2 && (parts[1] === "x" || parts[1] === "y")) {
      return `${parts[0]}-mega-${parts[1]}`;
    }
    return `${rest}-mega`;
  }
  if (name.startsWith("Primal-")) {
    return name.slice(7).toLowerCase() + "-primal";
  }
  return name.toLowerCase();
}

interface PokemonEntry {
  name: string;
  dexNumber: number;
  spriteId?: number;
  [key: string]: unknown;
}

async function main() {
  console.log("Fetching PokeAPI form list from static mirror...");

  const listing = (await fetchJson(POKEAPI_STATIC)) as {
    results: { name: string; url: string }[];
  };

  // Build slug → id map for all alternate forms (id >= 10001)
  const formIdMap = new Map<string, number>();
  for (const entry of listing.results) {
    const id = parseInt(entry.url.split("/").filter(Boolean).pop()!, 10);
    if (id >= 10001) {
      formIdMap.set(entry.name, id);
    }
  }
  console.log(`Found ${formIdMap.size} alternate form entries from PokeAPI.`);

  const data: PokemonEntry[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  let patched = 0;
  let skipped = 0;
  const notFound: string[] = [];

  for (const entry of data) {
    // Skip entries that already have a spriteId
    if (entry.spriteId !== undefined) continue;

    // Base Pokémon (no hyphens) don't need a spriteId
    if (!entry.name.includes("-")) continue;

    const slug = nameToSlug(entry.name);
    const id = formIdMap.get(slug);

    if (id !== undefined && id !== entry.dexNumber) {
      entry.spriteId = id;
      patched++;
    } else if (id === undefined) {
      notFound.push(`${entry.name} → ${slug}`);
      skipped++;
    } else {
      // id === dexNumber, no spriteId needed
      skipped++;
    }
  }

  console.log(`Patched: ${patched}, Skipped/same-id: ${skipped}`);
  if (notFound.length > 0) {
    console.log(`Not found in PokeAPI (${notFound.length}):`);
    notFound.forEach((n) => console.log("  ", n));
  }

  const newData = JSON.stringify(data, null, 2);
  writeFileSync(DATA_PATH, newData);
  console.log("Saved updated pokemon-data.json");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
