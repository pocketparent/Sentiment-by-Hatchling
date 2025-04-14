import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { createEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [dateOfMemory, setDateOfMemory] = useState(entry?.date_of_memory || '');
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [media, setMedia] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('tags', tags);
    formData.append('date_of_memory', dateOfMemory);
    formData.append('privacy', privacy);
    formData.append('author_id', 'demo'); // Replace this with real user

    if (media) formData.append('media', media);

    try {
      await createEntry(formData);
      onClose();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-4">{entry ? 'Edit Memory' : 'New Memory'}</h2>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="space-y-4">
          <textarea
            placeholder="Write your memory here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            rows={4}
          />

          <input
            type="text"
            placeholder="e.g. milestones, vacation"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm"
          />

          <input
            type="date"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm"
          />

          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>

          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setMedia(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-neutral-200 file:text-neutral-800 hover:file:bg-neutral-300"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800 transition"
        >
          {entry ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </div>
  );
};

export default EntryModal;
