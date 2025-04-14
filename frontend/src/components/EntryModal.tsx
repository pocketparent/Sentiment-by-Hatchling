import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isFutureDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr > today;
  };

  const handleSubmit = async () => {
    if (!content.trim() || !dateOfMemory.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isFutureDate(dateOfMemory)) {
      setError('The memory date cannot be in the future.');
      return;
    }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('tags', tags);
    formData.append('date_of_memory', dateOfMemory);
    formData.append('privacy', privacy);
    formData.append('author_id', 'demo'); // Replace with real user

    if (media) formData.append('media', media);

    try {
      await createEntry(formData);
      onClose();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#fefcf9] rounded-xl w-full max-w-md p-6 relative shadow-xl">
        <button
          className="absolute top-4 right-4 text-neutral-400 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-4">
          {entry ? 'Edit Memory' : 'New Memory'}
        </h2>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="space-y-4">
          <textarea
            placeholder="Write your memory here... *"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm bg-white placeholder-neutral-400"
            rows={4}
          />

          <input
            type="text"
            placeholder="e.g. milestones, vacation (optional)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm bg-white placeholder-neutral-400"
          />

          <input
            type="date"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // disallow future dates
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm bg-white"
          />

          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm bg-white"
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>

          <label className="block text-sm text-neutral-700">
            Upload photo or video:
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMedia(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
            />
          </label>
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
