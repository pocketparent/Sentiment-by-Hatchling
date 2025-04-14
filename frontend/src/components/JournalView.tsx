import React, { useEffect, useState } from 'react';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import EntryModal from './EntryModal';

const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
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
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-6">
      <h2 className="text-2xl font-semibold mb-4 text-center">Your Saved Memories</h2>

      <input
        type="text"
        className="mb-6 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
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
            <EntryCard key={entry.entry_id} entry={entry} onClick={() => setSelectedEntry(entry)} />
          ))}
        </div>
      )}

      <button
        className="fixed bottom-6 right-6 rounded-full bg-black px-6 py-3 text-white shadow-lg hover:bg-gray-800"
        onClick={() => setSelectedEntry(null)}
      >
        + New Entry
      </button>

      <EntryModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
};

export default JournalView;
