import { JournalEntry } from '../types';

export async function fetchEntries(): Promise<JournalEntry[]> {
  const response = await fetch('/entries');
  if (!response.ok) {
    throw new Error('Failed to fetch journal entries');
  }
  const data = await response.json();
  return data;
}

export async function createEntry(formData: FormData): Promise<{ entry_id: string }> {
  const response = await fetch('/entry', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to create journal entry');
  }

  return await response.json();
}
