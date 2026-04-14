/**
 * Fetches Pokémon data from PokéAPI and saves it as a JSON file.
 * Run with: npx tsx scripts/fetch-pokemon.ts
 *
 * Fetches all Pokémon species and their:
 * - Types
 * - Generation
 * - Egg groups
 * - Evolution methods (from evolution chains)
 * - Status (legendary, mythical, baby)
 *
 * Additional statuses like starter, fossil, pseudo-legendary, ultra beast,
 * and paradox are hardcoded since PokéAPI doesn't categorize them.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const API_BASE = "https://pokeapi.co/api/v2";
const OUTPUT_PATH = join(__dirname, "..", "src", "data", "pokemon-data.json");

// Rate limiting: PokéAPI asks for fair use. We batch with small delays.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

// --- Hardcoded lists for statuses PokéAPI doesn't directly provide ---

const STARTERS = new Set([
  // Gen 1
  1, 4, 7,
  // Gen 2
  152, 155, 158,
  // Gen 3
  252, 255, 258,
  // Gen 4
  387, 390, 393,
  // Gen 5
  495, 498, 501,
  // Gen 6
  650, 653, 656,
  // Gen 7
  722, 725, 728,
  // Gen 8
  810, 813, 816,
  // Gen 9
  906, 909, 912,
]);

const FOSSILS = new Set([
  138, 140, 142, // Omanyte, Kabuto, Aerodactyl
  345, 347, // Lileep, Anorith
  408, 410, // Cranidos, Shieldon
  564, 566, // Tirtouga, Archen
  696, 698, // Tyrunt, Amaura
  880, 881, 882, 883, // Galar fossils
  // Include evolutions
  139, 141, 346, 348, 409, 411, 565, 567, 697, 699,
]);

const PSEUDO_LEGENDARIES = new Set([
  149, // Dragonite
  248, // Tyranitar
  373, // Salamence
  376, // Metagross
  445, // Garchomp
  635, // Hydreigon
  706, // Goodra
  784, // Kommo-o
  887, // Dragapult
  998, // Baxcalibur
  // Include full lines
  147, 148, // Dratini, Dragonair
  246, 247, // Larvitar, Pupitar
  371, 372, // Bagon, Shelgon
  374, 375, // Beldum, Metang
  443, 444, // Gible, Gabite
  633, 634, // Deino, Zweilous
  704, 705, // Goomy, Sliggoo
  782, 783, // Jangmo-o, Hakamo-o
  885, 886, // Dreepy, Drakloak
  996, 997, // Frigibax, Arctibax
]);

const ULTRA_BEASTS = new Set([
  793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806,
]);

const PARADOX_POKEMON = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995,
  1005, 1006, 1007, 1008, 1009, 1010,
  1020, 1021, 1022, 1023,
]);

// --- Evolution method extraction ---

interface EvolutionDetail {
  trigger: { name: string };
  item?: { name: string } | null;
  min_happiness?: number | null;
  min_level?: number | null;
  held_item?: { name: string } | null;
}

interface EvolutionLink {
  species: { name: string; url: string };
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionLink[];
}

// Maps from species name to their evolution methods
function extractEvolutionMethods(
  chain: EvolutionLink,
  result: Map<number, Set<string>>
) {
  const speciesId = parseInt(chain.species.url.split("/").filter(Boolean).pop()!);

  if (!result.has(speciesId)) {
    result.set(speciesId, new Set());
  }

  // If this Pokémon has no evolutions from it, it might be a final form or standalone
  if (chain.evolves_to.length === 0 && chain.evolution_details.length === 0) {
    result.get(speciesId)!.add("none");
  }

  for (const evo of chain.evolves_to) {
    const evoId = parseInt(evo.species.url.split("/").filter(Boolean).pop()!);
    if (!result.has(evoId)) {
      result.set(evoId, new Set());
    }

    for (const detail of evo.evolution_details) {
      const trigger = detail.trigger.name;

      if (trigger === "level-up") {
        if (detail.min_happiness) {
          result.get(evoId)!.add("friendship");
        } else {
          result.get(evoId)!.add("level");
        }
      } else if (trigger === "trade") {
        result.get(evoId)!.add("trade");
      } else if (trigger === "use-item") {
        // Check if it's an evolution stone
        const itemName = detail.item?.name || "";
        if (
          itemName.includes("stone") ||
          itemName === "ice-stone" ||
          itemName === "shiny-stone" ||
          itemName === "dusk-stone" ||
          itemName === "dawn-stone"
        ) {
          result.get(evoId)!.add("stone");
        } else {
          result.get(evoId)!.add("item");
        }
      } else {
        result.get(evoId)!.add("other");
      }
    }

    // Recurse
    extractEvolutionMethods(evo, result);
  }
}

// --- Mega evolution detection ---
// Pokémon that have mega evolutions (by national dex number)
const HAS_MEGA = new Set([
  3, 6, 9, 15, 18, 65, 80, 94, 115, 127, 130, 142, 150, 181, 208, 212, 214,
  229, 248, 254, 257, 260, 282, 302, 303, 306, 308, 310, 319, 323, 334, 354,
  359, 362, 373, 376, 380, 381, 384, 428, 445, 448, 460, 475, 531, 719,
]);

// --- Main fetch logic ---

interface PokemonEntry {
  name: string;
  dexNumber: number;
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

async function main() {
  console.log("Fetching Pokémon species list...");

  // Fetch all species (paginated)
  let allSpeciesUrls: { name: string; url: string }[] = [];
  let nextUrl: string | null = `${API_BASE}/pokemon-species?limit=100`;

  while (nextUrl) {
    const data = (await fetchJson(nextUrl)) as {
      next: string | null;
      results: { name: string; url: string }[];
    };
    allSpeciesUrls = allSpeciesUrls.concat(data.results);
    nextUrl = data.next;
    if (nextUrl) await delay(100);
  }

  console.log(`Found ${allSpeciesUrls.length} species. Fetching details...`);

  // Fetch all evolution chains (there are ~500 of them)
  console.log("Fetching evolution chains...");
  let allChainUrls: { url: string }[] = [];
  let nextChainUrl: string | null = `${API_BASE}/evolution-chain?limit=100`;

  while (nextChainUrl) {
    const data = (await fetchJson(nextChainUrl)) as {
      next: string | null;
      results: { url: string }[];
    };
    allChainUrls = allChainUrls.concat(data.results);
    nextChainUrl = data.next;
    if (nextChainUrl) await delay(100);
  }

  console.log(`Fetching ${allChainUrls.length} evolution chains...`);
  const evoMethods = new Map<number, Set<string>>();

  // Process evolution chains in batches of 20
  for (let i = 0; i < allChainUrls.length; i += 20) {
    const batch = allChainUrls.slice(i, i + 20);
    const chains = await Promise.all(
      batch.map((c) => fetchJson(c.url).catch(() => null))
    );
    for (const chainData of chains) {
      if (!chainData) continue;
      const typed = chainData as { chain: EvolutionLink };
      extractEvolutionMethods(typed.chain, evoMethods);
    }
    if (i + 20 < allChainUrls.length) {
      process.stdout.write(
        `\r  Chains: ${Math.min(i + 20, allChainUrls.length)}/${allChainUrls.length}`
      );
      await delay(200);
    }
  }
  console.log("\n  Evolution chains done.");

  // Generation number from generation URL or name slug.
  // PokéAPI returns URLs like ".../generation/1/" (numeric IDs) for the
  // species endpoint, but the generation name slug ("generation-i") was
  // used in older API versions. Support both formats.
  function genNumber(genUrlOrSlug: string): number {
    const slug = genUrlOrSlug.split("/").filter(Boolean).pop()!;
    // Numeric URL suffix (current PokéAPI format: .../generation/1/)
    const num = parseInt(slug, 10);
    if (!isNaN(num) && num > 0) return num;
    // Roman-numeral name slug (e.g. "generation-i")
    const romanMap: Record<string, number> = {
      "generation-i": 1,
      "generation-ii": 2,
      "generation-iii": 3,
      "generation-iv": 4,
      "generation-v": 5,
      "generation-vi": 6,
      "generation-vii": 7,
      "generation-viii": 8,
      "generation-ix": 9,
    };
    return romanMap[slug] || 0;
  }

  // Process species in batches
  const pokemon: PokemonEntry[] = [];
  const BATCH_SIZE = 20;

  // Regional form suffixes: map variety name suffix → generation introduced
  const REGIONAL_SUFFIXES: Record<string, number> = {
    "-alola": 7,
    "-galar": 8,
    "-hisui": 8,
    "-paldea": 9,
  };

  type SpeciesTyped = {
    id: number;
    name: string;
    generation: { url: string };
    egg_groups: { name: string }[];
    is_legendary: boolean;
    is_mythical: boolean;
    is_baby: boolean;
    evolution_chain: { url: string } | null;
    varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
  };

  for (let i = 0; i < allSpeciesUrls.length; i += BATCH_SIZE) {
    const batch = allSpeciesUrls.slice(i, i + BATCH_SIZE);

    const speciesResults = await Promise.all(
      batch.map((s) => fetchJson(s.url).catch(() => null))
    );

    // For each species, fetch the default variety AND all regional-form varieties
    const varietyFetches: Promise<unknown>[] = [];
    const varietyMeta: { speciesIndex: number; varietyName: string; isDefault: boolean }[] = [];

    for (let j = 0; j < speciesResults.length; j++) {
      const species = speciesResults[j] as SpeciesTyped | null;
      if (!species) continue;

      for (const v of species.varieties) {
        const isRegional = Object.keys(REGIONAL_SUFFIXES).some(sfx =>
          v.pokemon.name.endsWith(sfx)
        );
        if (v.is_default || isRegional) {
          varietyFetches.push(fetchJson(v.pokemon.url).catch(() => null));
          varietyMeta.push({ speciesIndex: j, varietyName: v.pokemon.name, isDefault: v.is_default });
        }
      }
    }

    const varietyResults = await Promise.all(varietyFetches);

    for (let k = 0; k < varietyResults.length; k++) {
      const meta = varietyMeta[k];
      const species = speciesResults[meta.speciesIndex] as SpeciesTyped | null;
      const pokemonData = varietyResults[k] as {
        types: { type: { name: string } }[];
        moves: { move: { name: string } }[];
        abilities: { ability: { name: string } }[];
        weight: number;
        height: number;
      } | null;

      if (!species || !pokemonData) continue;

      const dexNumber = species.id;

      // Determine generation: species generation for default, regional suffix map for forms
      let gen: number;
      if (meta.isDefault) {
        gen = genNumber(species.generation.url);
      } else {
        const sfx = Object.keys(REGIONAL_SUFFIXES).find(s => meta.varietyName.endsWith(s));
        gen = sfx ? REGIONAL_SUFFIXES[sfx] : genNumber(species.generation.url);
      }

      // Format the name nicely (capitalize each hyphen-separated segment)
      const name = meta.varietyName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-");

      const types = pokemonData.types.map((t) => t.type.name);
      const eggGroups = species.egg_groups.map((e) => e.name.replace(/ /g, ""));
      const moves = pokemonData.moves.map((m) => m.move.name);
      const abilities = pokemonData.abilities.map((a) => a.ability.name);

      // Evolution methods (keyed by species/dex number)
      const methods = evoMethods.get(dexNumber);
      let evolutionMethod: string[] = [];
      if (methods && methods.size > 0) {
        evolutionMethod = Array.from(methods);
      } else {
        evolutionMethod = ["none"];
      }

      // Add mega
      if (HAS_MEGA.has(dexNumber)) {
        evolutionMethod.push("has-mega");
      }

      // Status
      const status: string[] = [];
      if (species.is_legendary) status.push("legendary");
      if (species.is_mythical) status.push("mythical");
      if (species.is_baby) status.push("baby");
      if (STARTERS.has(dexNumber)) status.push("starter");
      if (FOSSILS.has(dexNumber)) status.push("fossil");
      if (PSEUDO_LEGENDARIES.has(dexNumber)) status.push("pseudo");
      if (ULTRA_BEASTS.has(dexNumber)) status.push("ultra-beast");
      if (PARADOX_POKEMON.has(dexNumber)) status.push("paradox");

      pokemon.push({
        name,
        dexNumber,
        types,
        generation: gen,
        eggGroups,
        evolutionMethod,
        status,
        moves,
        abilities,
        weight: pokemonData.weight,
        height: pokemonData.height,
      });
    }

    process.stdout.write(
      `\r  Species: ${Math.min(i + BATCH_SIZE, allSpeciesUrls.length)}/${allSpeciesUrls.length}`
    );
    if (i + BATCH_SIZE < allSpeciesUrls.length) {
      await delay(300);
    }
  }

  // Sort by dex number
  pokemon.sort((a, b) => a.dexNumber - b.dexNumber);

  console.log(`\n\nTotal Pokémon fetched: ${pokemon.length}`);

  // Stats
  const gens = new Map<number, number>();
  for (const p of pokemon) {
    gens.set(p.generation, (gens.get(p.generation) || 0) + 1);
  }
  for (const [gen, count] of Array.from(gens.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  Gen ${gen}: ${count}`);
  }

  const newData = JSON.stringify(pokemon, null, 2);

  // Compare with existing file to avoid unnecessary changes
  if (existsSync(OUTPUT_PATH)) {
    const existing = readFileSync(OUTPUT_PATH, "utf-8");
    if (existing === newData) {
      console.log(`\nNo changes — ${OUTPUT_PATH} is already up to date.`);
      return;
    }
  }

  writeFileSync(OUTPUT_PATH, newData);
  console.log(`\nSaved to ${OUTPUT_PATH}`);
  console.log("Commit this file to the repo so it's available at build time.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
