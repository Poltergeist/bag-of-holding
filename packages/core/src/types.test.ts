import { describe, it, expect } from 'vitest';
import type { 
  CollectionId,
  Card,
  Collection,
  InventoryItem,
  InventoryAggregate,
  DeckListEntry,
  MatchResult,
  HelvaultExport
} from './types.js';

describe('types', () => {
  it('should export CollectionId type', () => {
    // Type-only test - verify CollectionId can be used
    const collectionId: CollectionId = 'test-collection';
    expect(typeof collectionId).toBe('string');
  });

  it('should export Card type', () => {
    // Type-only test - verify Card interface structure
    const card: Card = {
      scryfall_id: 'test',
      oracle_id: 'oracle-test',
      name: 'Test Card',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      rarity: 'common',
      cmc: 1,
      colors: ['R'],
      type_line: 'Instant'
    };
    expect(card.name).toBe('Test Card');
  });

  it('should export Collection type', () => {
    // Type-only test - verify Collection interface structure
    const collection: Collection = {
      id: 'test-collection',
      name: 'Test Collection',
      description: 'Test description',
      priority: 1
    };
    expect(collection.name).toBe('Test Collection');
  });

  it('should export InventoryItem type (per physical copy)', () => {
    // Type-only test - verify InventoryItem interface structure
    const inventoryItem: InventoryItem = {
      scryfall_id: 'test',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      collection_id: 'test-collection',
      copies: 4
    };
    expect(inventoryItem.copies).toBe(4);
  });

  it('should export InventoryAggregate type (grouped printing+collection)', () => {
    // Type-only test - verify InventoryAggregate interface structure
    const aggregate: InventoryAggregate = {
      scryfall_id: 'test',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      collection: 'test-collection',
      copies: 4
    };
    expect(aggregate.collection).toBe('test-collection');
  });

  it('should export DeckListEntry type', () => {
    // Type-only test - verify DeckListEntry interface structure
    const entry: DeckListEntry = {
      name: 'Lightning Bolt',
      qty: 4,
      set: 'LEA',
      collector_number: '161',
      scryfall_id: 'test'
    };
    expect(entry.qty).toBe(4);
  });

  it('should export MatchResult type', () => {
    // Type-only test - verify MatchResult interface structure
    const mockEntry: DeckListEntry = { name: 'Test', qty: 1 };
    const mockInventoryItem: InventoryItem = {
      scryfall_id: 'test',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      collection_id: 'test-collection',
      copies: 1
    };
    const mockCard: Card = {
      scryfall_id: 'bling',
      oracle_id: 'oracle-test',
      name: 'Test Card',
      set: 'TST2',
      collector_number: '1',
      lang: 'en',
      finishes: ['foil'],
      rarity: 'rare',
      cmc: 1,
      colors: ['R'],
      type_line: 'Instant'
    };

    const result: MatchResult = {
      entry: mockEntry,
      owned: [mockInventoryItem],
      missing: 0,
      bling: [mockCard]
    };
    expect(result.missing).toBe(0);
  });

  it('should export HelvaultExport type', () => {
    // Type-only test - verify HelvaultExport interface structure
    const mockCollection: Collection = {
      id: 'test',
      name: 'Test',
      priority: 1
    };
    const mockCard: Card = {
      scryfall_id: 'test',
      oracle_id: 'oracle-test',
      name: 'Test Card',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      rarity: 'common',
      cmc: 1,
      colors: ['R'],
      type_line: 'Instant'
    };
    const mockInventoryItem: InventoryItem = {
      scryfall_id: 'test',
      set: 'TST',
      collector_number: '1',
      lang: 'en',
      finishes: ['nonfoil'],
      collection_id: 'test',
      copies: 1
    };

    const helvaultExport: HelvaultExport = {
      collections: [mockCollection],
      cards: [mockCard],
      inventory: [mockInventoryItem]
    };
    expect(helvaultExport.collections.length).toBe(1);
  });
});