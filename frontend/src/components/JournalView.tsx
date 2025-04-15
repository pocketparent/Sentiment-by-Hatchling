import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Settings, Trash } from 'lucide-react';
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this memory?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/entry/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.entry_id !== id));
      } else {
        alert("Delete failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting memory.");
    }
  };

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
            <div
              key={entry.entry_id}
              className="relative bg-white rounded-lg p-4 shadow-md flex items-start"
            >
              <div className="flex-grow" onClick={() => onSelectEntry(entry)}>
                <EntryCard entry={entry} onClick={() => onSelectEntry(entry)} />
              </div>
              <button
                onClick={() => handleDelete(entry.entry_id)}
                className="text-red-400 hover:text-red-600 ml-2 mt-1"
                title="Delete Memory"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Centered circular "+" button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-300 hover:bg-neutral-400 text-white rounded-full w-14 h-14 shadow-md flex items-center justify-center text-2xl"
        title="New Memory"
      >
        +
      </button>
    </div>
  );
};

export default JournalView;
