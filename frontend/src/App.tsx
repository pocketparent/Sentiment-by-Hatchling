import React, { useState, useEffect } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { JournalEntry } from './types';
import { fetchEntries } from './api/entries';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return (
    <div className="app-container">
      <JournalView
        entries={entries}
        loading={loading}
        onSelectEntry={setSelectedEntry}
      />
      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSuccess={loadEntries}
        />
      )}
    </div>
  );
}

export default App;
