import { JournalEntry } from '../types';

export async function fetchEntries(): Promise<JournalEntry[]> {
  const response = await fetch('/api/entries');
  if (!response.ok) {
    throw new Error('Failed to fetch journal entries');
  }
  const data = await response.json();
  return data.entries;
}
