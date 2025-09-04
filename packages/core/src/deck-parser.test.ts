import { describe, it, expect } from 'vitest';
import { parseDeckList, formatDeckListEntry } from './deck-parser.js';

describe('deck-parser', () => {
  describe('parseDeckList', () => {
    it('parses basic deck list format', () => {
      const input = `4 Lightning Bolt
1 Sol Ring
2x Counterspell`;
      
      const result = parseDeckList(input);
      
      expect(result).toEqual([
        { name: 'Lightning Bolt', qty: 4 },
        { name: 'Sol Ring', qty: 1 },
        { name: 'Counterspell', qty: 2 }
      ]);
    });

    it('parses deck list with set codes', () => {
      const input = `4 Lightning Bolt (LEA)
1 Sol Ring (M11)`;
      
      const result = parseDeckList(input);
      
      expect(result).toEqual([
        { name: 'Lightning Bolt', qty: 4, set: 'LEA' },
        { name: 'Sol Ring', qty: 1, set: 'M11' }
      ]);
    });

    it('ignores comments and empty lines', () => {
      const input = `// Main deck
4 Lightning Bolt

# Sideboard
1 Sol Ring`;
      
      const result = parseDeckList(input);
      
      expect(result).toEqual([
        { name: 'Lightning Bolt', qty: 4 },
        { name: 'Sol Ring', qty: 1 }
      ]);
    });

    it('handles invalid lines gracefully', () => {
      const input = `4 Lightning Bolt
invalid line
0 Zero Quantity
-1 Negative Quantity`;
      
      const result = parseDeckList(input);
      
      expect(result).toEqual([
        { name: 'Lightning Bolt', qty: 4 }
      ]);
    });
  });

  describe('formatDeckListEntry', () => {
    it('formats entry without set', () => {
      const entry = { name: 'Lightning Bolt', qty: 4 };
      expect(formatDeckListEntry(entry)).toBe('4 Lightning Bolt');
    });

    it('formats entry with set', () => {
      const entry = { name: 'Lightning Bolt', qty: 4, set: 'LEA' };
      expect(formatDeckListEntry(entry)).toBe('4 Lightning Bolt (LEA)');
    });
  });
});