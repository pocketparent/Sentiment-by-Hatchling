import React from 'react';
import { JournalEntry } from '../types';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';

interface JournalViewProps {
  entries: JournalEntry[];
  loading: boolean;
  onSelectEntry: (entry: JournalEntry) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ entries, loading, onSelectEntry }) => {
  if (loading) return <p className="text-center text-muted">Loading your journal...</p>;

  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4 px-4 py-6">
      {entries.map((entry) => (
        <div key={entry.entry_id} onClick={() => onSelectEntry(entry)}>
          <EntryCard entry={entry} />
        </div>
      ))}
    </div>
  );
};

export default JournalView;
