import type { 
  DeckListEntry, 
  InventoryItem, 
  Card, 
  MatchResult, 
  Collection 
} from './types.js';

/**
 * Compute matches between deck list entries and inventory
 * Allocates cards by collection priority
 */
export function computeMatches(
  entries: DeckListEntry[],
  inventory: InventoryItem[],
  cards: Card[],
  collections: Collection[]
): MatchResult[] {
  // Create lookup maps for efficiency
  const cardMap = new Map(cards.map(card => [card.scryfall_id, card]));
  const collectionMap = new Map(collections.map(col => [col.id, col]));
  
  // Sort collections by priority for allocation order
  const sortedCollections = [...collections].sort((a, b) => a.priority - b.priority);

  const results: MatchResult[] = [];

  for (const entry of entries) {
    const result = matchEntry(
      entry, 
      inventory, 
      cardMap, 
      collectionMap, 
      sortedCollections
    );
    results.push(result);
  }

  return results;
}

function matchEntry(
  entry: DeckListEntry,
  inventory: InventoryItem[],
  cardMap: Map<string, Card>,
  collectionMap: Map<string, Collection>,
  sortedCollections: Collection[]
): MatchResult {
  // Find cards that match this entry
  let candidates: InventoryItem[];

  if (entry.scryfall_id) {
    // Exact match by scryfall_id
    candidates = inventory.filter(item => 
      item.scryfall_id === entry.scryfall_id
    );
  } else {
    // Match by name, optionally filtering by set
    candidates = inventory.filter(item => {
      const card = cardMap.get(item.scryfall_id);
      if (!card || card.name !== entry.name) return false;
      if (entry.set && item.set !== entry.set) return false;
      return true;
    });
  }

  // Allocate cards by collection priority
  const owned: InventoryItem[] = [];
  let needed = entry.qty;

  for (const collection of sortedCollections) {
    if (needed <= 0) break;

    const collectionItems = candidates.filter(item => 
      item.collection_id === collection.id
    );

    for (const item of collectionItems) {
      if (needed <= 0) break;

      const available = Math.min(item.copies, needed);
      if (available > 0) {
        owned.push({
          ...item,
          copies: available
        });
        needed -= available;
      }
    }
  }

  const missing = Math.max(0, needed);

  // Find "bling" - alternate printings with same oracle_id
  const bling = findBlingOptions(entry, Array.from(cardMap.values()), cardMap);

  return {
    entry,
    owned,
    missing,
    bling
  };
}

function findBlingOptions(
  entry: DeckListEntry,
  cards: Card[],
  cardMap: Map<string, Card>
): Card[] {
  // Get the oracle_id for this card
  let oracle_id: string | undefined;

  if (entry.scryfall_id) {
    oracle_id = cardMap.get(entry.scryfall_id)?.oracle_id;
  } else {
    // Find any card with this name to get oracle_id
    const match = cards.find(card => card.name === entry.name);
    oracle_id = match?.oracle_id;
  }

  if (!oracle_id) return [];

  // Find all cards with same oracle_id (alternate printings)
  return cards.filter(card => 
    card.oracle_id === oracle_id && 
    card.scryfall_id !== entry.scryfall_id
  );
}