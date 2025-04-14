import React, { useEffect, useState } from 'react';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import EntryModal from './EntryModal';

const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const openNewEntry = () => {
    setSelectedEntry(null);
    setShowModal(true);
  };

  if (loading) return <p className="text-center text-muted">Loading your journal...</p>;

  return (
    <div className="relative space-y-4 px-4 py-6">
      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        entries.map((entry) => (
          <EntryCard
            key={entry.entry_id}
            entry={entry}
            onClick={() => {
              setSelectedEntry(entry);
              setShowModal(true);
            }}
          />
        ))
      )}

      {/* Floating "New Entry" button */}
      <button
        onClick={openNewEntry}
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700"
      >
        + New Memory
      </button>

      {/* Entry Modal */}
      {showModal && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default JournalView;
