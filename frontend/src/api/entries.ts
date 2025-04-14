import { JournalEntry } from '../types';

export async function fetchEntries(): Promise<JournalEntry[]> {
  const response = await fetch('/entries'); // adjust if using a different base path
  if (!response.ok) {
    throw new Error('Failed to fetch journal entries');
  }
  const data = await response.json();
  return data;
}
