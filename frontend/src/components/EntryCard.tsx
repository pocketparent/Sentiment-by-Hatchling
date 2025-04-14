import React from 'react';
import { JournalEntry } from '../types';

type Props = {
  entry: JournalEntry;
  onClick: () => void;
};

const EntryCard: React.FC<Props> = ({ entry, onClick }) => {
  return (
    <div
      className="rounded-2xl shadow-sm border border-gray-200 bg-white p-4 hover:shadow-md transition cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">{entry.date_of_memory}</span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md capitalize">
          {entry.privacy}
        </span>
      </div>

      <p className="text-gray-800 text-sm whitespace-pre-line">
        {entry.content || <span className="text-gray-400 italic">No content</span>}
      </p>

      {entry.media_url && (
        <div className="mt-3">
          <img
            src={entry.media_url}
            alt="Memory"
            className="w-full max-h-64 object-cover rounded-lg border border-gray-100"
          />
        </div>
      )}

      {entry.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
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
