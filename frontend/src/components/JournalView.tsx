import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Settings } from 'lucide-react';
import EntryModal from './EntryModal';

interface Props {
  onSelectEntry: (entry: JournalEntry | null) => void;
}

const JournalView: React.FC<Props> = ({ onSelectEntry }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
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
    <div className="relative px-4 py-6 max-w-2xl mx-auto pb-24">
      {showModal && (
        <EntryModal
          entry={null}
          onClose={() => setShowModal(false)}
          onEntrySaved={loadEntries}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-center flex-1">Your Saved Memories</h2>
        <button
          className="text-neutral-700 hover:text-black transition"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
        >
          <Settings size={20} />
        </button>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="mb-4 w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800 transition"
      >
        + New Memory
      </button>

      <input
        type="text"
        className="mb-6 w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm placeholder-neutral-400"
        placeholder="Search memories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-center text-neutral-500">Loading your journal...</p>
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
