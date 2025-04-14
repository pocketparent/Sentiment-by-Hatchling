import React, { useEffect, useState } from 'react';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';

interface JournalViewProps {
  onSelectEntry: (entry: JournalEntry | null) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ onSelectEntry }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await fetchEntries();
        setEntries(data);
        setFilteredEntries(data);
      } catch (error) {
        console.error('Failed to fetch entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredEntries(entries);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredEntries(
        entries.filter((entry) =>
          entry.content?.toLowerCase().includes(lowerSearch) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
        )
      );
    }
  }, [search, entries]);

  return (
    <div className="relative px-4 py-6 max-w-2xl mx-auto pb-32">
      <h2 className="text-2xl font-semibold mb-4 text-center">Your Saved Memories</h2>

      <input
        type="text"
        className="mb-6 w-full rounded-xl border px-4 py-2 text-sm"
        placeholder="Search memories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-center text-muted">Loading your journal...</p>
      ) : filteredEntries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.entry_id}
              entry={entry}
              onClick={() => onSelectEntry(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalView;
