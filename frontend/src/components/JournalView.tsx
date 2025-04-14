import React, { useEffect, useState } from 'react';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';

const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await fetchEntries();
        setEntries(data);
      } catch (error) {
        console.error('Failed to fetch entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  if (loading) return <p className="text-center text-muted">Loading your journal...</p>;

  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4 px-4 py-6">
      {entries.map((entry) => (
        <EntryCard key={entry.entry_id} entry={entry} />
      ))}
    </div>
  );
};

export default JournalView;
