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
  const [dateOfMemory, setDateOfMemory] = useState(entry?.date_of_memory || new Date().toISOString().split('T')[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('content', content);
    formData.append('tags', tags);
    formData.append('privacy', privacy);
    formData.append('date_of_memory', dateOfMemory);
    formData.append('author_id', 'placeholder-user'); // Replace later
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    try {
      if (entry?.entry_id) {
        await updateEntry(entry.entry_id, formData);
      } else {
        await createEntry(formData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving entry:', err);
    }
  };

  const handleDelete = async () => {
    if (entry?.entry_id && confirm('Delete this entry?')) {
      try {
        await deleteEntry(entry.entry_id);
        onClose();
      } catch (err) {
        console.error('Error deleting entry:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <h2 className="text-xl font-semibold mb-4">{entry ? 'Edit Memory' : 'New Memory'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="date"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
            className="w-full rounded border p-2"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to remember?"
            className="w-full rounded border p-2 h-28 resize-none"
          />

          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full rounded border p-2"
          />

          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
            className="w-full rounded border p-2"
          />

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {entry?.entry_id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="rounded px-4 py-2 bg-black text-white hover:bg-gray-800"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
