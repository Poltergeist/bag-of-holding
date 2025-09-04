import type { DeckListEntry } from './types.js';

/**
 * Parse a deck list from text format
 * Supports common formats like:
 * - "4 Lightning Bolt"
 * - "1x Sol Ring"
 * - "2 Lightning Bolt (M11)"
 */
export function parseDeckList(text: string): DeckListEntry[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'));

  const entries: DeckListEntry[] = [];

  for (const line of lines) {
    // Match patterns like "4 Lightning Bolt" or "1x Sol Ring (M11)"
    const match = line.match(/^(\d+)x?\s+(.+?)(?:\s*\(([^)]+)\))?$/i);
    
    if (match) {
      const [, qtyStr, name, set] = match;
      const qty = parseInt(qtyStr, 10);
      
      if (qty > 0) {
        entries.push({
          name: name.trim(),
          qty,
          set: set?.trim(),
        });
      }
    }
  }

  return entries;
}

/**
 * Format a deck list entry back to text
 */
export function formatDeckListEntry(entry: DeckListEntry): string {
  let result = `${entry.qty} ${entry.name}`;
  if (entry.set) {
    result += ` (${entry.set})`;
  }
  return result;
}

/**
 * Format an entire deck list to text
 */
export function formatDeckList(entries: DeckListEntry[]): string {
  return entries.map(formatDeckListEntry).join('\n');
}