import { JournalEntry } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/entry`
  : '/api/entry';

export async function fetchEntries(): Promise<JournalEntry[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch journal entries');
  const data = await response.json();
  return data.entries;
}

export async function createEntry(entry: Partial<JournalEntry>) {
  const formData = new FormData();
  formData.append('content', entry.content || '');
  formData.append('author_id', entry.author_id || 'demo'); // ✅ TEMP fallback
  formData.append('date_of_memory', entry.date_of_memory || '');
  formData.append('privacy', entry.privacy || 'private');

  if (entry.tags) {
    entry.tags.forEach(tag => formData.append('tags', tag));
  }

  // ✅ Debug: show exactly what's being submitted
  console.log('📤 Submitting FormData:');
  for (const [key, value] of formData.entries()) {
    console.log(`📦 ${key}:`, value);
  }

  const response = await fetch(API_BASE, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Server error response:', errorText);
    throw new Error('Failed to create entry');
  }

  return await response.json();
}

export async function updateEntry(id: string, entry: Partial<JournalEntry>) {
  const formData = new FormData();
  formData.append('content', entry.content || '');
  formData.append('author_id', entry.author_id || 'demo'); // 👈 also fallback here
  formData.append('date_of_memory', entry.date_of_memory || '');
  formData.append('privacy', entry.privacy || 'private');

  if (entry.tags) {
    entry.tags.forEach(tag => formData.append('tags', tag));
  }

  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to update entry');
  return await response.json();
}

export async function deleteEntry(id: string) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete entry');
  return await response.json();
}
interface EntryModalProps {
  onClose: () => void;
  onEntrySaved: () => void;  // 👈 Add this
}
