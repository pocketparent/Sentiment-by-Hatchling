import React from 'react';
import { JournalEntry } from '../types';

type Props = {
  entry: JournalEntry;
  onClick: () => void;
};

const EntryCard: React.FC<Props> = ({ entry, onClick }) => {
  return (
    <div
      className="rounded-2xl shadow-md p-4 bg-white hover:bg-gray-50 transition cursor-pointer border"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">{entry.date_of_memory}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {entry.privacy}
        </span>
      </div>
      <p className="text-gray-800">{entry.content}</p>
      {entry.media_url && (
        <div className="mt-2">
          <img
            src={entry.media_url}
            alt="Memory"
            className="max-h-48 w-full object-cover rounded-lg"
          />
        </div>
      )}
      {entry.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {entry.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntryCard;
