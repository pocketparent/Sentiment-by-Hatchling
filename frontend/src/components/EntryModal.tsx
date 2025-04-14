import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { createEntry, updateEntry, deleteEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [date, setDate] = useState(entry?.date_of_memory || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('content', content);
    formData.append('tags', tags);
    formData.append('privacy', privacy);
    formData.append('date_of_memory', date);
    formData.append('author_id', 'parent-1');
    if (file) formData.append('media', file);

    try {
      if (entry) {
        await updateEntry(entry.entry_id, formData);
      } else {
        await createEntry(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (entry) {
      await deleteEntry(entry.entry_id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl relative">
        <h3 className="text-lg font-semibold mb-4">{entry ? 'Edit Memory' : 'New Memory'}</h3>

        <textarea
          className="w-full rounded-md border border-neutral-300 p-2 text-sm mb-4"
          rows={4}
          placeholder="Write your memory..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <input
          type="text"
          className="w-full rounded-md border border-neutral-300 p-2 text-sm mb-4"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <input
          type="date"
          className="w-full rounded-md border border-neutral-300 p-2 text-sm mb-4"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          className="w-full rounded-md border border-neutral-300 p-2 text-sm mb-4"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
        </select>

        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4 text-sm"
        />

        <div className="flex justify-between items-center mt-4">
          {entry && (
            <button
              className="text-sm text-red-500 hover:text-red-700"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              className="text-sm px-4 py-2 rounded-lg border border-neutral-300"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800"
              onClick={handleSubmit}
              disabled={loading}
            >
              {entry ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
