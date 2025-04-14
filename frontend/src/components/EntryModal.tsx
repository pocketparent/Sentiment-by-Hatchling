import React, { useState } from 'react';
import { JournalEntry } from '../types';

interface EntryModalProps {
  onClose: () => void;
  onSuccess: () => void;
  entry?: JournalEntry | null;
}

const EntryModal: React.FC<EntryModalProps> = ({ onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [dateOfMemory, setDateOfMemory] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [media, setMedia] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('author_id', authorId);
    formData.append('date_of_memory', dateOfMemory);
    formData.append('privacy', privacy);
    if (tags) {
      tags.split(',').forEach(tag => formData.append('tags', tag.trim()));
    }
    if (media) {
      formData.append('media', media);
    }

    try {
      const response = await fetch('/entry', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      onSuccess(); // 🔄 Trigger a reload in parent
      onClose();
    } catch (err) {
      console.error(err);
      alert('Something went wrong while saving your entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-xl font-semibold">New Memory</h2>

        <input
          type="text"
          placeholder="Author ID"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          className="w-full border rounded p-2"
          required
        />

        <input
          type="date"
          value={dateOfMemory}
          onChange={(e) => setDateOfMemory(e.target.value)}
          className="w-full border rounded p-2"
          required
        />

        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
          required
        />

        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border rounded p-2"
        />

        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
        </select>

        <input
          type="file"
          onChange={(e) => setMedia(e.target.files?.[0] || null)}
          className="w-full"
          accept="image/*,audio/*,video/*"
        />

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryModal;
