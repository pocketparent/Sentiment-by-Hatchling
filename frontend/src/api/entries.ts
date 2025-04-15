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

// ✅ Accepts FormData directly
export async function createEntry(formData: FormData) {
  // Debug: log all form fields
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

export async function updateEntry(id: string, formData: FormData) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Update error response:', errorText);
    throw new Error('Failed to update entry');
  }

  return await response.json();
}

export async function deleteEntry(id: string) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete entry');
  return await response.json();
}
