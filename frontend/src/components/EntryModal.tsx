import React from 'react';
import { JournalEntry } from '../types';

type EntryModalProps = {
  entry: JournalEntry;
  onClose: () => void;
};

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-2">Memory Entry</h2>
        <p className="text-sm text-gray-600 mb-4">
          {new Date(entry.date_of_memory).toLocaleDateString()}
        </p>
        <p className="mb-4">{entry.content}</p>
        {entry.media_url && (
          <div className="mt-4">
            <img
              src={entry.media_url}
              alt="Uploaded"
              className="rounded-lg max-h-64 object-contain"
            />
          </div>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-200 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntryModal;
