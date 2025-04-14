import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { createEntry, updateEntry, deleteEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string>('');
  const [privacy, setPrivacy] = useState('private');
  const [dateOfMemory, setDateOfMemory] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (entry) {
      setContent(entry.content || '');
      setTags(entry.tags?.join(', ') || '');
      setPrivacy(entry.privacy || 'private');
      setDateOfMemory(entry.date_of_memory || '');
    } else {
      setContent('');
      setTags('');
      setPrivacy('private');
      setDateOfMemory('');
    }
    setFile(null);
  }, [entry]);

  const handleSave = async () => {
    const payload = {
      content,
      tags: tags.split(',').map(tag => tag.trim()),
      privacy,
      date_of_memory: dateOfMemory,
    };

    const formData = new FormData();
    formData.append('content', payload.content);
    formData.append('author_id', 'user-123'); // TODO: dynamic
    formData.append('privacy', payload.privacy);
    formData.append('date_of_memory', payload.date_of_memory);
    payload.tags.forEach(tag => formData.append('tags', tag));
    if (file) formData.append('media', file);

    try {
      entry
        ? await updateEntry(entry.entry_id, formData)
        : await createEntry(formData);
      onClose();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async () => {
    if (entry) {
      try {
        await deleteEntry(entry.entry_id);
        onClose();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">
          {entry ? 'Edit Memory' : 'New Memory'}
        </h3>

        <textarea
          className="w-full mb-4 rounded-md border border-neutral-300 p-3 text-sm"
          rows={4}
          placeholder="What do you want to remember?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="mb-4">
          <label className="block mb-1 text-sm text-neutral-600">Tags</label>
          <input
            type="text"
            className="w-full rounded-md border border-neutral-300 p-2 text-sm"
            placeholder="e.g. first words, trip, funny"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm text-neutral-600">Date of memory</label>
          <input
            type="date"
            className="w-full rounded-md border border-neutral-300 p-2 text-sm"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm text-neutral-600">Privacy</label>
          <select
            className="w-full rounded-md border border-neutral-300 p-2 text-sm"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block w-full cursor-pointer rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 text-center">
            {file ? file.name : 'Choose file'}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          {entry && (
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
