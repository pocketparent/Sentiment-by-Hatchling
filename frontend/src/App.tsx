import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  return (
    <div className="app-container relative min-h-screen bg-gray-50">
      <JournalView onSelectEntry={setSelectedEntry} />

      {/* Floating “+” Button */}
      <button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-black text-white text-2xl shadow-lg hover:bg-gray-800"
        onClick={() => setSelectedEntry(null)} // null = new entry
        aria-label="New Entry"
      >
        +
      </button>

      {/* Modal */}
      {selectedEntry !== undefined && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(undefined)}
        />
      )}
    </div>
  );
}

export default App;
