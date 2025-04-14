import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { createEntry, updateEntry, deleteEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const isEditing = Boolean(entry);
  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [dateOfMemory, setDateOfMemory] = useState(entry?.date_of_memory || '');
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [media, setMedia] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('date_of_memory', dateOfMemory);
    formData.append('tags', tags);
    formData.append('privacy', privacy);
    formData.append('author_id', 'parent-123'); // temporary hardcoded

    if (media) formData.append('media', media);
    if (isEditing && entry) {
      await updateEntry(entry.entry_id, formData);
    } else {
      await createEntry(formData);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (entry) {
      await deleteEntry(entry.entry_id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-neutral-500 hover:text-black"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Memory' : 'New Memory'}
        </h2>

        <div className="space-y-4">
          <textarea
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            placeholder="What do you want to remember?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />

          <input
            type="text"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          <input
            type="date"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
          />

          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>

          <label className="block">
            <span className="text-sm text-neutral-700">Attach media</span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMedia(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-amber-100 file:text-amber-900
                         hover:file:bg-amber-200"
            />
          </label>
        </div>

        <div className="flex justify-between mt-6">
          {isEditing && (
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:underline"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ml-auto bg-black text-white text-sm px-4 py-2 rounded-xl hover:bg-neutral-800"
          >
            {isEditing ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
