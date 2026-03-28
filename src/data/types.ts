export type CategoryType =
  | "type"
  | "generation"
  | "egg_group"
  | "evolution"
  | "status"
  | "weakness"
  | "resistance"
  | "weight"
  | "height"
  | "move"
  | "ability";

export interface Category {
  id: string;
  label: string;
  type: CategoryType;
}

export interface Pokemon {
  name: string;
  dexNumber: number;
  types: string[];
  generation: number;
  eggGroups: string[];
  evolutionMethod: string[];
  status: string[];
  moves?: string[];       // move slugs e.g. "flamethrower", "hydro-pump"
  abilities?: string[];   // ability slugs e.g. "levitate", "intimidate"
  weight?: number;        // in hectograms (PokéAPI unit; 1 hg = 0.1 kg)
  height?: number;        // in decimeters (PokéAPI unit; 1 dm = 0.1 m)
}
