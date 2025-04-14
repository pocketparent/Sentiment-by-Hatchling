import React, { useState, useEffect } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { fetchEntries } from './api/entries';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (err) {
      console.error('Failed to reload entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadEntries();
  }, []);

  return (
    <div className="app-container">
      <JournalView
        entries={entries}
        loading={loading}
        onSelectEntry={setSelectedEntry}
      />
      {selectedEntry !== null && (
        <EntryModal
          onClose={() => setSelectedEntry(null)}
          onSuccess={reloadEntries}
        />
      )}
    </div>
  );
}

export default App;
