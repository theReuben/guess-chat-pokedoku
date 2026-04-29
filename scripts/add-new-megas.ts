/**
 * Fetches new Mega evolution form entries from the PokeAPI static mirror and
 * appends them to pokemon-data.json.
 *
 * Run with: npx tsx scripts/add-new-megas.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "src", "data", "pokemon-data.json");
const STATIC_BASE =
  "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// PokeAPI form IDs for new Mega forms introduced in Legends: Z-A and later games.
// These are the IDs not present in the original HAS_MEGA set (IDs >= 10278).
// Raichu Megas (10304-10305) and absol/garchomp/lucario -mega-z variants
// (10307, 10309, 10310) are also included.
const NEW_MEGA_FORM_IDS = [
  10278, // clefable-mega
  10279, // victreebel-mega
  10280, // starmie-mega
  10281, // dragonite-mega
  10282, // meganium-mega
  10283, // feraligatr-mega
  10284, // skarmory-mega
  10285, // froslass-mega
  10286, // emboar-mega
  10287, // excadrill-mega
  10288, // scolipede-mega
  10289, // scrafty-mega
  10290, // eelektross-mega
  10291, // chandelure-mega
  10292, // chesnaught-mega
  10293, // delphox-mega
  10294, // greninja-mega
  10295, // pyroar-mega
  10296, // floette-mega
  10297, // malamar-mega
  10298, // barbaracle-mega
  10299, // dragalge-mega
  10300, // hawlucha-mega
  10301, // zygarde-mega
  10302, // drampa-mega
  10303, // falinks-mega
  10304, // raichu-mega-x
  10305, // raichu-mega-y
  10306, // chimecho-mega
  10307, // absol-mega-z
  10308, // staraptor-mega
  10309, // garchomp-mega-z
  10310, // lucario-mega-z
  10311, // heatran-mega
  10312, // darkrai-mega
  10313, // golurk-mega
  10314, // meowstic-mega
  10315, // crabominable-mega
  10316, // golisopod-mega
  10317, // magearna-mega
  10318, // magearna-original-mega
  10319, // zeraora-mega
  10320, // scovillain-mega
  10321, // glimmora-mega
  10322, // tatsugiri-curly-mega
  10323, // tatsugiri-droopy-mega
  10324, // tatsugiri-stretchy-mega
  10325, // baxcalibur-mega
];

interface PokeAPIVariety {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  moves: { move: { name: string } }[];
  abilities: { ability: { name: string } }[];
  weight: number;
  height: number;
  species: { url: string };
}

interface PokeAPISpecies {
  id: number;
  generation: { url: string };
  egg_groups: { name: string }[];
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
}

interface PokemonEntry {
  name: string;
  dexNumber: number;
  spriteId?: number;
  types: string[];
  generation: number;
  eggGroups: string[];
  evolutionMethod: string[];
  status: string[];
  moves: string[];
  abilities: string[];
  weight: number;
  height: number;
}

function genNumber(url: string): number {
  const slug = url.split("/").filter(Boolean).pop()!;
  const num = parseInt(slug, 10);
  if (!isNaN(num) && num > 0) return num;
  const romanMap: Record<string, number> = {
    "generation-i": 1, "generation-ii": 2, "generation-iii": 3,
    "generation-iv": 4, "generation-v": 5, "generation-vi": 6,
    "generation-vii": 7, "generation-viii": 8, "generation-ix": 9,
  };
  return romanMap[slug] || 0;
}

// Format a PokeAPI slug into a display name.
// "venusaur-mega" → "Mega-Venusaur", "charizard-mega-x" → "Mega-Charizard-X"
// "tatsugiri-curly-mega" → "Tatsugiri-Curly-Mega" (kept as-is for multi-form megas)
// "absol-mega-z" → "Absol-Mega-Z"
// "kyogre-primal" → "Primal-Kyogre"
function formatMegaName(slug: string): string {
  const parts = slug.split("-");

  // Handle primal: "{base}-primal" → "Primal-{Base}"
  if (parts[parts.length - 1] === "primal") {
    const base = parts.slice(0, -1).map(capitalize).join("-");
    return `Primal-${base}`;
  }

  // Find the "mega" index
  const megaIdx = parts.indexOf("mega");
  if (megaIdx === -1) {
    // Fallback: just capitalize each part
    return parts.map(capitalize).join("-");
  }

  const baseParts = parts.slice(0, megaIdx);
  const suffix = parts.slice(megaIdx); // ["mega"] or ["mega","x"] or ["mega","z"]

  // Simple single-base-name Megas: move "mega[-x/-y/-z]" to front
  // e.g. "venusaur-mega" → "Mega-Venusaur"
  // e.g. "charizard-mega-x" → "Mega-Charizard-X"
  // e.g. "absol-mega-z" → "Absol-Mega-Z" (keep as-is, it's a new variant)
  if (baseParts.length === 1 && suffix.length <= 2) {
    const base = capitalize(baseParts[0]);
    if (suffix.length === 1) return `Mega-${base}`;
    return `Mega-${base}-${capitalize(suffix[1])}`;
  }

  // Multi-part base (e.g. "tatsugiri-curly-mega"): capitalize all parts
  return parts.map(capitalize).join("-");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function main() {
  const data: PokemonEntry[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const existingNames = new Set(data.map((p) => p.name));

  let added = 0;
  const failed: string[] = [];

  for (let i = 0; i < NEW_MEGA_FORM_IDS.length; i++) {
    const formId = NEW_MEGA_FORM_IDS[i];

    let variety: PokeAPIVariety;
    let species: PokeAPISpecies;

    try {
      variety = (await fetchJson(
        `${STATIC_BASE}/pokemon/${formId}/index.json`
      )) as PokeAPIVariety;
      await delay(100);

      const speciesId = parseInt(
        variety.species.url.split("/").filter(Boolean).pop()!,
        10
      );
      species = (await fetchJson(
        `${STATIC_BASE}/pokemon-species/${speciesId}/index.json`
      )) as PokeAPISpecies;
      await delay(100);
    } catch (err) {
      console.warn(`  Failed to fetch ID ${formId}: ${err}`);
      failed.push(String(formId));
      continue;
    }

    const name = formatMegaName(variety.name);

    if (existingNames.has(name)) {
      process.stdout.write(`\r  [${i + 1}/${NEW_MEGA_FORM_IDS.length}] Already exists: ${name}`);
      continue;
    }

    const dexNumber = species.id;
    const gen = genNumber(species.generation.url);
    const types = variety.types.map((t) => t.type.name);
    const eggGroups = species.egg_groups.map((e) => e.name);
    const moves = variety.moves.map((m) => m.move.name);
    const abilities = variety.abilities.map((a) => a.ability.name);

    const status: string[] = ["is-mega"];
    if (species.is_legendary) status.push("legendary");
    if (species.is_mythical) status.push("mythical");

    const entry: PokemonEntry = {
      name,
      dexNumber,
      spriteId: formId,
      types,
      generation: gen,
      eggGroups,
      evolutionMethod: ["has-mega"],
      status,
      moves,
      abilities,
      weight: variety.weight,
      height: variety.height,
    };

    data.push(entry);
    existingNames.add(name);
    added++;

    process.stdout.write(
      `\r  [${i + 1}/${NEW_MEGA_FORM_IDS.length}] Added: ${name.padEnd(30)}`
    );
  }

  console.log(`\n\nAdded: ${added} new Mega entries.`);
  if (failed.length > 0) {
    console.log(`Failed IDs: ${failed.join(", ")}`);
  }

  // Sort by dexNumber then spriteId
  data.sort((a, b) =>
    a.dexNumber !== b.dexNumber
      ? a.dexNumber - b.dexNumber
      : (a.spriteId ?? a.dexNumber) - (b.spriteId ?? b.dexNumber)
  );

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log("Saved updated pokemon-data.json");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
