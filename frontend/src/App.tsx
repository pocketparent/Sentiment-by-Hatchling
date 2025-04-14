import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectEntry = (entry: JournalEntry | null) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  return (
    <div className="app-container relative min-h-screen bg-gray-50">
      <JournalView onSelectEntry={handleSelectEntry} />

      {/* Floating New Entry Button */}
      <button
        className="fixed bottom-6 right-6 z-50 rounded-full bg-black p-4 text-white text-2xl shadow-xl hover:bg-gray-800"
        onClick={() => handleSelectEntry(null)}
        aria-label="New Entry"
      >
        +
      </button>

      {/* Modal */}
      {isModalOpen && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
