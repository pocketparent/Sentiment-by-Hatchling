import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { createEntry, updateEntry, deleteEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const isNew = !entry?.entry_id;

  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [date, setDate] = useState(entry?.date_of_memory || new Date().toISOString().slice(0, 10));
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      content,
      tags: tagList,
      date_of_memory: date,
      author_id: 'demo-parent', // Replace with real user later
      privacy,
    };

    try {
      if (isNew) {
        await createEntry(payload);
      } else {
        await updateEntry(entry!.entry_id, payload);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (entry?.entry_id && confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteEntry(entry.entry_id);
        onClose();
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  };

  if (!entry && !isNew) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{isNew ? 'New Memory' : 'Edit Memory'}</h2>

        <input
          type="date"
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <textarea
          className="mb-3 h-32 w-full resize-none rounded border px-3 py-2 text-sm"
          placeholder="What do you want to remember?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <input
          type="text"
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <select
          className="mb-4 w-full rounded border px-3 py-2 text-sm"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
        </select>

        <div className="flex justify-between gap-4">
          {!isNew && (
            <button
              className="rounded-xl border border-red-500 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}

          <div className="ml-auto flex gap-2">
            <button
              className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
