export type CategoryType =
  | "type"
  | "generation"
  | "egg_group"
  | "evolution"
  | "status";

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
}
