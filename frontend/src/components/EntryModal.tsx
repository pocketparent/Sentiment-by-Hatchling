import React, { useState } from 'react';
import { createEntry } from '../api/entries';
import { JournalEntry } from '../types';

interface EntryModalProps {
  entry?: JournalEntry | null; // for future editing support
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ onClose }) => {
  const [content, setContent] = useState('');
  const [authorId, setAuthorId] = useState('demo-user'); // Replace with real user ID
  const [dateOfMemory, setDateOfMemory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState('private');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('author_id', authorId);
      formData.append('date_of_memory', dateOfMemory);
      formData.append('privacy', privacy);
      tags.forEach((tag) => formData.append('tags', tag));
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      await createEntry(formData);
      onClose(); // Close modal after successful submission
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">New Memory</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            placeholder="What do you want to remember?"
            className="w-full p-3 border rounded-xl"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <input
            type="date"
            className="w-full p-3 border rounded-xl"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
            required
          />
          <input
            type="text"
            className="w-full p-3 border rounded-xl"
            placeholder="Tags (comma separated)"
            onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()))}
          />
          <select
            className="w-full p-3 border rounded-xl"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
          />
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl"
            >
              {submitting ? 'Saving...' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
