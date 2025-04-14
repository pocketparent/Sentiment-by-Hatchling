import React from 'react';
import { JournalEntry } from '../types';

interface Props {
  entry: JournalEntry;
}

const EntryCard: React.FC<Props> = ({ entry }) => {
  return (
    <div className="border rounded-xl p-4 shadow-sm bg-white">
      <div className="flex items-center mb-2 text-sm text-gray-600">
        <span className="font-semibold">{entry.author.name}</span>
        <span className="mx-2">·</span>
        <span>{new Date(entry.date_of_memory).toLocaleDateString()}</span>
        {entry.privacy !== 'private' && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-gray-100 rounded-full">
            {entry.privacy}
          </span>
        )}
      </div>

      {entry.media_url && (
        <div className="mb-2">
          {/* Basic media preview */}
          <img src={entry.media_url} alt="Memory" className="rounded-md max-h-60 object-cover" />
        </div>
      )}

      <p className="text-base">{entry.content || entry.transcription}</p>

      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-blue-600">
          {entry.tags.map((tag) => (
            <span key={tag} className="bg-blue-100 px-2 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntryCard;
