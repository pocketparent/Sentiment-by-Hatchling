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
  formData.append('author_id', entry.author_id || 'demo'); // ✅ fallback
  formData.append('date_of_memory', entry.date_of_memory || '');
  formData.append('privacy', entry.privacy || 'private');

  // ✅ Always submit a "tags" field — even if empty
  if (entry.tags && entry.tags.length > 0) {
    entry.tags.forEach(tag => formData.append('tags', tag));
  } else {
    formData.append('tags', ''); // triggers AI tagging
  }

  if (entry.media) {
    formData.append('media', entry.media);
  }

  // 🔍 Debug
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
  formData.append('author_id', entry.author_id || 'demo');
  formData.append('date_of_memory', entry.date_of_memory || '');
  formData.append('privacy', entry.privacy || 'private');

  if (entry.tags && entry.tags.length > 0) {
    entry.tags.forEach(tag => formData.append('tags', tag));
  } else {
    formData.append('tags', '');
  }

  if (entry.media) {
    formData.append('media', entry.media);
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
