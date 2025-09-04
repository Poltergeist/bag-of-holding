/**
 * Core types for the Bag of Holding application
 */

// Collection identifier
export type CollectionId = string;

// Card representation
export interface Card {
  scryfall_id: string;
  oracle_id: string;
  name: string;
  set: string;
  collector_number: string;
  lang: string;
  finishes: string[];
  rarity: string;
  mana_cost?: string;
  cmc: number;
  colors: string[];
  type_line: string;
}

// Collection/inventory management
export interface Collection {
  id: string;
  name: string;
  description?: string;
  priority: number; // for allocation order
}

export interface InventoryItem {
  scryfall_id: string;
  set: string;
  collector_number: string;
  lang: string;
  finishes: string[];
  collection_id: string;
  copies: number;
}

export interface InventoryAggregate {
  scryfall_id: string;
  set: string;
  collector_number: string;
  lang: string;
  finishes: string[];
  collection: string;
  copies: number;
}

// Deck list representation
export interface DeckListEntry {
  name: string;
  qty: number;
  set?: string;
  collector_number?: string;
  scryfall_id?: string;
}

// Match result for deck vs inventory
export interface MatchResult {
  entry: DeckListEntry;
  owned: InventoryItem[];
  missing: number;
  bling: Card[]; // alternate printings with same oracle_id
}

// Helvault export structure
export interface HelvaultExport {
  collections: Collection[];
  cards: Card[];
  inventory: InventoryItem[];
}